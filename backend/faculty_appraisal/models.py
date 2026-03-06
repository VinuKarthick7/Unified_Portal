from django.db import models
from django.conf import settings


class AppraisalTemplate(models.Model):
    title           = models.CharField(max_length=200)
    description     = models.TextField(blank=True)
    academic_year   = models.CharField(max_length=10)          # e.g. "2025-26"
    department      = models.ForeignKey(
        'departments.Department',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='appraisal_templates',
        help_text='Leave blank for institution-wide template',
    )
    deadline        = models.DateField(null=True, blank=True)
    is_active       = models.BooleanField(default=True)
    created_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, related_name='created_templates',
    )
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        dept = self.department.name if self.department_id else 'All'
        return f"{self.title} [{self.academic_year}] ({dept})"


class AppraisalCriteria(models.Model):
    template    = models.ForeignKey(AppraisalTemplate, on_delete=models.CASCADE, related_name='criteria')
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    max_score   = models.PositiveIntegerField(default=10)
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.template.title} → {self.title}"


class AppraisalSubmission(models.Model):
    STATUS_DRAFT      = 'DRAFT'
    STATUS_SUBMITTED  = 'SUBMITTED'
    STATUS_HOD_REVIEW = 'HOD_REVIEW'
    STATUS_COMPLETED  = 'COMPLETED'
    STATUS_CHOICES = [
        (STATUS_DRAFT,      'Draft'),
        (STATUS_SUBMITTED,  'Submitted'),
        (STATUS_HOD_REVIEW, 'HOD Review'),
        (STATUS_COMPLETED,  'Completed'),
    ]

    template        = models.ForeignKey(AppraisalTemplate, on_delete=models.CASCADE, related_name='submissions')
    faculty         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appraisal_submissions',
    )
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    self_remarks    = models.TextField(blank=True)
    hod_remarks     = models.TextField(blank=True)
    submitted_at    = models.DateTimeField(null=True, blank=True)
    reviewed_at     = models.DateTimeField(null=True, blank=True)
    reviewed_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_submissions',
    )
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('template', 'faculty')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.faculty.get_full_name()} — {self.template.title}"

    @property
    def total_self_score(self):
        return sum(s.self_score or 0 for s in self.scores.all())

    @property
    def total_hod_score(self):
        return sum(s.hod_score or 0 for s in self.scores.all())

    @property
    def max_possible_score(self):
        return sum(c.max_score for c in self.template.criteria.all())


class CriteriaScore(models.Model):
    submission    = models.ForeignKey(AppraisalSubmission, on_delete=models.CASCADE, related_name='scores')
    criteria      = models.ForeignKey(AppraisalCriteria, on_delete=models.CASCADE, related_name='scores')
    self_score    = models.PositiveIntegerField(null=True, blank=True)
    hod_score     = models.PositiveIntegerField(null=True, blank=True)
    self_comment  = models.TextField(blank=True)
    hod_comment   = models.TextField(blank=True)

    class Meta:
        unique_together = ('submission', 'criteria')
        ordering = ['criteria__order', 'criteria__id']

    def __str__(self):
        return f"{self.submission} — {self.criteria.title}"
