from django.urls import path
from .views import (
    TaskListCreateView,
    TaskDetailView,
    TaskAssignmentListCreateView,
    TaskAssignmentUpdateView,
    TaskCommentListCreateView,
    TaskAttachmentListCreateView,
    TaskStatsView,
    SubTaskListCreateView,
    SubTaskUpdateView,
    TaskHistoryListView,
)

urlpatterns = [
    # Task CRUD
    path('', TaskListCreateView.as_view(), name='task_list'),
    path('<int:pk>/', TaskDetailView.as_view(), name='task_detail'),

    # Nested: assignments per task
    path('<int:task_pk>/assignments/', TaskAssignmentListCreateView.as_view(), name='task_assignment_list'),
    path('<int:task_pk>/assignments/<int:pk>/', TaskAssignmentUpdateView.as_view(), name='task_assignment_update'),

    # Nested: comments per task
    path('<int:task_pk>/comments/', TaskCommentListCreateView.as_view(), name='task_comment_list'),

    # Nested: attachments per task
    path('<int:task_pk>/attachments/', TaskAttachmentListCreateView.as_view(), name='task_attachment_list'),

    # Nested: subtasks per task
    path('<int:task_pk>/subtasks/', SubTaskListCreateView.as_view(), name='task_subtask_list'),
    path('<int:task_pk>/subtasks/<int:pk>/', SubTaskUpdateView.as_view(), name='task_subtask_update'),

    # Nested: history / audit log per task
    path('<int:task_pk>/history/', TaskHistoryListView.as_view(), name='task_history'),

    # Stats
    path('stats/', TaskStatsView.as_view(), name='task_stats'),
]
