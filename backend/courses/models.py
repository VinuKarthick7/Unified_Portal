from django.db import models


class Course(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    # A course can belong to multiple departments (shared / common courses)
    departments = models.ManyToManyField(
        'departments.Department',
        related_name='courses',
        blank=True,
    )
    # Domain links this course to an academic domain and its Domain Mentor
    domain = models.ForeignKey(
        'kgaps_creation.Domain',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='courses',
    )
    semester = models.PositiveSmallIntegerField()
    credits = models.PositiveSmallIntegerField(default=3)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} — {self.name}"


class CourseAssignment(models.Model):
    faculty = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='course_assignments',
        limit_choices_to={'role': 'FACULTY'},
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    section = models.CharField(max_length=10)
    academic_year = models.CharField(max_length=9)  # e.g. "2025-2026"
    semester = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('faculty', 'course', 'section', 'academic_year')

    def __str__(self):
        return f"{self.faculty} → {self.course} [{self.section}]"
