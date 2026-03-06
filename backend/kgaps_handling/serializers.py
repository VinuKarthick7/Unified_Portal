from rest_framework import serializers
from .models import TopicHandling, HandlingVerification, AssignmentTracker, CourseResult
from kgaps_creation.serializers import TopicSerializer


class AssignmentTrackerSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course_assignment.course.code', read_only=True)
    course_name = serializers.CharField(source='course_assignment.course.name', read_only=True)
    section = serializers.CharField(source='course_assignment.section', read_only=True)
    faculty_name = serializers.CharField(
        source='course_assignment.faculty.get_full_name', read_only=True
    )

    class Meta:
        model = AssignmentTracker
        fields = [
            'id', 'course_assignment', 'course_code', 'course_name', 'section',
            'faculty_name', 'title', 'sheet_url', 'completion_pct',
            'last_synced_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'last_synced_at', 'created_at', 'updated_at']


class CourseResultSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course_assignment.course.code', read_only=True)
    course_name = serializers.CharField(source='course_assignment.course.name', read_only=True)
    section = serializers.CharField(source='course_assignment.section', read_only=True)
    faculty_name = serializers.CharField(
        source='course_assignment.faculty.get_full_name', read_only=True
    )
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name', read_only=True
    )

    class Meta:
        model = CourseResult
        fields = [
            'id', 'course_assignment', 'course_code', 'course_name', 'section',
            'faculty_name', 'result_sheet_url', 'pass_percentage', 'remarks',
            'uploaded_by', 'uploaded_by_name', 'updated_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'updated_at']


class HandlingVerificationSerializer(serializers.ModelSerializer):
    verified_by_name = serializers.CharField(
        source='verified_by.get_full_name', read_only=True
    )

    class Meta:
        model = HandlingVerification
        fields = ['id', 'handling', 'verified_by', 'verified_by_name',
                  'status', 'remarks', 'verified_at']
        read_only_fields = ['id', 'verified_at']


class HandlingVerificationDetailSerializer(serializers.ModelSerializer):
    """Rich serializer for the HOD verification queue — includes all nested handling details."""
    # Verification fields
    verified_by_name = serializers.CharField(
        source='verified_by.get_full_name', read_only=True
    )
    # Nested handling fields
    faculty_name = serializers.CharField(
        source='handling.faculty.get_full_name', read_only=True
    )
    topic_title = serializers.CharField(
        source='handling.topic.topic_title', read_only=True
    )
    unit_title = serializers.CharField(
        source='handling.topic.unit.title', read_only=True
    )
    course_code = serializers.CharField(
        source='handling.topic.unit.course.code', read_only=True
    )
    course_name = serializers.CharField(
        source='handling.topic.unit.course.name', read_only=True
    )
    section = serializers.CharField(
        source='handling.course_assignment.section', read_only=True
    )
    hours_handled = serializers.DecimalField(
        source='handling.hours_handled', max_digits=4, decimal_places=1, read_only=True
    )
    date = serializers.DateField(source='handling.date', read_only=True)
    notes = serializers.CharField(source='handling.notes', read_only=True, default='')
    is_auto_generated = serializers.BooleanField(
        source='handling.is_auto_generated', read_only=True
    )

    class Meta:
        model = HandlingVerification
        fields = [
            'id', 'handling', 'status', 'remarks', 'verified_at',
            'verified_by', 'verified_by_name',
            # nested
            'faculty_name', 'topic_title', 'unit_title',
            'course_code', 'course_name', 'section',
            'hours_handled', 'date', 'notes', 'is_auto_generated',
        ]
        read_only_fields = ['id', 'verified_at']


class TopicHandlingSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.get_full_name', read_only=True)
    topic_title = serializers.CharField(source='topic.topic_title', read_only=True)
    unit_title = serializers.CharField(source='topic.unit.title', read_only=True)
    course_code = serializers.CharField(source='topic.unit.course.code', read_only=True)
    course_name = serializers.CharField(source='topic.unit.course.name', read_only=True)
    verification_status = serializers.CharField(
        source='verification.status', read_only=True, default='PENDING'
    )
    verification_remarks = serializers.CharField(
        source='verification.remarks', read_only=True, default=''
    )

    class Meta:
        model = TopicHandling
        fields = [
            'id', 'topic', 'topic_title', 'unit_title', 'course_code', 'course_name',
            'faculty', 'faculty_name', 'course_assignment', 'hours_handled',
            'date', 'notes', 'is_auto_generated', 'created_at',
            'verification_status', 'verification_remarks',
        ]
        read_only_fields = ['id', 'faculty', 'is_auto_generated', 'created_at']


class TopicHandlingCreateSerializer(serializers.ModelSerializer):
    """Slim serializer used only for POST — faculty submits a handling entry."""

    class Meta:
        model = TopicHandling
        fields = ['topic', 'course_assignment', 'hours_handled', 'date', 'notes']

    def validate(self, data):
        # Ensure the topic belongs to the course in the assignment
        topic = data['topic']
        assignment = data['course_assignment']
        if topic.unit.course_id != assignment.course_id:
            raise serializers.ValidationError(
                'Topic does not belong to the course in the selected assignment.'
            )
        return data
