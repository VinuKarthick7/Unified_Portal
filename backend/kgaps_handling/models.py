from django.db import models


class TopicHandling(models.Model):
    topic = models.ForeignKey(
        'kgaps_creation.Topic',
        on_delete=models.CASCADE,
        related_name='handlings',
    )
    faculty = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='topic_handlings',
        limit_choices_to={'role': 'FACULTY'},
    )
    course_assignment = models.ForeignKey(
        'courses.CourseAssignment',
        on_delete=models.CASCADE,
        related_name='handlings',
    )
    hours_handled = models.DecimalField(max_digits=4, decimal_places=1)
    date = models.DateField()
    notes = models.TextField(blank=True)
    is_auto_generated = models.BooleanField(
        default=False,
        help_text='True when created automatically from a DailyEntry.',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.faculty} — {self.topic} on {self.date}"


class HandlingVerification(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    handling = models.OneToOneField(
        TopicHandling,
        on_delete=models.CASCADE,
        related_name='verification',
    )
    verified_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='handling_verifications',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    remarks = models.TextField(blank=True)
    verified_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.handling} — {self.status}"
