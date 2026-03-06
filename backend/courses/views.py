from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from .models import Course, CourseAssignment
from .serializers import CourseSerializer, CourseAssignmentSerializer
from accounts.permissions import IsAdmin, IsAdminOrHOD

User = get_user_model()


class CourseListCreateView(generics.ListCreateAPIView):
    serializer_class = CourseSerializer

    def get_queryset(self):
        qs = Course.objects.select_related('department').filter(is_active=True)
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department_id=dept)
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]


class CourseAssignmentListCreateView(generics.ListCreateAPIView):
    serializer_class = CourseAssignmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = CourseAssignment.objects.select_related('faculty', 'course')
        # Faculty role: restrict to own assignments only
        if user.role == 'FACULTY':
            return qs.filter(faculty=user)
        # HOD: restrict to own department
        if user.role == 'HOD' and user.department_id:
            qs = qs.filter(course__department=user.department)
        faculty = self.request.query_params.get('faculty')
        course = self.request.query_params.get('course')
        if faculty:
            qs = qs.filter(faculty_id=faculty)
        if course:
            qs = qs.filter(course_id=course)
        return qs

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrHOD()]


class CourseAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CourseAssignment.objects.all()
    serializer_class = CourseAssignmentSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdminOrHOD()]


class MyAssignmentsView(generics.ListAPIView):
    """Returns course assignments for the currently logged-in faculty."""
    serializer_class = CourseAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CourseAssignment.objects.filter(
            faculty=self.request.user
        ).select_related('course', 'course__department')
