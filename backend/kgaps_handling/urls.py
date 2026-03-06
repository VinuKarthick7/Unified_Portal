from django.urls import path
from .views import (
    TopicHandlingListCreateView,
    TopicHandlingDetailView,
    ProgressView,
    HandlingVerificationQueueView,
    HandlingVerificationActionView,
)

urlpatterns = [
    # Faculty: log & list
    path('', TopicHandlingListCreateView.as_view(), name='handling_list'),
    path('<int:pk>/', TopicHandlingDetailView.as_view(), name='handling_detail'),

    # Progress summary
    path('progress/', ProgressView.as_view(), name='handling_progress'),

    # HOD: verification queue
    path('verifications/', HandlingVerificationQueueView.as_view(), name='handling_verif_list'),
    path('verifications/<int:pk>/action/', HandlingVerificationActionView.as_view(), name='handling_verif_action'),
]
