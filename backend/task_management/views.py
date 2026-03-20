from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count

from .models import Task, TaskAssignment, TaskComment, TaskAttachment, SubTask, TaskHistory
from .serializers import (
    TaskSerializer, TaskListSerializer, TaskCreateSerializer,
    TaskAssignmentSerializer, TaskAssignmentUpdateSerializer,
    TaskCommentSerializer,
    TaskAttachmentSerializer,
    SubTaskSerializer, TaskHistorySerializer,
)
from accounts.permissions import IsHOD, IsAdminOrHOD


def _record_history(task, actor, action, detail=''):
    """Helper to create a TaskHistory entry."""
    TaskHistory.objects.create(task=task, actor=actor, action=action, detail=detail)


# ── Tasks ──────────────────────────────────────────────────────────────────

class TaskListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrHOD()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskCreateSerializer
        return TaskListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.select_related(
            'created_by', 'department'
        ).prefetch_related('assignments__assignee', 'attachments')

        # Faculty: only tasks where they're an assignee
        if user.role == 'FACULTY':
            qs = qs.filter(assignments__assignee=user)
        elif user.role == 'HOD' and user.department:
            # HOD: dept tasks + tasks where they're assignee
            qs = qs.filter(Q(department=user.department) | Q(assignments__assignee=user))
        # ADMIN/COORDINATOR: all tasks

        # Filters
        status_f = self.request.query_params.get('status')
        priority_f = self.request.query_params.get('priority')
        dept_f = self.request.query_params.get('department')
        q = self.request.query_params.get('q')

        if status_f:
            qs = qs.filter(status=status_f)
        if priority_f:
            qs = qs.filter(priority=priority_f)
        # Prevent HOD from overriding their dept scope via query param
        if dept_f and user.role not in ('HOD', 'FACULTY'):
            qs = qs.filter(department_id=dept_f)
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        return qs.distinct()

    def perform_create(self, serializer):
        user = self.request.user
        # HOD can only create tasks for their own department
        if user.role == 'HOD' and user.department:
            serializer.save(created_by=user, department=user.department)
        else:
            serializer.save(created_by=user)
        task = serializer.instance
        _record_history(task, user, 'CREATED', f'Task "{task.title}" created.')


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return TaskCreateSerializer if self.request.method in ('PUT', 'PATCH') else TaskSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.select_related(
            'created_by', 'department'
        ).prefetch_related(
            'assignments__assignee', 'comments__author', 'attachments__uploaded_by'
        )
        if user.role == 'FACULTY':
            qs = qs.filter(assignments__assignee=user)
        elif user.role == 'HOD' and user.department:
            qs = qs.filter(Q(department=user.department) | Q(assignments__assignee=user))
        return qs.distinct()

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdminOrHOD()]
        return [IsAuthenticated()]


# ── Task Assignments ───────────────────────────────────────────────────────────

class TaskAssignmentListCreateView(generics.ListCreateAPIView):
    """List/add assignees for a task (HOD/Admin add; all can view)."""
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        task_pk = self.kwargs['task_pk']
        return TaskAssignment.objects.filter(
            task_id=task_pk
        ).select_related('assignee', 'assigned_by')

    def perform_create(self, serializer):
        task = get_object_or_404(Task, pk=self.kwargs['task_pk'])
        serializer.save(task=task, assigned_by=self.request.user)


class TaskAssignmentUpdateView(APIView):
    """
    PATCH /api/tasks/<task_pk>/assignments/<pk>/
    Faculty updates their own assignment status.
    HOD/Admin can update any.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_pk, pk):
        assignment = get_object_or_404(TaskAssignment, pk=pk, task_id=task_pk)
        user = request.user

        is_owner = assignment.assignee == user
        is_hod_admin = user.role in ('HOD', 'ADMIN')

        if not (is_owner or is_hod_admin):
            return Response(
                {'detail': 'Permission denied.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TaskAssignmentUpdateSerializer(
            assignment, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get('status')
        if new_status == 'COMPLETED':
            serializer.save(completed_at=timezone.now())
        else:
            serializer.save()

        # Log history
        if new_status:
            _record_history(
                assignment.task, user, 'ASSIGNMENT_UPDATED',
                f'{assignment.assignee.get_full_name()} → {new_status}'
            )

        # Auto-update parent task status
        task = assignment.task
        all_assignments = list(task.assignments.values_list('status', flat=True))
        if all_assignments and all(s == 'COMPLETED' for s in all_assignments):
            task.status = 'COMPLETED'
            task.save(update_fields=['status'])
        elif any(s == 'ACCEPTED' for s in all_assignments):
            if task.status == 'OPEN':
                task.status = 'IN_PROGRESS'
                task.save(update_fields=['status'])

        return Response(TaskAssignmentSerializer(assignment).data)


# ── Comments ─────────────────────────────────────────────────────────────────

class TaskCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = TaskComment.objects.filter(
            task_id=self.kwargs['task_pk']
        ).select_related('author')
        # Faculty cannot see internal comments
        if user.role == 'FACULTY':
            qs = qs.filter(is_internal=False)
        return qs

    def perform_create(self, serializer):
        task = get_object_or_404(Task, pk=self.kwargs['task_pk'])
        # Only HOD/Admin can post internal comments
        is_internal = serializer.validated_data.get('is_internal', False)
        if is_internal and self.request.user.role == 'FACULTY':
            raise generics.PermissionDenied('Faculty cannot post internal comments.')
        serializer.save(task=task, author=self.request.user)
        _record_history(task, self.request.user, 'COMMENTED', 'Comment added.')


# ── Attachments ────────────────────────────────────────────────────────────────

class TaskAttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskAttachmentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TaskAttachment.objects.filter(
            task_id=self.kwargs['task_pk']
        ).select_related('uploaded_by')

    def perform_create(self, serializer):
        task = get_object_or_404(Task, pk=self.kwargs['task_pk'])
        serializer.save(task=task, uploaded_by=self.request.user)


# ── Stats ───────────────────────────────────────────────────────────────────

class TaskStatsView(APIView):
    """Quick summary counts used for dashboard badges."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'FACULTY':
            mine = TaskAssignment.objects.filter(assignee=user)
            return Response({
                'my_pending': mine.filter(status='PENDING').count(),
                'my_accepted': mine.filter(status='ACCEPTED').count(),
                'my_completed': mine.filter(status='COMPLETED').count(),
                'overdue': Task.objects.filter(
                    assignments__assignee=user,
                    due_date__lt=timezone.now().date(),
                ).exclude(status__in=['COMPLETED', 'CANCELLED']).distinct().count(),
            })

        # HOD / Admin
        qs = Task.objects.all()
        if user.role == 'HOD' and user.department:
            qs = qs.filter(department=user.department)

        return Response({
            'open': qs.filter(status='OPEN').count(),
            'in_progress': qs.filter(status='IN_PROGRESS').count(),
            'completed': qs.filter(status='COMPLETED').count(),
            'overdue': qs.filter(
                due_date__lt=timezone.now().date()
            ).exclude(status__in=['COMPLETED', 'CANCELLED']).count(),
        })


# ── SubTasks ─────────────────────────────────────────────────────────────────

class SubTaskListCreateView(generics.ListCreateAPIView):
    """List subtasks for a task; anyone on the task can add one."""
    serializer_class = SubTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SubTask.objects.filter(task_id=self.kwargs['task_pk']).select_related(
            'assigned_to', 'created_by'
        )

    def perform_create(self, serializer):
        task = get_object_or_404(Task, pk=self.kwargs['task_pk'])
        subtask = serializer.save(task=task, created_by=self.request.user)
        _record_history(task, self.request.user, 'SUBTASK_TOGGLED', f'SubTask added: "{subtask.title}"')


class SubTaskUpdateView(APIView):
    """
    PATCH /api/tasks/<task_pk>/subtasks/<pk>/
    Toggle is_done, rename title, or re-assign.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_pk, pk):
        subtask = get_object_or_404(SubTask, pk=pk, task_id=task_pk)
        serializer = SubTaskSerializer(subtask, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Log when a subtask is toggled
        if 'is_done' in request.data:
            state = 'done' if request.data['is_done'] else 'undone'
            _record_history(
                subtask.task, request.user, 'SUBTASK_TOGGLED',
                f'"{subtask.title}" marked {state}'
            )

        return Response(serializer.data)

    def delete(self, request, task_pk, pk):
        subtask = get_object_or_404(SubTask, pk=pk, task_id=task_pk)
        task = subtask.task
        title = subtask.title
        subtask.delete()
        _record_history(task, request.user, 'SUBTASK_TOGGLED', f'SubTask deleted: "{title}"')
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Task History ──────────────────────────────────────────────────────────────

class TaskHistoryListView(generics.ListAPIView):
    """Read-only audit log for a task."""
    serializer_class = TaskHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TaskHistory.objects.filter(
            task_id=self.kwargs['task_pk']
        ).select_related('actor')

# ── SubTasks ─────────────────────────────────────────────────────────────────

class SubTaskListCreateView(generics.ListCreateAPIView):
    """List / create subtask checklist items for a task."""
    serializer_class = SubTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SubTask.objects.filter(
            task_id=self.kwargs['task_pk']
        ).select_related('assigned_to', 'created_by')

    def perform_create(self, serializer):
        task = get_object_or_404(Task, pk=self.kwargs['task_pk'])
        subtask = serializer.save(task=task, created_by=self.request.user)
        _record_history(task, self.request.user, 'UPDATED', f'Sub-task added: "{subtask.title}"')


class SubTaskUpdateView(APIView):
    """
    PATCH /api/tasks/<task_pk>/subtasks/<pk>/
    Toggle is_done or rename. Any task participant or HOD/Admin.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_pk, pk):
        subtask = get_object_or_404(SubTask, pk=pk, task_id=task_pk)
        serializer = SubTaskSerializer(subtask, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if 'is_done' in request.data:
            done_label = 'done' if subtask.is_done else 'undone'
            _record_history(
                subtask.task, request.user, 'SUBTASK_TOGGLED',
                f'"{subtask.title}" marked {done_label}.'
            )

        return Response(serializer.data)

    def delete(self, request, task_pk, pk):
        subtask = get_object_or_404(SubTask, pk=pk, task_id=task_pk)
        user = request.user
        if user.role not in ('ADMIN', 'HOD') and subtask.created_by != user:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        task = subtask.task
        title = subtask.title
        subtask.delete()
        _record_history(task, user, 'UPDATED', f'Sub-task deleted: "{title}"')
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Task History ──────────────────────────────────────────────────────────────

class TaskHistoryListView(generics.ListAPIView):
    """Read-only audit timeline for a task."""
    serializer_class = TaskHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TaskHistory.objects.filter(
            task_id=self.kwargs['task_pk']
        ).select_related('actor')