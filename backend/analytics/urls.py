from django.urls import path
from .views import (
    DashboardStatsView, HODInboxView, FacultyMyDayView,
    ModuleSummaryView, TaskAnalyticsView, WorkloadTrendView, DepartmentOverviewView,
)

urlpatterns = [
    # Phase 3 — dashboard integration
    path('stats/',       DashboardStatsView.as_view(),    name='analytics-stats'),
    path('hod-inbox/',   HODInboxView.as_view(),          name='analytics-hod-inbox'),
    path('my-day/',      FacultyMyDayView.as_view(),      name='analytics-my-day'),
    # Phase 5 — analytics page
    path('summary/',     ModuleSummaryView.as_view(),     name='analytics-summary'),
    path('tasks/',       TaskAnalyticsView.as_view(),     name='analytics-tasks'),
    path('workload/',    WorkloadTrendView.as_view(),     name='analytics-workload'),
    path('departments/', DepartmentOverviewView.as_view(),name='analytics-departments'),
]
