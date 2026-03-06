from django.contrib import admin
from .models import Unit, Topic, Material, MaterialVerification


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 1


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ['course', 'unit_number', 'title']
    list_filter = ['course__department']
    search_fields = ['title', 'course__name']
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['topic_title', 'unit', 'order']
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
