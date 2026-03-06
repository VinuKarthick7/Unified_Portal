from django.urls import path
from .views import (
    TopicHandlingListCreateView,
    TopicHandlingDetailView,
    ProgressView,
    HandlingVerificationQueueView,
    HandlingVerificationActionView,
    AssignmentTrackerListCreateView,
    AssignmentTrackerDetailView,
    SyncAssignmentCompletionView,
    CourseResultListCreateView,
    CourseResultDetailView,
)

urlpatterns = [
    # Faculty: log & list topic handlings
    path('', TopicHandlingListCreateView.as_view(), name='handling_list'),
    path('<int:pk>/', TopicHandlingDetailView.as_view(), name='handling_detail'),

    # Progress summary
    path('progress/', ProgressView.as_view(), name='handling_progress'),

    # HOD: verification queue
    path('verifications/', HandlingVerificationQueueView.as_view(), name='handling_verif_list'),
    path('verifications/<int:pk>/action/', HandlingVerificationActionView.as_view(), name='handling_verif_action'),

    # Assignment tracking (Google Sheet link + completion %)
    path('assignments/', AssignmentTrackerListCreateView.as_view(), name='assignment_tracker_list'),
    path('assignments/<int:pk>/', AssignmentTrackerDetailView.as_view(), name='assignment_tracker_detail'),
    path('assignments/<int:pk>/sync/', SyncAssignmentCompletionView.as_view(), name='assignment_tracker_sync'),

    # Course results (pass percentage)
    path('results/', CourseResultListCreateView.as_view(), name='course_result_list'),
    path('results/<int:pk>/', CourseResultDetailView.as_view(), name='course_result_detail'),
]
