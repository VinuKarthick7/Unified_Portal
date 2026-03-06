"""
notifications/signals.py
Auto-generate Notification records on key model state changes.

Covered events
──────────────
  TASK        • TaskAssignment created         → notify assignee
              • TaskAssignment status changed  → notify assigned_by (creator)
  HANDLING    • HandlingVerification APPROVED/REJECTED → notify faculty
  SWAP        • SwapRequest APPROVED/REJECTED  → notify requester & target_faculty
  EXTRA_CLASS • ExtraClass APPROVED/REJECTED   → notify faculty
  APPRAISAL   • AppraisalSubmission status changed → notify faculty
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Notification


# ── helpers ────────────────────────────────────────────────────────────────
def _notify(recipient, category, verb, target_url=''):
    """Create a Notification, ignoring IntegrityError-style duplication."""
    Notification.objects.create(
        recipient=recipient,
        category=category,
        verb=verb,
        target_url=target_url,
    )


def _capture_old_status(sender, instance, **kwargs):
    """
    Pre-save receiver: stash the current DB status on the instance
    so post_save can compare old vs new.
    """
    if not instance.pk:
        instance._pre_save_status = None
        return
    try:
        instance._pre_save_status = sender.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
    except Exception:
        instance._pre_save_status = None


# Register pre_save hooks for every model we watch
for _sender_label in [
    'task_management.TaskAssignment',
    'kgaps_handling.HandlingVerification',
    'scheduler.SwapRequest',
    'scheduler.ExtraClass',
    'faculty_appraisal.AppraisalSubmission',
]:
    pre_save.connect(_capture_old_status, sender=_sender_label, weak=False)


# ── Task events ────────────────────────────────────────────────────────────
@receiver(post_save, sender='task_management.TaskAssignment')
def on_task_assignment(sender, instance, created, **kwargs):
    if created:
        # Notify the assignee they have a new task
        _notify(
            recipient=instance.assignee,
            category=Notification.Category.TASK,
            verb=f'You were assigned a task: "{instance.task.title}"',
            target_url=f'/tasks/{instance.task_id}',
        )
    else:
        # Notify the assigner when the assignee responds
        old_status = getattr(instance, '_pre_save_status', None)
        if old_status and old_status != instance.status:
            label_map = {
                'ACCEPTED':  'accepted',
                'COMPLETED': 'completed',
                'DECLINED':  'declined',
            }
            label = label_map.get(instance.status)
            if label and instance.assigned_by:
                _notify(
                    recipient=instance.assigned_by,
                    category=Notification.Category.TASK,
                    verb=f'{instance.assignee.get_full_name()} {label} task: "{instance.task.title}"',
                    target_url=f'/tasks/{instance.task_id}',
                )


# ── Handling verification events ───────────────────────────────────────────
@receiver(post_save, sender='kgaps_handling.HandlingVerification')
def on_handling_verification(sender, instance, created, **kwargs):
    if created:
        return
    old_status = getattr(instance, '_pre_save_status', None)
    if old_status and old_status != instance.status and instance.status in ('APPROVED', 'REJECTED'):
        faculty = instance.handling.faculty
        verb = (
            f'Your handling for "{instance.handling.topic.title}" was {instance.status.lower()}'
        )
        _notify(
            recipient=faculty,
            category=Notification.Category.HANDLING,
            verb=verb,
            target_url='/kgaps/handling',
        )


# ── Swap request events ────────────────────────────────────────────────────
@receiver(post_save, sender='scheduler.SwapRequest')
def on_swap_request(sender, instance, created, **kwargs):
    if created:
        # Notify target faculty of incoming swap request
        _notify(
            recipient=instance.target_faculty,
            category=Notification.Category.SWAP,
            verb=f'{instance.requester.get_full_name()} requested a swap with you on {instance.swap_date}',
            target_url='/scheduler/requests',
        )
    else:
        old_status = getattr(instance, '_pre_save_status', None)
        if old_status and old_status != instance.status and instance.status in ('APPROVED', 'REJECTED'):
            # Notify the requester of the outcome
            _notify(
                recipient=instance.requester,
                category=Notification.Category.SWAP,
                verb=f'Your swap request for {instance.swap_date} was {instance.status.lower()}',
                target_url='/scheduler/requests',
            )


# ── Extra class events ─────────────────────────────────────────────────────
@receiver(post_save, sender='scheduler.ExtraClass')
def on_extra_class(sender, instance, created, **kwargs):
    if created:
        return
    old_status = getattr(instance, '_pre_save_status', None)
    if old_status and old_status != instance.status and instance.status in ('APPROVED', 'REJECTED'):
        _notify(
            recipient=instance.faculty,
            category=Notification.Category.EXTRA_CLASS,
            verb=f'Your extra class request on {instance.proposed_date} was {instance.status.lower()}',
            target_url='/scheduler/requests',
        )


# ── Appraisal events ───────────────────────────────────────────────────────
@receiver(post_save, sender='faculty_appraisal.AppraisalSubmission')
def on_appraisal_submission(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_pre_save_status', None)
    new_status = instance.status

    if old_status == new_status:
        return

    if new_status == 'HOD_REVIEW':
        # Notify faculty their appraisal moved to HOD review
        _notify(
            recipient=instance.faculty,
            category=Notification.Category.APPRAISAL,
            verb=f'Your appraisal "{instance.template.title}" is now under HOD review',
            target_url=f'/appraisal/submissions/{instance.id}',
        )
    elif new_status == 'COMPLETED':
        _notify(
            recipient=instance.faculty,
            category=Notification.Category.APPRAISAL,
            verb=f'Your appraisal "{instance.template.title}" has been completed',
            target_url=f'/appraisal/submissions/{instance.id}',
        )
