from django.contrib import admin
from .models import Domain, Unit, Topic, Material, MaterialVerification


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'mentor', 'created_at']
    search_fields = ['name', 'code']


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 1


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['course', 'unit_number', 'title']
    list_filter = ['course__departments']
    search_fields = ['title', 'course__name']
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['topic_title', 'unit', 'planned_hours', 'order']
    list_filter = ['unit__course']
    search_fields = ['topic_title']


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ['title', 'material_type', 'topic', 'uploaded_by', 'uploaded_at']
    list_filter = ['material_type']
    search_fields = ['title']


@admin.register(MaterialVerification)
class MaterialVerificationAdmin(admin.ModelAdmin):
    list_display = ['material', 'status', 'verified_by', 'verified_at']
    list_filter = ['status']
