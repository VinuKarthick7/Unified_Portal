from rest_framework import serializers
from .models import Course, CourseAssignment


class CourseSerializer(serializers.ModelSerializer):
    # M2M: write as list of department IDs, read back as list of {id, name}
    department_names = serializers.SerializerMethodField()
    domain_name = serializers.CharField(source='domain.name', read_only=True, default=None)

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'departments', 'department_names',
                  'domain', 'domain_name',
                  'semester', 'credits', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_department_names(self, obj):
        return [{'id': d.id, 'name': d.name} for d in obj.departments.all()]


class CourseAssignmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.get_full_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    # All departments this course belongs to (list of names, comma-joined for display)
    department_names = serializers.SerializerMethodField()

    class Meta:
        model = CourseAssignment
        fields = ['id', 'faculty', 'faculty_name', 'course', 'course_name',
                  'course_code', 'department_names', 'section', 'academic_year',
                  'semester', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_department_names(self, obj):
        return ', '.join(d.name for d in obj.course.departments.all())
