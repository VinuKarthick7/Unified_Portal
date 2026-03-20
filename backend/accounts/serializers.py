from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class FlexTokenObtainPairSerializer(serializers.Serializer):
    """
    Accepts `identifier` (email OR username) + `password`.
    Returns JWT access + refresh tokens identical to simplejwt default.
    """
    identifier = serializers.CharField(write_only=True)
    password   = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        identifier = attrs['identifier'].strip()
        password   = attrs['password']

        # Try email lookup first (contains @), then username
        user = None
        if '@' in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        if user is None:
            user = User.objects.filter(username__iexact=identifier).first()

        if user is None or not user.check_password(password):
            raise serializers.ValidationError(
                {'detail': _('No active account found with the given credentials')}
            )
        if not user.is_active:
            raise serializers.ValidationError({'detail': _('This account is inactive.')})

        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access':  str(refresh.access_token),
        }



class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name',
                  'role', 'phone', 'department', 'password', 'is_active']
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name',
                  'role', 'phone', 'department', 'department_name', 'is_active']
        read_only_fields = ['id', 'email', 'role']


class FacultyMinimalSerializer(serializers.ModelSerializer):
    """Minimal public profile — safe to expose to any authenticated user for dropdowns."""
    department_name = serializers.SerializerMethodField()

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'role', 'department', 'department_name']
