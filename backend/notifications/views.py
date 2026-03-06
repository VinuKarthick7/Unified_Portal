"""
notifications/views.py
Simple CRUD surface for the notification bell.
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """
    GET  /api/notifications/
    Returns the 30 most recent notifications for the request user.
    Unread items come first, then read, both sorted newest-first.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user).order_by('is_read', '-created_at')[:30]
        return Response(NotificationSerializer(qs, many=True).data)


class UnreadCountView(APIView):
    """
    GET /api/notifications/unread-count/
    Lightweight endpoint polled by the frontend bell every 60 seconds.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'count': count})


class MarkReadView(APIView):
    """
    PATCH /api/notifications/<id>/read/
    Marks a single notification as read. Ignores notifications not owned
    by the requester (returns 404 silently via 200).
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        updated = Notification.objects.filter(pk=pk, recipient=request.user).update(is_read=True)
        if not updated:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': 'read'})


class MarkAllReadView(APIView):
    """
    POST /api/notifications/read-all/
    Marks every unread notification for the user as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'marked': count})
