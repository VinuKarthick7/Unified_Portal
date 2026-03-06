from django.urls import path
from .views import (
    UnitListCreateView, UnitDetailView,
    TopicListCreateView, TopicDetailView,
    MaterialListCreateView, MaterialDetailView,
    VerificationQueueView, VerificationActionView,
    CourseStructureView,
)

urlpatterns = [
    # Course full structure tree
    path('structure/<int:course_pk>/', CourseStructureView.as_view(), name='course_structure'),

    # Units
    path('units/', UnitListCreateView.as_view(), name='unit_list'),
    path('units/<int:pk>/', UnitDetailView.as_view(), name='unit_detail'),

    # Topics
    path('topics/', TopicListCreateView.as_view(), name='topic_list'),
    path('topics/<int:pk>/', TopicDetailView.as_view(), name='topic_detail'),

    # Materials
    path('materials/', MaterialListCreateView.as_view(), name='material_list'),
    path('materials/<int:pk>/', MaterialDetailView.as_view(), name='material_detail'),

    # Coordinator verification
    path('verifications/', VerificationQueueView.as_view(), name='verification_queue'),
    path('verifications/<int:pk>/action/', VerificationActionView.as_view(), name='verification_action'),
]
