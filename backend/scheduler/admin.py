from django.contrib import admin
from .models import Period, Timetable, TimetableSlot, DailyEntry, SwapRequest, ExtraClass


class TimetableSlotInline(admin.TabularInline):
    model = TimetableSlot
    extra = 0


@admin.register(Period)
class PeriodAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_time', 'end_time', 'order']
    ordering = ['order']


@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = ['course_assignment', 'is_active', 'created_at']
    inlines = [TimetableSlotInline]


@admin.register(DailyEntry)
class DailyEntryAdmin(admin.ModelAdmin):
    list_display = ['faculty', 'topic', 'course_assignment', 'date',
                    'hours_conducted', 'is_extra_class']
    list_filter = ['date', 'is_extra_class', 'faculty']
    date_hierarchy = 'date'


@admin.register(SwapRequest)
class SwapRequestAdmin(admin.ModelAdmin):
    list_display = ['requester', 'target_faculty', 'swap_date', 'status']
    list_filter = ['status']


@admin.register(ExtraClass)
class ExtraClassAdmin(admin.ModelAdmin):
    list_display = ['faculty', 'topic', 'proposed_date', 'status']
    list_filter = ['status']
