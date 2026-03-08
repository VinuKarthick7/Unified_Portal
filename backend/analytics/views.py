"""
analytics/views.py
Cross-module aggregation endpoints (Phase 3 — Dashboard integrations).
"""
from datetime import date
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrHOD


# ── helpers ───────────────────────────────────────────────────────────────────
DAY_MAP = {0: 'MON', 1: 'TUE', 2: 'WED', 3: 'THU', 4: 'FRI', 5: 'SAT', 6: 'SUN'}


# ─────────────────────────────────────────────────────────────────────────────
# 1.  Dashboard stats  (role-aware counts)
# ─────────────────────────────────────────────────────────────────────────────
class DashboardStatsView(APIView):
    """
    GET /api/analytics/stats/
    Returns a flat dict of counts relevant to the user's role.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from task_management.models import Task, TaskAssignment
        from kgaps_handling.models import TopicHandling, HandlingVerification
        from scheduler.models import SwapRequest, ExtraClass
        from faculty_appraisal.models import AppraisalSubmission
        from courses.models import CourseAssignment
        from django.db.models import Q

        user = request.user
        today = date.today()
        data = {}

        if user.role == 'FACULTY':
            my_assignments = TaskAssignment.objects.filter(assignee=user)
            data['tasks_pending']   = my_assignments.filter(status='PENDING').count()
            data['tasks_accepted']  = my_assignments.filter(status='ACCEPTED').count()
            data['tasks_overdue']   = Task.objects.filter(
                assignments__assignee=user,
                due_date__lt=today,
            ).exclude(status__in=['COMPLETED', 'CANCELLED']).distinct().count()

            data['handling_pending_review'] = HandlingVerification.objects.filter(
                handling__faculty=user, status='PENDING'
            ).count()
            data['handling_approved_today'] = HandlingVerification.objects.filter(
                handling__faculty=user, handling__date=today, status='APPROVED',
            ).count()

            data['swap_requests_pending'] = SwapRequest.objects.filter(
                requester=user, status='PENDING'
            ).count()
            data['extra_classes_pending'] = ExtraClass.objects.filter(
                faculty=user, status='PENDING'
            ).count()

            data['appraisals_draft']     = AppraisalSubmission.objects.filter(faculty=user, status='DRAFT').count()
            data['appraisals_submitted'] = AppraisalSubmission.objects.filter(faculty=user, status='SUBMITTED').count()
            data['appraisals_completed'] = AppraisalSubmission.objects.filter(faculty=user, status='COMPLETED').count()
            data['courses_assigned']     = CourseAssignment.objects.filter(faculty=user).count()

        elif user.role in ('HOD', 'ADMIN', 'COORDINATOR'):
            dept = user.department if user.role in ('HOD', 'COORDINATOR') else None

            task_qs = Task.objects.all()
            if dept:
                task_qs = task_qs.filter(
                    Q(department=dept) | Q(assignments__assignee=user)
                ).distinct()
            data['tasks_open']        = task_qs.filter(status='OPEN').count()
            data['tasks_in_progress'] = task_qs.filter(status='IN_PROGRESS').count()
            data['tasks_overdue']     = task_qs.filter(
                due_date__lt=today
            ).exclude(status__in=['COMPLETED', 'CANCELLED']).count()

            hv_qs = HandlingVerification.objects.filter(status='PENDING')
            if dept:
                hv_qs = hv_qs.filter(handling__faculty__department=dept)
            data['handling_pending_review'] = hv_qs.count()

            swap_qs  = SwapRequest.objects.filter(status='PENDING')
            extra_qs = ExtraClass.objects.filter(status='PENDING')
            if dept:
                swap_qs  = swap_qs.filter(requester__department=dept)
                extra_qs = extra_qs.filter(faculty__department=dept)
            data['swap_requests_pending'] = swap_qs.count()
            data['extra_classes_pending'] = extra_qs.count()

            ap_qs = AppraisalSubmission.objects.all()
            if dept:
                ap_qs = ap_qs.filter(faculty__department=dept)
            data['appraisals_submitted']   = ap_qs.filter(status='SUBMITTED').count()
            data['appraisals_hod_review']  = ap_qs.filter(status='HOD_REVIEW').count()
            data['appraisals_completed']   = ap_qs.filter(status='COMPLETED').count()
            data['appraisals_need_action'] = ap_qs.filter(
                status__in=['SUBMITTED', 'HOD_REVIEW']
            ).count()

        return Response(data)


# ─────────────────────────────────────────────────────────────────────────────
# 2.  HOD Unified Inbox
# ─────────────────────────────────────────────────────────────────────────────
class HODInboxView(APIView):
    """
    GET /api/analytics/hod-inbox/
    Returns all action items pending HOD attention, grouped by category.
    HOD/Admin only.
    """
    permission_classes = [IsAuthenticated, IsAdminOrHOD]

    def get(self, request):
        from scheduler.models import SwapRequest, ExtraClass
        from kgaps_handling.models import HandlingVerification
        from faculty_appraisal.models import AppraisalSubmission
        from task_management.models import Task
        from django.db.models import Q

        user = request.user
        dept = user.department if user.role == 'HOD' else None

        # Handling Verifications
        hv_qs = HandlingVerification.objects.filter(
            status='PENDING'
        ).select_related('handling__faculty', 'handling__topic__unit__course')
        if dept:
            hv_qs = hv_qs.filter(handling__faculty__department=dept)

        handling_items = [
            {
                'type': 'handling_verification',
                'id': hv.id,
                'title': f"{hv.handling.faculty.get_full_name()} — {hv.handling.topic.title}",
                'sub': f"{hv.handling.topic.unit.course.code} · {hv.handling.date}",
                'url': '/kgaps/handling/verify',
                'date': hv.handling.date.isoformat() if hv.handling.date else None,
            }
            for hv in hv_qs[:30]
        ]

        # Swap Requests
        swap_qs = SwapRequest.objects.filter(
            status='PENDING'
        ).select_related('requester', 'target_faculty', 'original_slot__period')
        if dept:
            swap_qs = swap_qs.filter(requester__department=dept)

        swap_items = [
            {
                'type': 'swap_request',
                'id': sw.id,
                'title': f"{sw.requester.get_full_name()} → {sw.target_faculty.get_full_name()}",
                'sub': f"Swap on {sw.swap_date}",
                'url': '/scheduler/requests',
                'date': sw.swap_date.isoformat(),
            }
            for sw in swap_qs[:20]
        ]

        # Extra Classes
        extra_qs = ExtraClass.objects.filter(
            status='PENDING'
        ).select_related('faculty', 'topic__unit__course')
        if dept:
            extra_qs = extra_qs.filter(faculty__department=dept)

        extra_items = [
            {
                'type': 'extra_class',
                'id': ex.id,
                'title': f"{ex.faculty.get_full_name()} — {ex.topic.title}",
                'sub': f"{ex.topic.unit.course.code} · {ex.proposed_date}",
                'url': '/scheduler/requests',
                'date': ex.proposed_date.isoformat(),
            }
            for ex in extra_qs[:20]
        ]

        # Appraisal Submissions needing action
        ap_qs = AppraisalSubmission.objects.filter(
            status__in=['SUBMITTED', 'HOD_REVIEW']
        ).select_related('faculty', 'template')
        if dept:
            ap_qs = ap_qs.filter(faculty__department=dept)

        appraisal_items = [
            {
                'type': 'appraisal',
                'id': ap.id,
                'title': f"{ap.faculty.get_full_name()} — {ap.template.title}",
                'sub': f"Status: {ap.status.replace('_', ' ')}",
                'url': f'/appraisal/submissions/{ap.id}',
                'date': ap.submitted_at.date().isoformat() if ap.submitted_at else None,
            }
            for ap in ap_qs[:20]
        ]

        # Overdue Tasks
        task_qs = Task.objects.filter(status__in=['OPEN', 'IN_PROGRESS'])
        if dept:
            task_qs = task_qs.filter(Q(department=dept))
        overdue_tasks = [
            {
                'type': 'task',
                'id': t.id,
                'title': t.title,
                'sub': f"Priority: {t.priority} · Due: {t.due_date}",
                'url': f'/tasks/{t.id}',
                'date': t.due_date.isoformat() if t.due_date else None,
            }
            for t in task_qs.filter(due_date__lt=timezone.now().date()).order_by('due_date')[:10]
        ]

        total = len(handling_items) + len(swap_items) + len(extra_items) + len(appraisal_items) + len(overdue_tasks)
        return Response({
            'counts': {
                'handling_verification': len(handling_items),
                'swap_requests': len(swap_items),
                'extra_classes': len(extra_items),
                'appraisals': len(appraisal_items),
                'overdue_tasks': len(overdue_tasks),
                'total': total,
            },
            'items': {
                'handling_verifications': handling_items,
                'swap_requests': swap_items,
                'extra_classes': extra_items,
                'appraisals': appraisal_items,
                'overdue_tasks': overdue_tasks,
            },
        })


# ─────────────────────────────────────────────────────────────────────────────
# 3.  Faculty My Day
# ─────────────────────────────────────────────────────────────────────────────
class FacultyMyDayView(APIView):
    """
    GET /api/analytics/my-day/
    Returns today's schedule, pending tasks & handling summary for the faculty.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from scheduler.models import TimetableSlot, DailyEntry, SwapRequest
        from task_management.models import TaskAssignment
        from kgaps_handling.models import HandlingVerification

        user = request.user
        today = date.today()
        today_day = DAY_MAP.get(today.weekday(), 'MON')

        # Today's timetable slots
        slots = TimetableSlot.objects.filter(
            timetable__course_assignment__faculty=user,
            day_of_week=today_day,
            timetable__is_active=True,
        ).select_related(
            'period', 'timetable__course_assignment__course',
        ).order_by('period__order')

        today_slots = [
            {
                'slot_id': s.id,
                'period': s.period.name,
                'period_start': s.period.start_time.strftime('%H:%M'),
                'period_end': s.period.end_time.strftime('%H:%M'),
                'course_code': s.timetable.course_assignment.course.code,
                'course_name': s.timetable.course_assignment.course.name,
                'room': s.room,
                'assignment_id': s.timetable.course_assignment_id,
            }
            for s in slots
        ]

        # Daily entries already logged today
        logged_today = list(DailyEntry.objects.filter(
            faculty=user, date=today
        ).select_related('topic__unit__course').values(
            'id', 'course_assignment_id', 'topic__title',
            'topic__unit__course__code', 'hours_conducted', 'is_extra_class',
        ))

        # Pending task assignments
        pending_tasks = TaskAssignment.objects.filter(
            assignee=user, status__in=['PENDING', 'ACCEPTED']
        ).select_related('task').order_by('task__due_date')[:10]

        task_items = [
            {
                'assignment_id': ta.id,
                'task_id': ta.task_id,
                'task_title': ta.task.title,
                'priority': ta.task.priority,
                'status': ta.status,
                'due_date': ta.task.due_date.isoformat() if ta.task.due_date else None,
                'is_overdue': bool(ta.task.due_date and ta.task.due_date < today),
            }
            for ta in pending_tasks
        ]

        # Handling entries pending HOD approval
        pending_handling = HandlingVerification.objects.filter(
            handling__faculty=user, status='PENDING'
        ).select_related('handling__topic__unit__course').order_by('-handling__date')[:10]

        handling_items = [
            {
                'verification_id': hv.id,
                'topic': hv.handling.topic.title,
                'course_code': hv.handling.topic.unit.course.code,
                'date': hv.handling.date.isoformat(),
                'hours': float(hv.handling.hours_handled),
            }
            for hv in pending_handling
        ]

        # Upcoming swap requests
        upcoming_swaps = SwapRequest.objects.filter(
            requester=user, status='PENDING', swap_date__gte=today
        ).select_related('target_faculty', 'original_slot__period').order_by('swap_date')[:5]

        swap_items = [
            {
                'id': sw.id,
                'target': sw.target_faculty.get_full_name(),
                'date': sw.swap_date.isoformat(),
                'period': sw.original_slot.period.name,
            }
            for sw in upcoming_swaps
        ]

        return Response({
            'today_date': today.isoformat(),
            'today_day': today_day,
            'today_slots': today_slots,
            'logged_today': logged_today,
            'pending_tasks': task_items,
            'pending_handling': handling_items,
            'upcoming_swaps': swap_items,
            'summary': {
                'slots_today': len(today_slots),
                'entries_logged': len(logged_today),
                'tasks_pending': len([t for t in task_items if t['status'] == 'PENDING']),
                'tasks_accepted': len([t for t in task_items if t['status'] == 'ACCEPTED']),
                'handling_awaiting_approval': len(handling_items),
            },
        })


# ─────────────────────────────────────────────────────────────────────────────
# 4.  Module Summary (Analytics page header KPIs)
# ─────────────────────────────────────────────────────────────────────────────
class ModuleSummaryView(APIView):
    """
    GET /api/analytics/summary/
    High-level platform counts for the Analytics page hero strip.
    Admin/HOD sees everything; Faculty sees their own slice.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from task_management.models import Task, TaskAssignment
        from kgaps_handling.models import TopicHandling, HandlingVerification
        from scheduler.models import SwapRequest, ExtraClass
        from faculty_appraisal.models import AppraisalSubmission
        from accounts.models import User
        from django.db.models import Sum

        user = request.user
        dept = user.department if user.role in ('HOD', 'COORDINATOR') else None
        is_faculty = user.role == 'FACULTY'

        if is_faculty:
            handling_qs = TopicHandling.objects.filter(faculty=user)
            task_qs     = TaskAssignment.objects.filter(assignee=user)
            ap_qs       = AppraisalSubmission.objects.filter(faculty=user)
        else:
            handling_qs = TopicHandling.objects.all()
            task_qs     = Task.objects.all()
            ap_qs       = AppraisalSubmission.objects.all()
            if dept:
                handling_qs = handling_qs.filter(faculty__department=dept)
                task_qs     = task_qs.filter(department=dept)
                ap_qs       = ap_qs.filter(faculty__department=dept)

        total_hours = handling_qs.aggregate(h=Sum('hours_handled'))['h'] or 0

        if is_faculty:
            tasks_total     = task_qs.count()
            tasks_completed = task_qs.filter(status__in=['ACCEPTED', 'SUBMITTED']).count()
        else:
            tasks_total     = task_qs.count()
            tasks_completed = task_qs.filter(status='COMPLETED').count()

        faculty_count = (
            User.objects.filter(role='FACULTY').filter(department=dept).count()
            if dept else
            User.objects.filter(role='FACULTY').count()
        )

        from departments.models import Department
        dept_count = 1 if dept else Department.objects.count()

        return Response({
            'total_handling_hours': float(total_hours),
            'tasks_total': tasks_total,
            'tasks_completed': tasks_completed,
            'appraisals_total': ap_qs.count(),
            'appraisals_completed': ap_qs.filter(status='COMPLETED').count(),
            'faculty_count': faculty_count,
            'departments': dept_count,
        })


# ─────────────────────────────────────────────────────────────────────────────
# 5.  Task Analytics  (status/priority distribution + dept breakdown)
# ─────────────────────────────────────────────────────────────────────────────
class TaskAnalyticsView(APIView):
    """
    GET /api/analytics/tasks/
    Returns data suitable for Recharts bar/pie charts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from task_management.models import Task, TaskAssignment
        from departments.models import Department
        from django.db.models import Count, Q

        user = request.user
        today = date.today()
        dept  = user.department if user.role in ('HOD', 'COORDINATOR') else None

        if user.role == 'FACULTY':
            base = TaskAssignment.objects.filter(assignee=user)
            status_dist = list(
                base.values('status').annotate(count=Count('id'))
            )
            # Map assignment status → friendly labels
            STATUS_LABEL = {
                'PENDING': 'Pending', 'ACCEPTED': 'Accepted',
                'SUBMITTED': 'Submitted', 'REJECTED': 'Rejected',
            }
            status_data = [
                {'name': STATUS_LABEL.get(r['status'], r['status']), 'value': r['count']}
                for r in status_dist
            ]
            priority_data = list(
                base.values('task__priority').annotate(count=Count('id'))
                .values_list('task__priority', 'count')
            )
            priority_data = [{'name': p, 'value': c} for p, c in priority_data]
            dept_data = []
        else:
            task_qs = Task.objects.all()
            if dept:
                task_qs = task_qs.filter(department=dept)

            status_dist = list(task_qs.values('status').annotate(count=Count('id')))
            STATUS_LABEL = {
                'OPEN': 'Open', 'IN_PROGRESS': 'In Progress',
                'COMPLETED': 'Completed', 'CANCELLED': 'Cancelled',
            }
            status_data = [
                {'name': STATUS_LABEL.get(r['status'], r['status']), 'value': r['count']}
                for r in status_dist
            ]

            priority_dist = list(task_qs.values('priority').annotate(count=Count('id')))
            priority_data = [{'name': r['priority'], 'value': r['count']} for r in priority_dist]

            # Per-department task counts
            dept_data = []
            dept_qs = Department.objects.all() if not dept else Department.objects.filter(id=dept.id)
            for d in dept_qs:
                tq = Task.objects.filter(department=d)
                dept_data.append({
                    'dept': d.code,
                    'open': tq.filter(status='OPEN').count(),
                    'in_progress': tq.filter(status='IN_PROGRESS').count(),
                    'completed': tq.filter(status='COMPLETED').count(),
                    'overdue': tq.filter(due_date__lt=today).exclude(status__in=['COMPLETED','CANCELLED']).count(),
                })

        return Response({
            'status_distribution': status_data,
            'priority_distribution': priority_data,
            'dept_breakdown': dept_data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# 6.  Workload Trend  (monthly teaching hours, last 6 months)
# ─────────────────────────────────────────────────────────────────────────────
class WorkloadTrendView(APIView):
    """
    GET /api/analytics/workload/
    Monthly teaching hours (TopicHandling) for last 6 months.
    Faculty sees own data; HOD/Admin sees dept or global totals.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from kgaps_handling.models import TopicHandling
        from django.db.models import Sum
        from django.db.models.functions import TruncMonth

        def month_offset(base_date, n):
            """Return first day of the month n months before base_date (n≥0)."""
            total_months = base_date.year * 12 + (base_date.month - 1) - n
            y, m = divmod(total_months, 12)
            return base_date.replace(year=y, month=m + 1, day=1)

        user = request.user
        dept = user.department if user.role in ('HOD', 'COORDINATOR') else None
        today = date.today()
        six_months_ago = month_offset(today, 5)

        qs = TopicHandling.objects.filter(date__gte=six_months_ago)
        if user.role == 'FACULTY':
            qs = qs.filter(faculty=user)
        elif dept:
            qs = qs.filter(faculty__department=dept)

        rows = (
            qs.annotate(month=TruncMonth('date'))
              .values('month')
              .annotate(hours=Sum('hours_handled'))
              .order_by('month')
        )

        # Build full 6-month list (fill zeros for months with no data)
        data_map = {r['month'].strftime('%b %Y'): float(r['hours'] or 0) for r in rows}
        result = []
        for i in range(6):
            m_date = month_offset(today, 5 - i)
            label = m_date.strftime('%b %Y')
            result.append({'month': label, 'hours': data_map.get(label, 0)})

        return Response({'trend': result})


# ─────────────────────────────────────────────────────────────────────────────
# 7.  Department Overview  (HOD/Admin only)
# ─────────────────────────────────────────────────────────────────────────────
class DepartmentOverviewView(APIView):
    """
    GET /api/analytics/departments/
    Per-department scorecard: faculty count, handling hours, task stats, appraisals.
    Admin sees all departments; HOD sees only own.
    """
    permission_classes = [IsAuthenticated, IsAdminOrHOD]

    def get(self, request):
        from departments.models import Department
        from accounts.models import User
        from task_management.models import Task
        from kgaps_handling.models import TopicHandling
        from faculty_appraisal.models import AppraisalSubmission
        from django.db.models import Sum, Count

        user = request.user
        dept_qs = Department.objects.all()
        if user.role == 'HOD' and user.department:
            dept_qs = dept_qs.filter(id=user.department.id)

        result = []
        today = date.today()

        for d in dept_qs:
            fac_ids = User.objects.filter(role='FACULTY', department=d).values_list('id', flat=True)
            faculty_count = len(fac_ids)
            total_hours   = TopicHandling.objects.filter(faculty__in=fac_ids).aggregate(h=Sum('hours_handled'))['h'] or 0
            task_total     = Task.objects.filter(department=d).count()
            task_completed = Task.objects.filter(department=d, status='COMPLETED').count()
            task_overdue   = Task.objects.filter(department=d, due_date__lt=today).exclude(status__in=['COMPLETED','CANCELLED']).count()
            ap_completed   = AppraisalSubmission.objects.filter(faculty__in=fac_ids, status='COMPLETED').count()
            ap_total       = AppraisalSubmission.objects.filter(faculty__in=fac_ids).count()

            result.append({
                'dept_id':        d.id,
                'dept_name':      d.name,
                'dept_code':      d.code,
                'faculty_count':  faculty_count,
                'handling_hours': float(total_hours),
                'tasks_total':    task_total,
                'tasks_completed':task_completed,
                'tasks_overdue':  task_overdue,
                'appraisals_done':ap_completed,
                'appraisals_total':ap_total,
            })

        return Response({'departments': result})
