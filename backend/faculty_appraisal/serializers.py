from rest_framework import serializers
from .models import AppraisalTemplate, AppraisalCriteria, AppraisalSubmission, CriteriaScore


class AppraisalCriteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AppraisalCriteria
        fields = ['id', 'title', 'description', 'max_score', 'order']


# --------------------------------------------------------------------------- #
# Template serializers
# --------------------------------------------------------------------------- #
class AppraisalTemplateListSerializer(serializers.ModelSerializer):
    department_name     = serializers.CharField(source='department.name', read_only=True, default=None)
    created_by_name     = serializers.SerializerMethodField()
    criteria_count      = serializers.SerializerMethodField()
    submission_count    = serializers.SerializerMethodField()

    class Meta:
        model  = AppraisalTemplate
        fields = [
            'id', 'title', 'academic_year', 'department', 'department_name',
            'deadline', 'is_active', 'created_by_name', 'criteria_count',
            'submission_count', 'created_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_criteria_count(self, obj):
        return obj.criteria.count()

    def get_submission_count(self, obj):
        return obj.submissions.count()


class AppraisalTemplateSerializer(AppraisalTemplateListSerializer):
    criteria = AppraisalCriteriaSerializer(many=True, read_only=True)

    class Meta(AppraisalTemplateListSerializer.Meta):
        fields = AppraisalTemplateListSerializer.Meta.fields + ['description', 'criteria', 'updated_at']


class AppraisalTemplateWriteSerializer(serializers.ModelSerializer):
    criteria = AppraisalCriteriaSerializer(many=True, required=False)

    class Meta:
        model  = AppraisalTemplate
        fields = ['title', 'description', 'academic_year', 'department', 'deadline', 'is_active', 'criteria']

    def create(self, validated_data):
        criteria_data = validated_data.pop('criteria', [])
        template = AppraisalTemplate.objects.create(**validated_data)
        for c in criteria_data:
            AppraisalCriteria.objects.create(template=template, **c)
        return template

    def update(self, instance, validated_data):
        validated_data.pop('criteria', None)   # criteria managed separately
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


# --------------------------------------------------------------------------- #
# Score + Submission serializers
# --------------------------------------------------------------------------- #
class CriteriaScoreSerializer(serializers.ModelSerializer):
    criteria_title    = serializers.CharField(source='criteria.title', read_only=True)
    criteria_max      = serializers.IntegerField(source='criteria.max_score', read_only=True)
    criteria_order    = serializers.IntegerField(source='criteria.order', read_only=True)
    criteria_desc     = serializers.CharField(source='criteria.description', read_only=True)

    class Meta:
        model  = CriteriaScore
        fields = [
            'id', 'criteria', 'criteria_title', 'criteria_max', 'criteria_order', 'criteria_desc',
            'self_score', 'hod_score', 'self_comment', 'hod_comment',
        ]
        read_only_fields = ['id', 'criteria']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            # Hide HOD scores from faculty until the submission is COMPLETED
            if user.role == 'FACULTY':
                submission = instance.submission
                if submission.status != AppraisalSubmission.STATUS_COMPLETED:
                    data['hod_score'] = None
                    data['hod_comment'] = None
        return data


class CriteriaScoreSelfUpdateSerializer(serializers.ModelSerializer):
    """Faculty updates self_score + self_comment only."""
    class Meta:
        model  = CriteriaScore
        fields = ['id', 'self_score', 'self_comment']


class CriteriaScoreHODUpdateSerializer(serializers.ModelSerializer):
    """HOD updates hod_score + hod_comment only."""
    class Meta:
        model  = CriteriaScore
        fields = ['id', 'hod_score', 'hod_comment']


class AppraisalSubmissionListSerializer(serializers.ModelSerializer):
    faculty_name        = serializers.SerializerMethodField()
    faculty_email       = serializers.EmailField(source='faculty.email', read_only=True)
    template_title      = serializers.CharField(source='template.title', read_only=True)
    template_year       = serializers.CharField(source='template.academic_year', read_only=True)
    total_self_score    = serializers.IntegerField(read_only=True)
    total_hod_score     = serializers.IntegerField(read_only=True)
    max_possible_score  = serializers.IntegerField(read_only=True)

    class Meta:
        model  = AppraisalSubmission
        fields = [
            'id', 'template', 'template_title', 'template_year',
            'faculty', 'faculty_name', 'faculty_email', 'status',
            'total_self_score', 'total_hod_score', 'max_possible_score',
            'submitted_at', 'reviewed_at', 'created_at',
        ]

    def get_faculty_name(self, obj):
        return obj.faculty.get_full_name() or obj.faculty.email


class AppraisalSubmissionSerializer(AppraisalSubmissionListSerializer):
    scores          = CriteriaScoreSerializer(many=True, read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()
    template_detail  = AppraisalTemplateSerializer(source='template', read_only=True)

    class Meta(AppraisalSubmissionListSerializer.Meta):
        fields = AppraisalSubmissionListSerializer.Meta.fields + [
            'self_remarks', 'hod_remarks', 'reviewed_by', 'reviewed_by_name',
            'scores', 'template_detail', 'updated_at',
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None
