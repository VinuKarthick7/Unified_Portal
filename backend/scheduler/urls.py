from django.urls import path
from .views import (
    PeriodListView,
    TimetableListView,
    TimetableDetailView,
    TimetableCreateUpdateView,
    DailyEntryListCreateView,
    DailyEntryDetailView,
    SwapRequestListCreateView,
    SwapRequestActionView,
    ExtraClassListCreateView,
    ExtraClassActionView,
)

urlpatterns = [
    # Periods
    path('periods/', PeriodListView.as_view(), name='period_list'),

    # Timetables
    path('timetables/', TimetableListView.as_view(), name='timetable_list'),
    path('timetables/<int:pk>/', TimetableDetailView.as_view(), name='timetable_detail'),
    path('timetables/setup/', TimetableCreateUpdateView.as_view(), name='timetable_setup'),

    # Daily entries
    path('daily-entries/', DailyEntryListCreateView.as_view(), name='daily_entry_list'),
    path('daily-entries/<int:pk>/', DailyEntryDetailView.as_view(), name='daily_entry_detail'),

    # Swap requests
    path('swaps/', SwapRequestListCreateView.as_view(), name='swap_list'),
    path('swaps/<int:pk>/action/', SwapRequestActionView.as_view(), name='swap_action'),

    # Extra classes
    path('extra-classes/', ExtraClassListCreateView.as_view(), name='extra_class_list'),
    path('extra-classes/<int:pk>/action/', ExtraClassActionView.as_view(), name='extra_class_action'),
]
