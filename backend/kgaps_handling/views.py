from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Sum, Count, Q

from .models import TopicHandling, HandlingVerification
from .serializers import (
    TopicHandlingSerializer,
    TopicHandlingCreateSerializer,
    HandlingVerificationSerializer,
    HandlingVerificationDetailSerializer,
)
from accounts.permissions import IsAdminOrHOD


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
        ).select_related('course__department')

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
