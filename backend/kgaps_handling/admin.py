from django.contrib import admin
from .models import TopicHandling, HandlingVerification, AssignmentTracker, CourseResult


class HandlingVerificationInline(admin.TabularInline):
    model = HandlingVerification
    extra = 0
    readonly_fields = ['verified_at']


@admin.register(TopicHandling)
class TopicHandlingAdmin(admin.ModelAdmin):
    list_display = ['faculty', 'topic', 'hours_handled', 'date', 'is_auto_generated']
    list_filter = ['date', 'is_auto_generated', 'topic__unit__course']
    search_fields = ['faculty__first_name', 'faculty__last_name', 'topic__topic_title']
    inlines = [HandlingVerificationInline]


@admin.register(HandlingVerification)
class HandlingVerificationAdmin(admin.ModelAdmin):
    list_display = ['handling', 'status', 'verified_by', 'verified_at']
    list_filter = ['status']


@admin.register(AssignmentTracker)
class AssignmentTrackerAdmin(admin.ModelAdmin):
    list_display = ['title', 'course_assignment', 'completion_pct', 'last_synced_at']
    search_fields = ['title']
    list_filter = ['course_assignment__course']


@admin.register(CourseResult)
class CourseResultAdmin(admin.ModelAdmin):
    list_display = ['course_assignment', 'pass_percentage', 'uploaded_by', 'updated_at']
    search_fields = ['course_assignment__course__name']
    list_filter = ['course_assignment__course__departments']
