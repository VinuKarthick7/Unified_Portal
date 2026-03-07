from rest_framework import serializers
from .models import Period, Timetable, TimetableSlot, DailyEntry, SwapRequest, ExtraClass


class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = ['id', 'name', 'start_time', 'end_time', 'order']


class TimetableSlotSerializer(serializers.ModelSerializer):
    period_name = serializers.CharField(source='period.name', read_only=True)
    start_time = serializers.TimeField(source='period.start_time', read_only=True)
    end_time = serializers.TimeField(source='period.end_time', read_only=True)
    period_order = serializers.IntegerField(source='period.order', read_only=True)

    class Meta:
        model = TimetableSlot
        fields = [
            'id', 'timetable', 'day_of_week', 'period', 'period_name',
            'start_time', 'end_time', 'period_order', 'room',
        ]


class TimetableSerializer(serializers.ModelSerializer):
    slots = TimetableSlotSerializer(many=True, read_only=True)
    course_code = serializers.CharField(
        source='course_assignment.course.code', read_only=True
    )
    course_name = serializers.CharField(
        source='course_assignment.course.name', read_only=True
    )
    section = serializers.CharField(
        source='course_assignment.section', read_only=True
    )
    faculty_name = serializers.CharField(
        source='course_assignment.faculty.get_full_name', read_only=True
    )
    faculty_department = serializers.CharField(
        source='course_assignment.faculty.department.name', read_only=True, default=None
    )
    faculty_department_code = serializers.CharField(
        source='course_assignment.faculty.department.code', read_only=True, default=None
    )

    class Meta:
        model = Timetable
        fields = [
            'id', 'course_assignment', 'course_code', 'course_name',
            'section', 'faculty_name', 'faculty_department', 'faculty_department_code',
            'is_active', 'slots', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DailyEntrySerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.get_full_name', read_only=True)
    topic_title = serializers.CharField(source='topic.topic_title', read_only=True)
    unit_title = serializers.CharField(source='topic.unit.title', read_only=True)
    course_code = serializers.CharField(
        source='course_assignment.course.code', read_only=True
    )
    section = serializers.CharField(
        source='course_assignment.section', read_only=True
    )
    day_of_week = serializers.SerializerMethodField()

    class Meta:
        model = DailyEntry
        fields = [
            'id', 'timetable_slot', 'day_of_week', 'topic', 'topic_title',
            'unit_title', 'faculty', 'faculty_name', 'course_assignment',
            'course_code', 'section', 'date', 'hours_conducted',
            'notes', 'is_extra_class', 'created_at',
        ]
        read_only_fields = ['id', 'faculty', 'created_at']

    def get_day_of_week(self, obj):
        if obj.timetable_slot:
            return obj.timetable_slot.day_of_week
        return None


class DailyEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyEntry
        fields = [
            'timetable_slot', 'topic', 'course_assignment',
            'date', 'hours_conducted', 'notes', 'is_extra_class',
        ]

    def validate(self, data):
        topic = data['topic']
        assignment = data['course_assignment']
        if topic.unit.course_id != assignment.course_id:
            raise serializers.ValidationError(
                'Topic does not belong to the course in the selected assignment.'
            )
        return data


class SwapRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(
        source='requester.get_full_name', read_only=True
    )
    target_faculty_name = serializers.CharField(
        source='target_faculty.get_full_name', read_only=True
    )
    slot_detail = TimetableSlotSerializer(source='original_slot', read_only=True)

    class Meta:
        model = SwapRequest
        fields = [
            'id', 'requester', 'requester_name', 'target_faculty',
            'target_faculty_name', 'original_slot', 'slot_detail',
            'swap_date', 'reason', 'status', 'approved_by', 'created_at',
        ]
        read_only_fields = ['id', 'requester', 'status', 'approved_by', 'created_at']


class ExtraClassSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.get_full_name', read_only=True)
    topic_title = serializers.CharField(source='topic.topic_title', read_only=True)
    unit_title = serializers.CharField(source='topic.unit.title', read_only=True)
    course_code = serializers.CharField(
        source='course_assignment.course.code', read_only=True
    )
    period_name = serializers.CharField(
        source='proposed_period.name', read_only=True, default=''
    )
    approved_by_name = serializers.CharField(
        source='approved_by.get_full_name', read_only=True, default=''
    )

    class Meta:
        model = ExtraClass
        fields = [
            'id', 'faculty', 'faculty_name', 'course_assignment', 'course_code',
            'topic', 'topic_title', 'unit_title',
            'proposed_date', 'proposed_period', 'period_name',
            'room', 'reason', 'status', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'faculty', 'status', 'approved_by', 'created_at', 'updated_at']
