from django.contrib import admin
from .models import Task, TaskAssignment, TaskComment, TaskAttachment


class TaskAssignmentInline(admin.TabularInline):
    model = TaskAssignment
    extra = 0
    raw_id_fields = ['assignee', 'assigned_by']


class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'priority', 'status', 'due_date', 'department', 'created_by', 'created_at']
    list_filter = ['priority', 'status', 'department']
    search_fields = ['title', 'description']
    inlines = [TaskAssignmentInline, TaskCommentInline]
    date_hierarchy = 'created_at'


@admin.register(TaskAssignment)
class TaskAssignmentAdmin(admin.ModelAdmin):
    list_display = ['task', 'assignee', 'assigned_by', 'status', 'assigned_at']
    list_filter = ['status']


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'author', 'is_internal', 'created_at']
    list_filter = ['is_internal']


@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'task', 'uploaded_by', 'uploaded_at']
