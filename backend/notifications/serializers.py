from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id', 'category', 'verb', 'target_url', 'is_read', 'created_at']
        read_only_fields = ['id', 'category', 'verb', 'target_url', 'created_at']
