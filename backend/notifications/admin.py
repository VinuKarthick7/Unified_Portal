from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ('recipient', 'category', 'verb', 'is_read', 'created_at')
    list_filter   = ('category', 'is_read')
    search_fields = ('recipient__email', 'verb')
    ordering      = ('-created_at',)
