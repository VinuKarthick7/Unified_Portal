from django.urls import path
from .views import (
    CourseListCreateView,
    CourseDetailView,
    CourseAssignmentListCreateView,
    CourseAssignmentDetailView,
    MyAssignmentsView,
)

urlpatterns = [
    path('', CourseListCreateView.as_view(), name='course_list'),
    path('<int:pk>/', CourseDetailView.as_view(), name='course_detail'),
    path('assignments/', CourseAssignmentListCreateView.as_view(), name='assignment_list'),
    path('assignments/<int:pk>/', CourseAssignmentDetailView.as_view(), name='assignment_detail'),
    path('my-assignments/', MyAssignmentsView.as_view(), name='my_assignments'),
]
