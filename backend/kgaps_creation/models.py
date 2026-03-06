from django.db import models


class Unit(models.Model):
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='units',
    )
    unit_number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['unit_number']
        unique_together = ('course', 'unit_number')

    def __str__(self):
        return f"Unit {self.unit_number}: {self.title} ({self.course.code})"


class Topic(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='topics')
    topic_title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.topic_title} (Unit {self.unit.unit_number})"


class Material(models.Model):
    class MaterialType(models.TextChoices):
        PPT = 'PPT', 'Presentation'
        NOTES = 'NOTES', 'Notes'
        LAB = 'LAB', 'Lab Instructions'
        VIDEO = 'VIDEO', 'Video Link'
        REFERENCE = 'REFERENCE', 'Reference'

    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='materials')
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_materials',
    )
    material_type = models.CharField(max_length=20, choices=MaterialType.choices)
    title = models.CharField(max_length=200)
    file_url = models.FileField(upload_to='materials/', blank=True, null=True)
    external_url = models.URLField(blank=True)  # for video/reference links
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.material_type}: {self.title}"


class MaterialVerification(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    material = models.OneToOneField(
        Material,
        on_delete=models.CASCADE,
        related_name='verification',
    )
    verified_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_materials',
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    remarks = models.TextField(blank=True)
    verified_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.material} — {self.status}"
