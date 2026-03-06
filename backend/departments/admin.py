from django.contrib import admin
from .models import Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'hod', 'member_count']
    search_fields = ['name', 'code']

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'
