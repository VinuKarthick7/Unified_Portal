from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone

from .models import TopicHandling, HandlingVerification, AssignmentTracker, CourseResult
from .serializers import (
    TopicHandlingSerializer,
    TopicHandlingCreateSerializer,
    HandlingVerificationSerializer,
    HandlingVerificationDetailSerializer,
    AssignmentTrackerSerializer,
    CourseResultSerializer,
)
from accounts.permissions import IsAdminOrHOD


# ── Assignment Tracker ─────────────────────────────────────────────────────────

class AssignmentTrackerListCreateView(generics.ListCreateAPIView):
    """
    GET  — Faculty sees own trackers. HOD/Admin see all (filterable by course_assignment).
    POST — Faculty creates an assignment entry for their own course_assignment.
    """
    serializer_class = AssignmentTrackerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = AssignmentTracker.objects.select_related(
            'course_assignment__faculty', 'course_assignment__course'
        )
        if user.role == 'FACULTY':
            qs = qs.filter(course_assignment__faculty=user)
        elif user.role == 'HOD' and user.department_id:
            qs = qs.filter(course_assignment__course__departments=user.department)
        ca = self.request.query_params.get('course_assignment')
        if ca:
            qs = qs.filter(course_assignment_id=ca)
        return qs


class AssignmentTrackerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Faculty can edit/delete their own. Admin/HOD can patch completion_pct.
    """
    serializer_class = AssignmentTrackerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'FACULTY':
            return AssignmentTracker.objects.filter(course_assignment__faculty=user)
        return AssignmentTracker.objects.all()


class SyncAssignmentCompletionView(APIView):
    """
    PATCH /handling/assignments/<pk>/sync/
    Manually set completion_pct for an assignment tracker (faculty or admin).
    In a production setup this would be called by an APScheduler job that
    reads the Google Sheet and calculates the real percentage.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        tracker = get_object_or_404(AssignmentTracker, pk=pk)
        # Only owner or admin can sync
        if request.user.role == 'FACULTY' and tracker.course_assignment.faculty != request.user:
            return Response({'detail': 'Not your assignment.'}, status=status.HTTP_403_FORBIDDEN)
        pct = request.data.get('completion_pct')
        if pct is None:
            return Response({'detail': 'completion_pct is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tracker.completion_pct = float(pct)
            tracker.last_synced_at = timezone.now()
            tracker.save(update_fields=['completion_pct', 'last_synced_at', 'updated_at'])
        except ValueError:
            return Response({'detail': 'completion_pct must be a number.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AssignmentTrackerSerializer(tracker).data)


# ── Course Result ─────────────────────────────────────────────────────────────────

class CourseResultListCreateView(generics.ListCreateAPIView):
    """
    GET  — Faculty sees own results. HOD/Admin see all.
    POST — Faculty submits the result sheet URL + pass percentage.
    """
    serializer_class = CourseResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CourseResult.objects.select_related(
            'course_assignment__faculty', 'course_assignment__course', 'uploaded_by'
        )
        if user.role == 'FACULTY':
            qs = qs.filter(course_assignment__faculty=user)
        elif user.role == 'HOD' and user.department_id:
            qs = qs.filter(course_assignment__course__departments=user.department)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class CourseResultDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CourseResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'FACULTY':
            return CourseResult.objects.filter(course_assignment__faculty=user)
        return CourseResult.objects.all()


# ── Faculty: log and list handling entries ──────────────────────────────────

class TopicHandlingListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TopicHandlingCreateSerializer
        return TopicHandlingSerializer

    def get_queryset(self):
        user = self.request.user
        qs = TopicHandling.objects.select_related(
            'topic__unit__course', 'faculty', 'course_assignment', 'verification'
        )
        # Faculty sees only their own entries; HOD/Admin see all
        if user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        course = self.request.query_params.get('course')
        if course:
            qs = qs.filter(topic__unit__course_id=course)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        handling = serializer.save(faculty=self.request.user)
        HandlingVerification.objects.create(handling=handling)


class TopicHandlingDetailView(generics.RetrieveDestroyAPIView):
    """Faculty can view/delete/edit their own entries (if not yet approved)."""
    serializer_class = TopicHandlingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'FACULTY':
            return TopicHandling.objects.filter(faculty=user)
        return TopicHandling.objects.all()

    def patch(self, request, *args, **kwargs):
        obj = self.get_object()
        if hasattr(obj, 'verification') and obj.verification.status == 'APPROVED':
            return Response(
                {'detail': 'Cannot edit an approved entry.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = TopicHandlingCreateSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TopicHandlingSerializer(obj).data)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if hasattr(obj, 'verification') and obj.verification.status == 'APPROVED':
            return Response(
                {'detail': 'Cannot delete an approved entry.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


# ── Progress summary ──────────────────────────────────────────────────────────────────

class ProgressView(APIView):
    """
    Returns completed_topics / total_topics per course for the requesting faculty.
    Query param: ?course=<id>  (optional — returns all if omitted)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from courses.models import CourseAssignment
        from kgaps_creation.models import Topic

        user = request.user
        faculty_id = request.query_params.get('faculty', user.id)
        # HOD/Admin can query any faculty; Faculty can only query themselves
        if user.role == 'FACULTY':
            faculty_id = user.id

        assignments = CourseAssignment.objects.filter(
            faculty_id=faculty_id
        ).select_related('course').prefetch_related('course__departments')

        course_filter = request.query_params.get('course')
        if course_filter:
            assignments = assignments.filter(course_id=course_filter)

        result = []
        for assignment in assignments:
            course = assignment.course
            total_topics = Topic.objects.filter(
                unit__course=course
            ).count()
            handled_topics = TopicHandling.objects.filter(
                faculty_id=faculty_id,
                topic__unit__course=course,
                verification__status='APPROVED',
            ).values('topic').distinct().count()
            pending_topics = TopicHandling.objects.filter(
                faculty_id=faculty_id,
                topic__unit__course=course,
                verification__status='PENDING',
            ).values('topic').distinct().count()
            total_hours = TopicHandling.objects.filter(
                faculty_id=faculty_id,
                topic__unit__course=course,
            ).aggregate(total=Sum('hours_handled'))['total'] or 0
            pending_hours = TopicHandling.objects.filter(
                faculty_id=faculty_id,
                topic__unit__course=course,
                verification__status='PENDING',
            ).aggregate(total=Sum('hours_handled'))['total'] or 0

            result.append({
                'assignment_id': assignment.id,
                'course_id': course.id,
                'course_code': course.code,
                'course_name': course.name,
                'section': assignment.section,
                'academic_year': assignment.academic_year,
                'total_topics': total_topics,
                'handled_topics': handled_topics,
                'pending_topics': pending_topics,
                'completion_percent': round(
                    (handled_topics / total_topics * 100) if total_topics else 0, 1
                ),
                'total_hours': float(total_hours),
                'pending_hours': float(pending_hours),
            })
        return Response(result)


# ── HOD: verify handling entries ─────────────────────────────────────────────────────

class HandlingVerificationQueueView(generics.ListAPIView):
    serializer_class = HandlingVerificationDetailSerializer
    permission_classes = [IsAdminOrHOD]

    def get_queryset(self):
        user = self.request.user
        qs = HandlingVerification.objects.select_related(
            'handling__faculty',
            'handling__faculty__department',
            'handling__topic__unit__course',
            'handling__course_assignment',
            'verified_by',
        )
        # HOD sees only their department's faculty entries
        if user.role == 'HOD' and user.department_id:
            qs = qs.filter(handling__faculty__department=user.department)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        # Allow filtering by faculty for Admin drill-down
        faculty_filter = self.request.query_params.get('faculty')
        if faculty_filter:
            qs = qs.filter(handling__faculty_id=faculty_filter)
        return qs


class HandlingVerificationActionView(APIView):
    permission_classes = [IsAdminOrHOD]

    def patch(self, request, pk):
        verification = get_object_or_404(HandlingVerification, pk=pk)
        new_status = request.data.get('status')
        remarks = request.data.get('remarks', '')

        if new_status not in ('APPROVED', 'REJECTED'):
            return Response(
                {'detail': 'status must be APPROVED or REJECTED.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification.status = new_status
        verification.remarks = remarks
        verification.verified_by = request.user
        verification.save()
        return Response(HandlingVerificationSerializer(verification).data)
