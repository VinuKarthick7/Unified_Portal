"""
notifications/signals.py
Auto-generate Notification records on key model state changes.
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Notification


def _notify(recipient, category, verb, target_url=''):
    Notification.objects.create(
        recipient=recipient,
        category=category,
        verb=verb,
        target_url=target_url,
    )


def _capture_old_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._pre_save_status = None
        return
    try:
        instance._pre_save_status = sender.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
    except Exception:
        instance._pre_save_status = None


for _sender_label in [
    'task_management.TaskAssignment',
    'kgaps_handling.HandlingVerification',
    'kgaps_creation.MaterialVerification',
    'scheduler.SwapRequest',
    'scheduler.ExtraClass',
    'faculty_appraisal.AppraisalSubmission',
]:
    pre_save.connect(_capture_old_status, sender=_sender_label, weak=False)


@receiver(post_save, sender='task_management.TaskAssignment')
def on_task_assignment(sender, instance, created, **kwargs):
    if created:
        _notify(
            recipient=instance.assignee,
            category=Notification.Category.TASK,
            verb=f'You were assigned a task: "{instance.task.title}"',
            target_url=f'/tasks/{instance.task_id}',
        )
        return

    old_status = getattr(instance, '_pre_save_status', None)
    if old_status and old_status != instance.status:
        label_map = {
            'ACCEPTED': 'accepted',
            'COMPLETED': 'completed',
            'DECLINED': 'declined',
        }
        label = label_map.get(instance.status)
        if label and instance.assigned_by:
            _notify(
                recipient=instance.assigned_by,
                category=Notification.Category.TASK,
                verb=f'{instance.assignee.get_full_name()} {label} task: "{instance.task.title}"',
                target_url=f'/tasks/{instance.task_id}',
            )


@receiver(post_save, sender='kgaps_handling.HandlingVerification')
def on_handling_verification(sender, instance, created, **kwargs):
    if created:
        return
    old_status = getattr(instance, '_pre_save_status', None)
    if old_status and old_status != instance.status and instance.status in ('APPROVED', 'REJECTED'):
        _notify(
            recipient=instance.handling.faculty,
            category=Notification.Category.HANDLING,
            verb=f'Your handling for "{instance.handling.topic.topic_title}" was {instance.status.lower()}',
            target_url='/kgaps/handling',
        )


@receiver(post_save, sender='kgaps_creation.MaterialVerification')
def on_material_verification(sender, instance, created, **kwargs):
    if created:
        return
    old_status = getattr(instance, '_pre_save_status', None)
    if old_status and old_status != instance.status and instance.status in ('APPROVED', 'REJECTED'):
        uploader = instance.material.uploaded_by
        if not uploader:
            return
        material_type = instance.material.get_material_type_display()
        topic_title = instance.material.topic.topic_title
        _notify(
            recipient=uploader,
            category=Notification.Category.SYSTEM,
            verb=f'Your {material_type} for "{topic_title}" was {instance.status.lower()}',
            target_url='/kgaps/creation',
        )


@receiver(post_save, sender='kgaps_creation.Material')
def on_material_uploaded(sender, instance, created, **kwargs):
    if not created:
        return
    topic = instance.topic
    mentor = topic.unit.course.domain.mentor if topic.unit.course.domain else None
    if mentor:
        _notify(
            recipient=mentor,
            category=Notification.Category.SYSTEM,
            verb=(
                f'{instance.uploaded_by.get_full_name()} uploaded {instance.get_material_type_display()} '
                f'for "{topic.topic_title}" (pending verification)'
            ),
            target_url='/kgaps/verification',
        )


@receiver(post_save, sender='kgaps_creation.TopicAssignment')
def on_topic_assignment(sender, instance, created, **kwargs):
    if not created:
        return
    _notify(
        recipient=instance.faculty,
        category=Notification.Category.SYSTEM,
        verb=f'You were assigned topic "{instance.topic.topic_title}" for material upload',
        target_url='/kgaps/creation',
    )


@receiver(post_save, sender='scheduler.SwapRequest')
def on_swap_request(sender, instance, created, **kwargs):
    if created:
        _notify(
            recipient=instance.target_faculty,
            category=Notification.Category.SWAP,
            verb=f'{instance.requester.get_full_name()} requested a swap with you on {instance.swap_date}',
            target_url='/scheduler/requests',
        )
        return

    old_status = getattr(instance, '_pre_save_status', None)
    if old_status and old_status != instance.status and instance.status in ('APPROVED', 'REJECTED'):
        _notify(
            recipient=instance.requester,
            category=Notification.Category.SWAP,
            verb=f'Your swap request for {instance.swap_date} was {instance.status.lower()}',
            target_url='/scheduler/requests',
        )


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


@receiver(post_save, sender='faculty_appraisal.AppraisalSubmission')
def on_appraisal_submission(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_pre_save_status', None)
    new_status = instance.status

    if old_status == new_status:
        return

    if new_status == 'HOD_REVIEW':
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
