from django.contrib import admin
from .models import Course, CourseAssignment


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'department', 'semester', 'credits', 'is_active']
    list_filter = ['department', 'semester', 'is_active']
    search_fields = ['code', 'name']


@admin.register(CourseAssignment)
class CourseAssignmentAdmin(admin.ModelAdmin):
    list_display = ['faculty', 'course', 'section', 'academic_year', 'semester']
    list_filter = ['academic_year', 'semester']
    search_fields = ['faculty__first_name', 'course__name']
