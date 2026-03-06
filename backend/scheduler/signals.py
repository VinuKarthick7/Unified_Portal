"""
Integration 1: DailyEntry → TopicHandling (auto-generated)

When a DailyEntry is created, a corresponding TopicHandling record is
created automatically with is_auto_generated=True.  This means the
scheduler drives the handling log; faculty don't need to log twice.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction

from .models import DailyEntry


@receiver(post_save, sender=DailyEntry)
def create_handling_from_daily_entry(sender, instance, created, **kwargs):
    """Auto-create a TopicHandling + HandlingVerification when a DailyEntry is saved."""
    if not created:
        return  # Only act on creation, not updates

    # Import here to avoid circular imports
    from kgaps_handling.models import TopicHandling, HandlingVerification

    def _create():
        # Avoid duplicate if one was already manually created for same topic/date/assignment
        exists = TopicHandling.objects.filter(
            topic=instance.topic,
            faculty=instance.faculty,
            course_assignment=instance.course_assignment,
            date=instance.date,
            is_auto_generated=True,
        ).exists()
        if exists:
            return

        handling = TopicHandling.objects.create(
            topic=instance.topic,
            faculty=instance.faculty,
            course_assignment=instance.course_assignment,
            hours_handled=instance.hours_conducted,
            date=instance.date,
            notes=instance.notes,
            is_auto_generated=True,
        )
        HandlingVerification.objects.create(handling=handling)

    # Run after the current transaction commits so FKs are guaranteed
    transaction.on_commit(_create)
