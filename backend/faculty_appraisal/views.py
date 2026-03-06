from django.db.models import Count, Q
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminOrHOD
from .models import AppraisalTemplate, AppraisalCriteria, AppraisalSubmission, CriteriaScore
from .serializers import (
    AppraisalTemplateListSerializer, AppraisalTemplateSerializer,
    AppraisalTemplateWriteSerializer, AppraisalCriteriaSerializer,
    AppraisalSubmissionListSerializer, AppraisalSubmissionSerializer,
    CriteriaScoreSerializer, CriteriaScoreSelfUpdateSerializer,
    CriteriaScoreHODUpdateSerializer,
)


# --------------------------------------------------------------------------- #
# Templates
# --------------------------------------------------------------------------- #
class AppraisalTemplateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AppraisalTemplateWriteSerializer
        return AppraisalTemplateListSerializer

    def get_queryset(self):
        user = self.request.user
        qs   = AppraisalTemplate.objects.select_related('department', 'created_by')
        if user.role in ('ADMIN', 'HOD'):
            if user.role == 'HOD' and user.department_id:
                qs = qs.filter(
                    Q(department=user.department) | Q(department__isnull=True)
                )
        else:
            # Faculty: only active + applicable
            qs = qs.filter(is_active=True)
            if user.department_id:
                qs = qs.filter(Q(department=user.department) | Q(department__isnull=True))
        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ('ADMIN', 'HOD'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only HOD/Admin can create templates.')
        serializer.save(created_by=self.request.user)


class AppraisalTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AppraisalTemplate.objects.select_related('department', 'created_by').prefetch_related('criteria')

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AppraisalTemplateWriteSerializer
        return AppraisalTemplateSerializer

    def update(self, request, *args, **kwargs):
        if request.user.role not in ('ADMIN', 'HOD'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only HOD/Admin can edit templates.')
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if request.user.role not in ('ADMIN', 'HOD'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only HOD/Admin can delete templates.')
        return super().destroy(request, *args, **kwargs)


# --------------------------------------------------------------------------- #
# Criteria (nested under template)
# --------------------------------------------------------------------------- #
class AppraisalCriteriaListCreateView(generics.ListCreateAPIView):
    serializer_class   = AppraisalCriteriaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHOD]

    def get_queryset(self):
        return AppraisalCriteria.objects.filter(template_id=self.kwargs['template_pk'])

    def perform_create(self, serializer):
        template = AppraisalTemplate.objects.get(pk=self.kwargs['template_pk'])
        serializer.save(template=template)


class AppraisalCriteriaDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = AppraisalCriteriaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHOD]

    def get_queryset(self):
        return AppraisalCriteria.objects.filter(template_id=self.kwargs['template_pk'])


# --------------------------------------------------------------------------- #
# Submissions
# --------------------------------------------------------------------------- #
class AppraisalSubmissionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return AppraisalSubmissionListSerializer

    def get_queryset(self):
        user = self.request.user
        qs   = AppraisalSubmission.objects.select_related('template', 'faculty').prefetch_related('scores')
        if user.role == 'ADMIN':
            pass
        elif user.role == 'HOD':
            if user.department_id:
                qs = qs.filter(faculty__department=user.department)
        else:
            qs = qs.filter(faculty=user)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        template_filter = self.request.query_params.get('template')
        if template_filter:
            qs = qs.filter(template_id=template_filter)
        return qs

    def create(self, request, *args, **kwargs):
        """Faculty starts a submission for a template; auto-creates CriteriaScore rows."""
        template_id = request.data.get('template')
        if not template_id:
            return Response({'template': 'Required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            template = AppraisalTemplate.objects.prefetch_related('criteria').get(pk=template_id)
        except AppraisalTemplate.DoesNotExist:
            return Response({'template': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        submission, created = AppraisalSubmission.objects.get_or_create(
            template=template, faculty=request.user
        )
        if created:
            # Auto-create one CriteriaScore per criterion
            for criteria in template.criteria.all():
                CriteriaScore.objects.get_or_create(submission=submission, criteria=criteria)

        serializer = AppraisalSubmissionSerializer(submission, context={'request': request})
        st = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=st)


class AppraisalSubmissionDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = AppraisalSubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = AppraisalSubmission.objects.select_related(
            'template', 'faculty', 'reviewed_by'
        ).prefetch_related('scores__criteria', 'template__criteria')
        if user.role == 'ADMIN':
            return qs
        if user.role == 'HOD' and user.department_id:
            return qs.filter(faculty__department=user.department)
        return qs.filter(faculty=user)


class AppraisalSubmissionSelfUpdateView(generics.UpdateAPIView):
    """Faculty updates self_remarks and score rows (draft / before submission)."""
    permission_classes = [IsAuthenticated]
    serializer_class   = AppraisalSubmissionSerializer
    http_method_names  = ['patch']

    def get_queryset(self):
        return AppraisalSubmission.objects.filter(faculty=self.request.user, status=AppraisalSubmission.STATUS_DRAFT)

    def partial_update(self, request, *args, **kwargs):
        submission = self.get_object()
        self_remarks = request.data.get('self_remarks')
        if self_remarks is not None:
            submission.self_remarks = self_remarks
            submission.save(update_fields=['self_remarks', 'updated_at'])

        scores_data = request.data.get('scores', [])
        for s in scores_data:
            try:
                score = submission.scores.get(pk=s['id'])
            except (CriteriaScore.DoesNotExist, KeyError):
                continue
            ser = CriteriaScoreSelfUpdateSerializer(score, data=s, partial=True)
            if ser.is_valid():
                ser.save()

        full = AppraisalSubmissionSerializer(
            self.get_queryset().get(pk=submission.pk), context={'request': request}
        )
        return Response(full.data)


class AppraisalSubmissionActionView(APIView):
    """
    POST /submissions/:id/submit/   → faculty submits (DRAFT → SUBMITTED)
    POST /submissions/:id/review/   → HOD marks reviewed (SUBMITTED → COMPLETED), saves hod scores
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        try:
            submission = AppraisalSubmission.objects.prefetch_related('scores__criteria').get(pk=pk)
        except AppraisalSubmission.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'submit':
            if submission.faculty != request.user:
                return Response({'detail': 'Not your submission.'}, status=status.HTTP_403_FORBIDDEN)
            if submission.status != AppraisalSubmission.STATUS_DRAFT:
                return Response({'detail': 'Only draft submissions can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
            submission.status       = AppraisalSubmission.STATUS_SUBMITTED
            submission.submitted_at = timezone.now()
            submission.save(update_fields=['status', 'submitted_at', 'updated_at'])

        elif action == 'review':
            # Pass 1: SUBMITTED → HOD_REVIEW (save HOD draft scores/remarks, do not finalise)
            if request.user.role not in ('ADMIN', 'HOD'):
                return Response({'detail': 'HOD/Admin only.'}, status=status.HTTP_403_FORBIDDEN)
            if submission.status != AppraisalSubmission.STATUS_SUBMITTED:
                return Response(
                    {'detail': 'Only SUBMITTED submissions can be moved to HOD review.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            hod_remarks = request.data.get('hod_remarks')
            if hod_remarks is not None:
                submission.hod_remarks = hod_remarks

            for s in request.data.get('scores', []):
                try:
                    score = submission.scores.get(pk=s['id'])
                except (CriteriaScore.DoesNotExist, KeyError):
                    continue
                ser = CriteriaScoreHODUpdateSerializer(score, data=s, partial=True)
                if ser.is_valid():
                    ser.save()

            submission.status      = AppraisalSubmission.STATUS_HOD_REVIEW
            submission.reviewed_by = request.user
            submission.save(update_fields=['status', 'hod_remarks', 'reviewed_by', 'updated_at'])

        elif action == 'finalise':
            # Pass 2: HOD_REVIEW → COMPLETED (confirm and lock)
            if request.user.role not in ('ADMIN', 'HOD'):
                return Response({'detail': 'HOD/Admin only.'}, status=status.HTTP_403_FORBIDDEN)
            if submission.status != AppraisalSubmission.STATUS_HOD_REVIEW:
                return Response(
                    {'detail': 'Only HOD_REVIEW submissions can be finalised.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Allow last-minute remarks/score updates before finalising
            hod_remarks = request.data.get('hod_remarks')
            if hod_remarks is not None:
                submission.hod_remarks = hod_remarks

            for s in request.data.get('scores', []):
                try:
                    score = submission.scores.get(pk=s['id'])
                except (CriteriaScore.DoesNotExist, KeyError):
                    continue
                ser = CriteriaScoreHODUpdateSerializer(score, data=s, partial=True)
                if ser.is_valid():
                    ser.save()

            submission.status      = AppraisalSubmission.STATUS_COMPLETED
            submission.reviewed_at = timezone.now()
            submission.reviewed_by = request.user
            submission.save(update_fields=['status', 'hod_remarks', 'reviewed_at', 'reviewed_by', 'updated_at'])
        else:
            return Response({'detail': 'Invalid action. Use submit, review, or finalise.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AppraisalSubmissionSerializer(submission, context={'request': request})
        return Response(serializer.data)


# --------------------------------------------------------------------------- #
# Stats
# --------------------------------------------------------------------------- #
class AppraisalStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = self.request.user
        qs   = AppraisalSubmission.objects.all()

        if user.role == 'ADMIN':
            pass
        elif user.role == 'HOD' and user.department_id:
            qs = qs.filter(faculty__department=user.department)
        else:
            qs = qs.filter(faculty=user)

        counts = qs.values('status').annotate(n=Count('id'))
        result = {c['status']: c['n'] for c in counts}
        result.setdefault('DRAFT', 0)
        result.setdefault('SUBMITTED', 0)
        result.setdefault('HOD_REVIEW', 0)
        result.setdefault('COMPLETED', 0)
        result['total'] = qs.count()
        result['active_templates'] = AppraisalTemplate.objects.filter(is_active=True).count()
        return Response(result)


# --------------------------------------------------------------------------- #
# PDF Report
# --------------------------------------------------------------------------- #
class AppraisalReportView(APIView):
    """
    GET /api/appraisal/submissions/<id>/report/
    Returns a PDF appraisal report for completed submissions.
    Faculty can download their own; HOD/Admin can download any in their scope.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            submission = AppraisalSubmission.objects.select_related(
                'template', 'faculty', 'reviewed_by'
            ).prefetch_related('scores__criteria').get(pk=pk)
        except AppraisalSubmission.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        # Permission check
        if user.role == 'FACULTY' and submission.faculty != user:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if user.role == 'HOD' and user.department_id:
            if submission.faculty.department_id != user.department_id:
                return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if submission.status not in (AppraisalSubmission.STATUS_HOD_REVIEW, AppraisalSubmission.STATUS_COMPLETED):
            return Response(
                {'detail': 'Report is only available once the submission has been reviewed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        import io

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, spaceAfter=6)
        elements.append(Paragraph('Faculty Appraisal Report', title_style))
        elements.append(Spacer(1, 0.3*cm))

        # Meta info
        meta_style = styles['Normal']
        faculty = submission.faculty
        elements.append(Paragraph(f'<b>Faculty:</b> {faculty.get_full_name()} ({faculty.email})', meta_style))
        elements.append(Paragraph(f'<b>Template:</b> {submission.template.title}', meta_style))
        elements.append(Paragraph(f'<b>Status:</b> {submission.status}', meta_style))
        if submission.submitted_at:
            elements.append(Paragraph(f'<b>Submitted:</b> {submission.submitted_at.strftime("%d %b %Y")}', meta_style))
        if submission.reviewed_at:
            reviewer = submission.reviewed_by.get_full_name() if submission.reviewed_by else '—'
            elements.append(Paragraph(f'<b>Reviewed by:</b> {reviewer} on {submission.reviewed_at.strftime("%d %b %Y")}', meta_style))
        elements.append(Spacer(1, 0.5*cm))

        # Self Remarks
        if submission.self_remarks:
            elements.append(Paragraph('<b>Self Remarks:</b>', meta_style))
            elements.append(Paragraph(submission.self_remarks, meta_style))
            elements.append(Spacer(1, 0.3*cm))

        # Scores table
        elements.append(Paragraph('<b>Criteria Scores</b>', styles['Heading2']))
        table_data = [['Criteria', 'Max Score', 'Self Score', 'HOD Score']]
        for score in submission.scores.all():
            table_data.append([
                score.criteria.title,
                str(score.criteria.max_score),
                str(score.self_score) if score.self_score is not None else '—',
                str(score.hod_score) if score.hod_score is not None else '—',
            ])

        table = Table(table_data, colWidths=[10*cm, 3*cm, 3*cm, 3*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 0.5*cm))

        # HOD Remarks
        if submission.hod_remarks:
            elements.append(Paragraph('<b>HOD Remarks:</b>', meta_style))
            elements.append(Paragraph(submission.hod_remarks, meta_style))

        doc.build(elements)

        buffer.seek(0)
        filename = f'appraisal_{submission.id}_{faculty.get_full_name().replace(" ", "_")}.pdf'
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
