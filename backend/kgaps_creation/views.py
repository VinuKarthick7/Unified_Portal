from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import Domain, Unit, Topic, TopicAssignment, Material, MaterialVerification
from .serializers import (
    DomainSerializer,
    UnitSerializer, TopicSerializer,
    MaterialSerializer, MaterialVerificationSerializer, TopicAssignmentSerializer,
)
from accounts.permissions import IsAdmin, IsCoordinator


# ── Domains ────────────────────────────────────────────────────────────────────

class DomainListCreateView(generics.ListCreateAPIView):
    """
    GET  — any authenticated user can list domains.
    POST — admin only (domain creation is a developer/admin task).
    """
    serializer_class = DomainSerializer
    queryset = Domain.objects.prefetch_related('courses')

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]


class DomainDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DomainSerializer
    queryset = Domain.objects.all()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]


# ── Units ────────────────────────────────────────────────────────────────────

class UnitListCreateView(generics.ListCreateAPIView):
    serializer_class = UnitSerializer

    def get_queryset(self):
        qs = Unit.objects.select_related('course')
        course = self.request.query_params.get('course')
        if course:
            qs = qs.filter(course_id=course)
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]


class UnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]


# ── Topics ───────────────────────────────────────────────────────────────────

class TopicListCreateView(generics.ListCreateAPIView):
    serializer_class = TopicSerializer

    def get_queryset(self):
        qs = Topic.objects.select_related('unit', 'unit__course')
        qs = qs.prefetch_related('assignments__faculty', 'materials__verification')
        unit = self.request.query_params.get('unit')
        course = self.request.query_params.get('course')
        if unit:
            qs = qs.filter(unit_id=unit)
        if course:
            qs = qs.filter(unit__course_id=course)
        if self.request.user.role == 'FACULTY':
            qs = qs.filter(assignments__faculty=self.request.user).distinct()
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsCoordinator()]

    def perform_create(self, serializer):
        user = self.request.user
        unit = serializer.validated_data.get('unit')
        if user.role == 'COORDINATOR':
            owns = unit.course.domain and unit.course.domain.mentor_id == user.pk
            if not owns:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can only add topics to courses in your own domain.')
        serializer.save()


class TopicDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsCoordinator()]

    def _check_domain_ownership(self, topic):
        user = self.request.user
        if user.role == 'COORDINATOR':
            owns = topic.unit.course.domain and topic.unit.course.domain.mentor_id == user.pk
            if not owns:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can only modify topics for courses in your own domain.')

    def perform_update(self, serializer):
        self._check_domain_ownership(self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        self._check_domain_ownership(instance)
        instance.delete()


# ── Materials ─────────────────────────────────────────────────────────────────

class MaterialListCreateView(generics.ListCreateAPIView):
    serializer_class = MaterialSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Material.objects.select_related('topic', 'uploaded_by')
        topic = self.request.query_params.get('topic')
        if topic:
            qs = qs.filter(topic_id=topic)
        if user.role == 'FACULTY':
            # Faculty: only materials for topics assigned to them
            qs = qs.filter(topic__assignments__faculty=user).distinct()
        elif user.role == 'HOD' and user.department_id:
            # HOD: materials for courses offered to their student department
            qs = qs.filter(topic__unit__course__departments=user.department)
        elif user.role == 'COORDINATOR':
            # Coordinator: only materials for courses in their assigned Domain(s)
            qs = qs.filter(topic__unit__course__domain__mentor=user)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        topic = serializer.validated_data.get('topic')
        user = self.request.user
        if user.role == 'FACULTY':
            is_assigned = topic.assignments.filter(faculty=user).exists()
            if not is_assigned:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can upload material only for topics assigned to you.')
        material = serializer.save(uploaded_by=self.request.user)
        # Auto-create a PENDING verification record
        MaterialVerification.objects.create(material=material)


class TopicAssignmentListCreateView(generics.ListCreateAPIView):
    serializer_class = TopicAssignmentSerializer

    def get_queryset(self):
        from .models import TopicAssignment
        qs = TopicAssignment.objects.select_related('topic__unit__course', 'faculty', 'assigned_by')
        topic = self.request.query_params.get('topic')
        course = self.request.query_params.get('course')
        faculty = self.request.query_params.get('faculty')
        if topic:
            qs = qs.filter(topic_id=topic)
        if course:
            qs = qs.filter(topic__unit__course_id=course)
        if faculty:
            qs = qs.filter(faculty_id=faculty)
        user = self.request.user
        if user.role == 'COORDINATOR':
            qs = qs.filter(topic__unit__course__domain__mentor=user)
        elif user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsCoordinator()]

    def perform_create(self, serializer):
        topic = serializer.validated_data.get('topic')
        faculty = serializer.validated_data.get('faculty')
        user = self.request.user
        owns = topic.unit.course.domain and topic.unit.course.domain.mentor_id == user.pk
        if not owns:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only assign topics for courses in your own domain.')
        from courses.models import CourseAssignment
        teaches_course = CourseAssignment.objects.filter(
            faculty=faculty, course=topic.unit.course
        ).exists()
        if not teaches_course:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Selected faculty is not assigned to this course.')
        serializer.save(assigned_by=user)


class TopicAssignmentDetailView(generics.DestroyAPIView):
    queryset = TopicAssignment.objects.select_related('topic__unit__course')
    serializer_class = TopicAssignmentSerializer
    permission_classes = [IsCoordinator]

    def perform_destroy(self, instance):
        user = self.request.user
        owns = instance.topic.unit.course.domain and instance.topic.unit.course.domain.mentor_id == user.pk
        if not owns:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only remove assignments in your own domain.')
        instance.delete()


class MaterialDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]


# ── Verification ──────────────────────────────────────────────────────────────

class VerificationQueueView(generics.ListAPIView):
    """Coordinator sees only their Domain's materials."""
    serializer_class = MaterialVerificationSerializer
    permission_classes = [IsCoordinator]

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status', 'PENDING')
        qs = MaterialVerification.objects.filter(
            status=status_filter
        ).select_related('material__topic__unit__course', 'material__uploaded_by')
        qs = qs.filter(material__topic__unit__course__domain__mentor=user)
        return qs


class VerificationActionView(APIView):
    """Coordinator approves or rejects a material."""
    permission_classes = [IsCoordinator]

    def patch(self, request, pk):
        verification = get_object_or_404(MaterialVerification, pk=pk)
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
        return Response(MaterialVerificationSerializer(verification).data)


# ── Course structure (full tree for a course) ─────────────────────────────────

class CourseStructureView(APIView):
    """Returns the full Unit→Topic tree for a given course."""
    permission_classes = [IsAuthenticated]

    def get(self, request, course_pk):
        units = Unit.objects.filter(course_id=course_pk).prefetch_related(
            'topics__materials__verification'
        )
        data = UnitSerializer(units, many=True, context={'request': request}).data
        return Response(data)
