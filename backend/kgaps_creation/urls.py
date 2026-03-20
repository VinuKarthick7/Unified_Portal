from django.urls import path
from .views import (
    DomainListCreateView, DomainDetailView,
    UnitListCreateView, UnitDetailView,
    TopicListCreateView, TopicDetailView,
    TopicAssignmentListCreateView, TopicAssignmentDetailView,
    MaterialListCreateView, MaterialDetailView,
    VerificationQueueView, VerificationActionView,
    CourseStructureView,
)

urlpatterns = [
    # Domains
    path('domains/', DomainListCreateView.as_view(), name='domain_list'),
    path('domains/<int:pk>/', DomainDetailView.as_view(), name='domain_detail'),

    # Course full structure tree
    path('structure/<int:course_pk>/', CourseStructureView.as_view(), name='course_structure'),

    # Units
    path('units/', UnitListCreateView.as_view(), name='unit_list'),
    path('units/<int:pk>/', UnitDetailView.as_view(), name='unit_detail'),

    # Topics
    path('topics/', TopicListCreateView.as_view(), name='topic_list'),
    path('topics/<int:pk>/', TopicDetailView.as_view(), name='topic_detail'),
    path('topic-assignments/', TopicAssignmentListCreateView.as_view(), name='topic_assignment_list'),
    path('topic-assignments/<int:pk>/', TopicAssignmentDetailView.as_view(), name='topic_assignment_detail'),

    # Materials
    path('materials/', MaterialListCreateView.as_view(), name='material_list'),
    path('materials/<int:pk>/', MaterialDetailView.as_view(), name='material_detail'),

    # Coordinator (Domain Mentor) verification
    path('verifications/', VerificationQueueView.as_view(), name='verification_queue'),
    path('verifications/<int:pk>/action/', VerificationActionView.as_view(), name='verification_action'),
]
