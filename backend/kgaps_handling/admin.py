from django.contrib import admin
from .models import TopicHandling, HandlingVerification


class HandlingVerificationInline(admin.TabularInline):
    model = HandlingVerification
    extra = 0
    readonly_fields = ['verified_at']


@admin.register(TopicHandling)
class TopicHandlingAdmin(admin.ModelAdmin):
    list_display = ['faculty', 'topic', 'hours_handled', 'date', 'is_auto_generated']
    list_filter = ['date', 'is_auto_generated', 'topic__unit__course']
    search_fields = ['faculty__first_name', 'faculty__last_name', 'topic__topic_title']
    inlines = [HandlingVerificationInline]


@admin.register(HandlingVerification)
class HandlingVerificationAdmin(admin.ModelAdmin):
    list_display = ['handling', 'status', 'verified_by', 'verified_at']
    list_filter = ['status']
