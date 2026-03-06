from django.db import models
from django.conf import settings


class Notification(models.Model):
    class Category(models.TextChoices):
        TASK         = 'TASK',         'Task'
        HANDLING     = 'HANDLING',     'Handling'
        SWAP         = 'SWAP',         'Swap Request'
        EXTRA_CLASS  = 'EXTRA_CLASS',  'Extra Class'
        APPRAISAL    = 'APPRAISAL',    'Appraisal'
        SYSTEM       = 'SYSTEM',       'System'

    recipient   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    category    = models.CharField(max_length=20, choices=Category.choices, default=Category.SYSTEM)
    verb        = models.CharField(max_length=255)        # human-readable one-liner
    target_url  = models.CharField(max_length=255, blank=True, default='')
    is_read     = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['recipient', 'is_read', '-created_at'])]

    def __str__(self):
        return f"[{self.category}] {self.recipient} — {self.verb}"
