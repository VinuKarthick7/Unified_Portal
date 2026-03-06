from django.contrib import admin
from .models import AppraisalTemplate, AppraisalCriteria, AppraisalSubmission, CriteriaScore


class AppraisalCriteriaInline(admin.TabularInline):
    model  = AppraisalCriteria
    extra  = 1
    fields = ['order', 'title', 'description', 'max_score']


@admin.register(AppraisalTemplate)
class AppraisalTemplateAdmin(admin.ModelAdmin):
    list_display  = ['title', 'academic_year', 'department', 'deadline', 'is_active', 'created_by', 'created_at']
    list_filter   = ['is_active', 'academic_year', 'department']
    search_fields = ['title', 'academic_year']
    inlines       = [AppraisalCriteriaInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AppraisalCriteria)
class AppraisalCriteriaAdmin(admin.ModelAdmin):
    list_display  = ['title', 'template', 'max_score', 'order']
    list_filter   = ['template']
    search_fields = ['title']


class CriteriaScoreInline(admin.TabularInline):
    model  = CriteriaScore
    extra  = 0
    fields = ['criteria', 'self_score', 'self_comment', 'hod_score', 'hod_comment']
    readonly_fields = ['criteria']


@admin.register(AppraisalSubmission)
class AppraisalSubmissionAdmin(admin.ModelAdmin):
    list_display  = ['faculty', 'template', 'status', 'submitted_at', 'reviewed_at', 'reviewed_by']
    list_filter   = ['status', 'template']
    search_fields = ['faculty__first_name', 'faculty__last_name', 'faculty__email']
    inlines       = [CriteriaScoreInline]
    readonly_fields = ['created_at', 'updated_at', 'submitted_at', 'reviewed_at']


@admin.register(CriteriaScore)
class CriteriaScoreAdmin(admin.ModelAdmin):
    list_display = ['submission', 'criteria', 'self_score', 'hod_score']
    list_filter  = ['criteria__template']
