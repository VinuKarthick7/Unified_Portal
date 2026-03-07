from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from .views import RegisterView, UserListView, UserDetailView, ProfileView, FacultyListView, FlexTokenObtainPairView, PasswordChangeView

urlpatterns = [
    # Auth — accepts email or username
    path('auth/login/', FlexTokenObtainPairView.as_view(), name='token_obtain'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('auth/password-change/', PasswordChangeView.as_view(), name='password_change'),

    # Users
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/register/', RegisterView.as_view(), name='user_register'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),
    path('users/me/', ProfileView.as_view(), name='user_profile'),
    path('users/faculty-list/', FacultyListView.as_view(), name='faculty_list'),
]
