from django.urls import path
from .views import (
    AppraisalTemplateListCreateView, AppraisalTemplateDetailView,
    AppraisalCriteriaListCreateView, AppraisalCriteriaDetailView,
    AppraisalSubmissionListCreateView, AppraisalSubmissionDetailView,
    AppraisalSubmissionSelfUpdateView, AppraisalSubmissionActionView,
    AppraisalStatsView, AppraisalReportView,
)

urlpatterns = [
    # Templates
    path('templates/',          AppraisalTemplateListCreateView.as_view(),  name='appraisal-template-list'),
    path('templates/<int:pk>/', AppraisalTemplateDetailView.as_view(),       name='appraisal-template-detail'),

    # Criteria nested under template
    path('templates/<int:template_pk>/criteria/',          AppraisalCriteriaListCreateView.as_view(), name='appraisal-criteria-list'),
    path('templates/<int:template_pk>/criteria/<int:pk>/', AppraisalCriteriaDetailView.as_view(),     name='appraisal-criteria-detail'),

    # Submissions
    path('submissions/',             AppraisalSubmissionListCreateView.as_view(), name='appraisal-submission-list'),
    path('submissions/<int:pk>/',    AppraisalSubmissionDetailView.as_view(),     name='appraisal-submission-detail'),
    path('submissions/<int:pk>/self-update/', AppraisalSubmissionSelfUpdateView.as_view(), name='appraisal-submission-self-update'),
    # PDF report — must come before the generic <str:action> catch-all
    path('submissions/<int:pk>/report/', AppraisalReportView.as_view(), name='appraisal-submission-report'),
    path('submissions/<int:pk>/<str:action>/', AppraisalSubmissionActionView.as_view(),    name='appraisal-submission-action'),

    # Stats
    path('stats/', AppraisalStatsView.as_view(), name='appraisal-stats'),
]
