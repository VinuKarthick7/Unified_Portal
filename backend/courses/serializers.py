from rest_framework import serializers
from .models import Course, CourseAssignment


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'department', 'department_name',
                  'semester', 'credits', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class CourseAssignmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.get_full_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    department_name = serializers.CharField(source='course.department.name', read_only=True)

    class Meta:
        model = CourseAssignment
        fields = ['id', 'faculty', 'faculty_name', 'course', 'course_name',
                  'course_code', 'department_name', 'section', 'academic_year',
                  'semester', 'created_at']
        read_only_fields = ['id', 'created_at']
