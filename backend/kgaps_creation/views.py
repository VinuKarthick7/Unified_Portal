from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import Domain, Unit, Topic, Material, MaterialVerification
from .serializers import (
    DomainSerializer,
    UnitSerializer, TopicSerializer,
    MaterialSerializer, MaterialVerificationSerializer,
)
from accounts.permissions import IsAdmin, IsAdminOrCoordinator


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
        return [IsAdminOrCoordinator()]


class UnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrCoordinator()]


# ── Topics ───────────────────────────────────────────────────────────────────

class TopicListCreateView(generics.ListCreateAPIView):
    serializer_class = TopicSerializer

    def get_queryset(self):
        qs = Topic.objects.select_related('unit', 'unit__course')
        unit = self.request.query_params.get('unit')
        course = self.request.query_params.get('course')
        if unit:
            qs = qs.filter(unit_id=unit)
        if course:
            qs = qs.filter(unit__course_id=course)
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrCoordinator()]


class TopicDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrCoordinator()]


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
        # Faculty: only see materials for topics in courses they're assigned to
        if user.role == 'FACULTY':
            from courses.models import CourseAssignment
            assigned_course_ids = CourseAssignment.objects.filter(
                faculty=user
            ).values_list('course_id', flat=True)
            qs = qs.filter(topic__unit__course_id__in=assigned_course_ids)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        material = serializer.save(uploaded_by=self.request.user)
        # Auto-create a PENDING verification record
        MaterialVerification.objects.create(material=material)


class MaterialDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]


# ── Verification ──────────────────────────────────────────────────────────────

class VerificationQueueView(generics.ListAPIView):
    """Admin sees all verifications. Coordinator sees only their department."""
    serializer_class = MaterialVerificationSerializer
    permission_classes = [IsAdminOrCoordinator]

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status', 'PENDING')
        qs = MaterialVerification.objects.filter(
            status=status_filter
        ).select_related('material__topic__unit__course', 'material__uploaded_by')
        # Coordinator: restrict to own department only (M2M lookup)
        if user.role == 'COORDINATOR' and user.department_id:
            qs = qs.filter(material__topic__unit__course__departments=user.department)
        return qs


class VerificationActionView(APIView):
    """Coordinator approves or rejects a material."""
    permission_classes = [IsAdminOrCoordinator]

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
