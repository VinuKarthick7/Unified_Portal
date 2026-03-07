from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import Period, Timetable, TimetableSlot, DailyEntry, SwapRequest, ExtraClass
from .serializers import (
    PeriodSerializer, TimetableSerializer, TimetableSlotSerializer,
    DailyEntrySerializer, DailyEntryCreateSerializer,
    SwapRequestSerializer, ExtraClassSerializer,
)
from accounts.permissions import IsHOD


# ── Periods ──────────────────────────────────────────────────────────────────

class PeriodListView(generics.ListAPIView):
    serializer_class = PeriodSerializer
    permission_classes = [IsAuthenticated]
    queryset = Period.objects.all()


# ── Timetable ─────────────────────────────────────────────────────────────────

class TimetableListView(generics.ListAPIView):
    """List timetables. Faculty sees own; HOD sees dept (student coverage); Admin sees all."""
    serializer_class = TimetableSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Timetable.objects.select_related(
            'course_assignment__course', 'course_assignment__faculty'
        ).prefetch_related('slots__period')
        if user.role == 'FACULTY':
            return qs.filter(course_assignment__faculty=user)
        if user.role == 'HOD' and user.department_id:
            # Student coverage scope: courses offered to this dept's students
            return qs.filter(course_assignment__course__departments=user.department)
        return qs


class TimetableDetailView(generics.RetrieveAPIView):
    """Get a timetable by its pk."""
    serializer_class = TimetableSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Timetable.objects.prefetch_related('slots__period')


class TimetableCreateUpdateView(APIView):
    """
    POST: Create or replace a timetable for a course_assignment.
    Accepts {course_assignment: id, slots: [{day_of_week, period, room}]}
    """
    permission_classes = [IsHOD]

    @transaction.atomic
    def post(self, request):
        assignment_id = request.data.get('course_assignment')
        slots_data = request.data.get('slots', [])

        if not assignment_id:
            return Response(
                {'detail': 'course_assignment is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        timetable, _ = Timetable.objects.get_or_create(
            course_assignment_id=assignment_id
        )
        # Replace all slots
        timetable.slots.all().delete()
        for slot in slots_data:
            TimetableSlot.objects.create(
                timetable=timetable,
                day_of_week=slot['day_of_week'],
                period_id=slot['period'],
                room=slot.get('room', ''),
            )
        serializer = TimetableSerializer(timetable)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ── Daily Entry ───────────────────────────────────────────────────────────────

class DailyEntryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return DailyEntryCreateSerializer if self.request.method == 'POST' else DailyEntrySerializer

    def get_queryset(self):
        user = self.request.user
        qs = DailyEntry.objects.select_related(
            'topic__unit__course', 'faculty', 'course_assignment__course',
            'timetable_slot__period',
        )
        if user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        date_filter = self.request.query_params.get('date')
        if date_filter:
            qs = qs.filter(date=date_filter)
        assignment_filter = self.request.query_params.get('assignment')
        if assignment_filter:
            qs = qs.filter(course_assignment_id=assignment_filter)
        return qs

    def perform_create(self, serializer):
        from courses.models import CourseAssignment
        from rest_framework.exceptions import PermissionDenied, ValidationError
        user = self.request.user
        ca_id = serializer.validated_data.get('course_assignment')
        if ca_id is not None:
            ca_id_val = ca_id.id if hasattr(ca_id, 'id') else ca_id
            if not CourseAssignment.objects.filter(pk=ca_id_val, faculty=user).exists():
                raise PermissionDenied('You can only log entries for your own course assignments.')
        serializer.save(faculty=user)


class DailyEntryDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = DailyEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'FACULTY':
            return DailyEntry.objects.filter(faculty=user)
        return DailyEntry.objects.all()


# ── Swap Requests ─────────────────────────────────────────────────────────────

class SwapRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = SwapRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('ADMIN', 'HOD'):
            return SwapRequest.objects.all().order_by('-created_at')
        return (SwapRequest.objects.filter(requester=user) |
                SwapRequest.objects.filter(target_faculty=user)).distinct()

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)


class SwapRequestActionView(APIView):
    """
    PATCH /api/scheduler/swaps/<pk>/action/
    Target faculty responds (APPROVED/REJECTED/CANCELLED) — or HOD can override.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        swap = get_object_or_404(SwapRequest, pk=pk)
        new_status = request.data.get('status')

        allowed = {'APPROVED', 'REJECTED', 'CANCELLED'}
        if new_status not in allowed:
            return Response(
                {'detail': f'status must be one of {allowed}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        is_admin = user.role == 'ADMIN'
        is_hod = user.role == 'HOD'
        is_target = swap.target_faculty == user
        is_requester = swap.requester == user and new_status == 'CANCELLED'

        # HOD can only act on swaps within their own department (management scope)
        if is_hod:
            if not user.department_id or swap.requester.department_id != user.department_id:
                return Response(
                    {'detail': 'You can only manage swap requests for faculty in your department.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if not (is_admin or is_hod or is_target or is_requester):
            return Response(
                {'detail': 'You do not have permission to act on this swap request.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        swap.status = new_status
        if new_status == 'APPROVED':
            swap.approved_by = user
        swap.save()
        return Response(SwapRequestSerializer(swap).data)


# ── Extra Classes ─────────────────────────────────────────────────────────────

class ExtraClassListCreateView(generics.ListCreateAPIView):
    serializer_class = ExtraClassSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ExtraClass.objects.select_related(
            'faculty', 'topic__unit__course',
            'course_assignment__course', 'proposed_period',
        )
        if user.role == 'FACULTY':
            return qs.filter(faculty=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(faculty=self.request.user)


class ExtraClassActionView(APIView):
    """PATCH /api/scheduler/extra-classes/<pk>/action/ — HOD approves/rejects."""
    permission_classes = [IsHOD]

    def patch(self, request, pk):
        extra = get_object_or_404(ExtraClass, pk=pk)
        new_status = request.data.get('status')

        if new_status not in ('APPROVED', 'REJECTED', 'CANCELLED'):
            return Response(
                {'detail': 'Invalid status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extra.status = new_status
        if new_status == 'APPROVED':
            extra.approved_by = request.user
            extra.save()
            # Auto-create a DailyEntry so TopicHandling is also auto-generated
            # via the post_save signal in scheduler/signals.py
            DailyEntry.objects.get_or_create(
                topic=extra.topic,
                faculty=extra.faculty,
                course_assignment=extra.course_assignment,
                date=extra.proposed_date,
                is_extra_class=True,
                defaults={
                    'hours_conducted': 1.0,
                    'notes': f'Auto-created from approved extra class request. {extra.reason}'.strip(),
                },
            )
        else:
            extra.save()
        return Response(ExtraClassSerializer(extra).data)
