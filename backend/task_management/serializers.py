from rest_framework import serializers
from .models import Task, TaskAssignment, TaskComment, TaskAttachment, SubTask, TaskHistory


class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name', read_only=True
    )

    class Meta:
        model = TaskAttachment
        fields = ['id', 'task', 'uploaded_by', 'uploaded_by_name',
                  'file', 'filename', 'uploaded_at']
        read_only_fields = ['id', 'task', 'uploaded_by', 'uploaded_at']


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'author', 'author_name', 'author_role',
                  'content', 'is_internal', 'created_at', 'updated_at']
        read_only_fields = ['id', 'task', 'author', 'created_at', 'updated_at']


class TaskAssignmentSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(
        source='assignee.get_full_name', read_only=True
    )
    assignee_email = serializers.CharField(
        source='assignee.email', read_only=True
    )
    assigned_by_name = serializers.CharField(
        source='assigned_by.get_full_name', read_only=True
    )

    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task', 'assignee', 'assignee_name', 'assignee_email',
            'assigned_by', 'assigned_by_name',
            'status', 'notes', 'assigned_at', 'completed_at',
        ]
        read_only_fields = ['id', 'task', 'assigned_by', 'assigned_at', 'completed_at']


class TaskAssignmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignment
        fields = ['status', 'notes']


class SubTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', read_only=True, default=''
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )

    class Meta:
        model = SubTask
        fields = [
            'id', 'task', 'title', 'is_done', 'order',
            'assigned_to', 'assigned_to_name',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'task', 'created_by', 'created_at']


class TaskHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(
        source='actor.get_full_name', read_only=True, default='System'
    )

    class Meta:
        model = TaskHistory
        fields = ['id', 'task', 'actor', 'actor_name', 'action', 'detail', 'timestamp']
        read_only_fields = ['id', 'task', 'actor', 'action', 'detail', 'timestamp']


class TaskSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )
    department_name = serializers.CharField(
        source='department.name', read_only=True, default=''
    )
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)
    history = TaskHistorySerializer(many=True, read_only=True)
    assignment_count = serializers.IntegerField(
        source='assignments.count', read_only=True
    )
    comment_count = serializers.IntegerField(
        source='comments.count', read_only=True
    )
    subtask_count = serializers.IntegerField(
        source='subtasks.count', read_only=True
    )
    subtask_done_count = serializers.SerializerMethodField()

    def get_subtask_done_count(self, obj):
        return obj.subtasks.filter(is_done=True).count()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status',
            'due_date', 'category', 'department', 'department_name',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'assignment_count', 'comment_count', 'subtask_count', 'subtask_done_count',
            'assignments', 'comments', 'attachments', 'subtasks', 'history',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TaskListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view (no nested comments/attachments)."""
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )
    department_name = serializers.CharField(
        source='department.name', read_only=True, default=''
    )
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    assignment_count = serializers.IntegerField(
        source='assignments.count', read_only=True
    )
    comment_count = serializers.IntegerField(
        source='comments.count', read_only=True
    )

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'priority', 'status', 'due_date', 'category',
            'department', 'department_name', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'assignment_count', 'comment_count',
            'assignments',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TaskCreateSerializer(serializers.ModelSerializer):
    """For creating/updating a task. Assignees supplied as a list of user IDs."""
    assignees = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status',
            'due_date', 'category', 'department', 'assignees',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        assignees = validated_data.pop('assignees', [])
        task = super().create(validated_data)
        for uid in assignees:
            TaskAssignment.objects.get_or_create(
                task=task,
                assignee_id=uid,
                defaults={'assigned_by': task.created_by},
            )
        return task

    def update(self, instance, validated_data):
        validated_data.pop('assignees', None)  # don't overwrite on update
        return super().update(instance, validated_data)
