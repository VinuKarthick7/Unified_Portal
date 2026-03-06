from django.db import models
from django.conf import settings


class Task(models.Model):
    PRIORITY_CHOICES = [
        ('LOW', 'Low'), ('MEDIUM', 'Medium'),
        ('HIGH', 'High'), ('CRITICAL', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('OPEN', 'Open'), ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='OPEN')
    due_date = models.DateField(null=True, blank=True)
    category = models.CharField(max_length=100, blank=True)  # free-text tag
    # Scope: if department is set → dept task; if null → institution-wide
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tasks',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_tasks',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class TaskAssignment(models.Model):
    """A Task assigned to a specific faculty member."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('COMPLETED', 'Completed'),
        ('DECLINED', 'Declined'),
    ]

    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name='assignments'
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_assignments',
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tasks_assigned',
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='PENDING'
    )
    notes = models.TextField(blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('task', 'assignee')
        ordering = ['-assigned_at']

    def __str__(self):
        return f"{self.task} → {self.assignee}"


class TaskComment(models.Model):
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_comments',
    )
    content = models.TextField()
    # internal = only visible to HOD/Admin
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on {self.task}"


class TaskAttachment(models.Model):
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name='attachments'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_attachments',
    )
    file = models.FileField(upload_to='task_attachments/')
    filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.filename and self.file:
            self.filename = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.filename} on {self.task}"


class SubTask(models.Model):
    """A checklist item nested under a Task."""
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name='subtasks'
    )
    title = models.CharField(max_length=200)
    is_done = models.BooleanField(default=False)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='subtask_assignments',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_subtasks',
    )
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"SubTask '{self.title}' on {self.task}"


class TaskHistory(models.Model):
    """Immutable audit trail for a Task."""
    ACTION_CHOICES = [
        ('CREATED', 'Created'),
        ('STATUS_CHANGED', 'Status Changed'),
        ('ASSIGNED', 'Assigned'),
        ('ASSIGNMENT_UPDATED', 'Assignment Updated'),
        ('COMMENTED', 'Commented'),
        ('SUBTASK_TOGGLED', 'Subtask Toggled'),
        ('ATTACHMENT_ADDED', 'Attachment Added'),
        ('UPDATED', 'Updated'),
    ]

    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name='history'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_history_actions',
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    detail = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.action} on {self.task} by {self.actor}"

