from django.core.management.base import BaseCommand
from django.db import transaction

from courses.models import Course
from kgaps_creation.models import Unit


class Command(BaseCommand):
    help = "Seed unit records for courses (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--course",
            dest="course",
            default="",
            help="Optional course code filter (example: CS3251)",
        )
        parser.add_argument(
            "--units",
            dest="units",
            type=int,
            default=5,
            help="Number of units to create per course (default: 5)",
        )
        parser.add_argument(
            "--title-prefix",
            dest="title_prefix",
            default="Unit",
            help="Prefix for generated unit titles (default: Unit)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        course_code = (options.get("course") or "").strip().upper()
        units_count = max(1, int(options.get("units") or 5))
        title_prefix = (options.get("title_prefix") or "Unit").strip() or "Unit"

        courses_qs = Course.objects.filter(is_active=True)
        if course_code:
            courses_qs = courses_qs.filter(code=course_code)

        courses = list(courses_qs.order_by("code"))
        if not courses:
            self.stdout.write(self.style.WARNING("No matching active courses found."))
            return

        created_total = 0
        updated_total = 0

        for course in courses:
            for unit_number in range(1, units_count + 1):
                title = f"{title_prefix} {unit_number}"
                obj, created = Unit.objects.update_or_create(
                    course=course,
                    unit_number=unit_number,
                    defaults={"title": title},
                )
                if created:
                    created_total += 1
                else:
                    updated_total += 1

            self.stdout.write(f"{course.code}: ensured {units_count} units")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created: {created_total}, Updated: {updated_total}, Courses: {len(courses)}"
            )
        )
