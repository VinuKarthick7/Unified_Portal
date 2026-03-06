from django.db import models


# ── Assignment Tracker ────────────────────────────────────────────────────────
# Faculty links a Google Sheet / URL for each assignment they set.
# Completion percentage is calculated from the sheet (manual update or bot).

class AssignmentTracker(models.Model):
    course_assignment = models.ForeignKey(
        'courses.CourseAssignment',
        on_delete=models.CASCADE,
        related_name='assignment_trackers',
    )
    title = models.CharField(max_length=200)          # e.g. "Assignment 1"
    sheet_url = models.URLField()                     # Google Sheet or any URL
    completion_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='Percentage of students who submitted / completed this assignment.'
    )
    last_synced_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Last time the completion % was recalculated from the sheet.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.title} — {self.course_assignment} ({self.completion_pct}%)"


# ── Course Result ─────────────────────────────────────────────────────────────
# Faculty uploads the result sheet URL; admin / HOD reads the pass percentage.

class CourseResult(models.Model):
    course_assignment = models.OneToOneField(
        'courses.CourseAssignment',
        on_delete=models.CASCADE,
        related_name='result',
    )
    result_sheet_url = models.URLField(help_text='Link to the uploaded result sheet.')
    pass_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='Percentage of students who passed this course.'
    )
    remarks = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_results',
    )

    def __str__(self):
        return f"Result: {self.course_assignment} — {self.pass_percentage}% pass"


# ── Topic Handling ────────────────────────────────────────────────────────────

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
