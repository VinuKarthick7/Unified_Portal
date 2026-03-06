from rest_framework import serializers
from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    hod_name = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'hod', 'hod_name', 'member_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_hod_name(self, obj):
        return obj.hod.get_full_name() if obj.hod else None

    def get_member_count(self, obj):
        return obj.members.count()
