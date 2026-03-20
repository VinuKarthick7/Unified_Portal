from django.db import models


# ── Domain ────────────────────────────────────────────────────────────────────
# Courses are grouped under academic domains (e.g. AI, Data Science, Networks).
# Each domain has a 'Domain Mentor' (COORDINATOR role) responsible for
# verifying teaching materials submitted for courses in that domain.

class Domain(models.Model):
    name = models.CharField(max_length=100, unique=True)          # e.g. "Artificial Intelligence"
    code = models.CharField(max_length=20, blank=True)             # e.g. "AI"
    description = models.TextField(blank=True)
    # Domain Mentor — maps to COORDINATOR role in this system
    mentor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mentored_domains',
        limit_choices_to={'role': 'COORDINATOR'},
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


# ── Unit ──────────────────────────────────────────────────────────────────────

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


# ── Topic ─────────────────────────────────────────────────────────────────────

class Topic(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='topics')
    topic_title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    # Per-spec: each topic has a planned duration and a stated learning outcome
    planned_hours = models.DecimalField(
        max_digits=4, decimal_places=1, default=1,
        help_text='Total planned teaching hours for this topic.'
    )
    learning_outcome = models.TextField(
        blank=True,
        help_text='What students will understand or be able to do after this topic.'
    )
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.topic_title} (Unit {self.unit.unit_number})"

    def material_status_for_faculty(self, faculty_id):
        """
        3-state professional status for a topic assigned to a specific faculty:
        1) NOT_UPLOADED
        2) PENDING_VERIFICATION
        3) VERIFIED
        """
        mats = self.materials.filter(uploaded_by_id=faculty_id)
        if mats.filter(verification__status=MaterialVerification.Status.APPROVED).exists():
            return 'VERIFIED'
        if mats.filter(verification__status=MaterialVerification.Status.PENDING).exists():
            return 'PENDING_VERIFICATION'
        return 'NOT_UPLOADED'


class TopicAssignment(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='assignments')
    faculty = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='assigned_topics',
        limit_choices_to={'role': 'FACULTY'},
    )
    assigned_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_topic_assignments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('topic', 'faculty')

    def __str__(self):
        return f"{self.topic.topic_title} -> {self.faculty.get_full_name()}"

    @property
    def status(self):
        return self.topic.material_status_for_faculty(self.faculty_id)


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
