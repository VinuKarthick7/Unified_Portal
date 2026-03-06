from django.db import models
from django.conf import settings


class Period(models.Model):
    """A named time slot within a teaching day (e.g. Period 1: 09:00–10:00)."""
    name = models.CharField(max_length=50)
    start_time = models.TimeField()
    end_time = models.TimeField()
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.name} ({self.start_time}–{self.end_time})"


class Timetable(models.Model):
    """The weekly timetable for a particular course assignment."""
    course_assignment = models.OneToOneField(
        'courses.CourseAssignment',
        on_delete=models.CASCADE,
        related_name='timetable',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Timetable for {self.course_assignment}"


class TimetableSlot(models.Model):
    """A single weekly slot: day x period."""
    DAY_CHOICES = [
        ('MON', 'Monday'), ('TUE', 'Tuesday'), ('WED', 'Wednesday'),
        ('THU', 'Thursday'), ('FRI', 'Friday'), ('SAT', 'Saturday'),
    ]

    timetable = models.ForeignKey(
        Timetable, on_delete=models.CASCADE, related_name='slots'
    )
    day_of_week = models.CharField(max_length=3, choices=DAY_CHOICES)
    period = models.ForeignKey(
        Period, on_delete=models.CASCADE, related_name='slots'
    )
    room = models.CharField(max_length=50, blank=True)

    class Meta:
        unique_together = ('timetable', 'day_of_week', 'period')
        ordering = ['day_of_week', 'period__order']

    def __str__(self):
        return f"{self.timetable} — {self.day_of_week} P{self.period.order}"


class DailyEntry(models.Model):
    """
    Faculty records that a class was actually conducted.
    A post_save signal automatically creates a TopicHandling record
    (is_auto_generated=True) when a new DailyEntry is saved.
    """
    timetable_slot = models.ForeignKey(
        TimetableSlot, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='daily_entries',
    )
    topic = models.ForeignKey(
        'kgaps_creation.Topic', on_delete=models.CASCADE, related_name='daily_entries',
    )
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_entries',
    )
    course_assignment = models.ForeignKey(
        'courses.CourseAssignment', on_delete=models.CASCADE, related_name='daily_entries',
    )
    date = models.DateField()
    hours_conducted = models.DecimalField(max_digits=4, decimal_places=1, default=1.0)
    notes = models.TextField(blank=True)
    is_extra_class = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.faculty} — {self.topic} on {self.date}"


class SwapRequest(models.Model):
    """Faculty requests another faculty to take their slot on a given date."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'), ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'), ('CANCELLED', 'Cancelled'),
    ]

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='swap_requests_sent',
    )
    target_faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='swap_requests_received',
    )
    original_slot = models.ForeignKey(
        TimetableSlot, on_delete=models.CASCADE, related_name='swap_requests',
    )
    swap_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='swap_approvals',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Swap: {self.requester} → {self.target_faculty} on {self.swap_date}"


class ExtraClass(models.Model):
    """Faculty requests an extra (ad-hoc) class session."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'), ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'), ('CANCELLED', 'Cancelled'),
    ]

    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='extra_classes',
    )
    course_assignment = models.ForeignKey(
        'courses.CourseAssignment', on_delete=models.CASCADE, related_name='extra_classes',
    )
    topic = models.ForeignKey(
        'kgaps_creation.Topic', on_delete=models.CASCADE, related_name='extra_classes',
    )
    proposed_date = models.DateField()
    proposed_period = models.ForeignKey(
        Period, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='extra_classes',
    )
    room = models.CharField(max_length=50, blank=True)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='extra_class_approvals',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Extra: {self.faculty} — {self.topic} on {self.proposed_date}"
