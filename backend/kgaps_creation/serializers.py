from rest_framework import serializers
from .models import Domain, Unit, Topic, Material, MaterialVerification


class DomainSerializer(serializers.ModelSerializer):
    mentor_name = serializers.CharField(source='mentor.get_full_name', read_only=True)
    course_count = serializers.SerializerMethodField()

    class Meta:
        model = Domain
        fields = ['id', 'name', 'code', 'description', 'mentor', 'mentor_name',
                  'course_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_course_count(self, obj):
        return obj.courses.count()


class MaterialVerificationSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)

    class Meta:
        model = MaterialVerification
        fields = ['id', 'material', 'verified_by', 'verified_by_name',
                  'status', 'remarks', 'verified_at']
        read_only_fields = ['id', 'verified_at']


class MaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    verification_status = serializers.CharField(
        source='verification.status', read_only=True, default='PENDING'
    )
    verification_remarks = serializers.CharField(
        source='verification.remarks', read_only=True, default=''
    )

    class Meta:
        model = Material
        fields = ['id', 'topic', 'uploaded_by', 'uploaded_by_name',
                  'material_type', 'title', 'file_url', 'external_url',
                  'uploaded_at', 'verification_status', 'verification_remarks']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']


class TopicSerializer(serializers.ModelSerializer):
    materials = MaterialSerializer(many=True, read_only=True)
    unit_title = serializers.CharField(source='unit.title', read_only=True)
    course_code = serializers.CharField(source='unit.course.code', read_only=True)
    # Hours handled so far (sum of ALL approved handling entries for this topic)
    hours_handled = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'unit', 'unit_title', 'course_code',
            'topic_title', 'description',
            'planned_hours', 'learning_outcome',   # per-spec fields
            'order', 'materials', 'hours_handled',
        ]
        read_only_fields = ['id']

    def get_hours_handled(self, obj):
        from kgaps_handling.models import TopicHandling
        from django.db.models import Sum
        result = TopicHandling.objects.filter(
            topic=obj, verification__status='APPROVED'
        ).aggregate(total=Sum('hours_handled'))['total']
        return float(result) if result else 0


class UnitSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)

    class Meta:
        model = Unit
        fields = ['id', 'course', 'course_name', 'course_code',
                  'unit_number', 'title', 'description', 'topics']
        read_only_fields = ['id']
