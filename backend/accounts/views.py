from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .serializers import UserSerializer, UserProfileSerializer, FacultyMinimalSerializer, FlexTokenObtainPairSerializer
from .permissions import IsAdmin

User = get_user_model()


class FlexTokenObtainPairView(APIView):
    """Login with email or username."""
    permission_classes = []

    def post(self, request):
        serializer = FlexTokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class RegisterView(generics.CreateAPIView):
    """Admin-only endpoint to create new users."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]


class UserListView(generics.ListAPIView):
    """Admin can list all users. Supports ?role= query filter."""
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = User.objects.all().order_by('first_name')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin can view, update, or delete any user."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]


class ProfileView(generics.RetrieveUpdateAPIView):
    """Any authenticated user can view/update their own profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    """Allow any authenticated user to change their own password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'detail': 'Both old_password and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.check_password(old_password):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response(
                {'detail': 'New password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


class FacultyListView(generics.ListAPIView):
    """
    Safe minimal faculty directory — accessible to any authenticated user.
    Returns only id, name, email, department. Used for dropdown population
    in swap requests, task assignment, etc.
    Supports ?department=<id> and ?role=<role> query params.
    """
    serializer_class = FacultyMinimalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.filter(is_active=True).select_related('department').order_by('first_name')
        role = self.request.query_params.get('role', 'FACULTY')
        if role:
            qs = qs.filter(role=role)
        department = self.request.query_params.get('department')
        if department:
            qs = qs.filter(department_id=department)
        return qs
