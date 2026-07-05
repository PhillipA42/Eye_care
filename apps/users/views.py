from django.db.models import Q
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from apps.users.models import User, PatientProfile, Department, DirectMessage
from apps.users.serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    PatientProfileSerializer,
    DepartmentSerializer,
    DirectMessageSerializer,
    UserDirectorySerializer
)

class CustomObtainAuthToken(ObtainAuthToken):
    """
    Obtain authentication token and return key user identity and role.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'email': user.email,
            'role': user.role
        })


class PatientRegistrationView(generics.CreateAPIView):
    """
    Register a new patient user. Open to the public.
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]


class DepartmentListView(generics.ListAPIView):
    """
    Active hospital departments used across staff, appointments, and dashboards.
    """
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Department.objects.filter(is_active=True)


class UserDirectoryView(generics.ListAPIView):
    """
    Authenticated directory used by dashboards for in-system communication.
    """
    serializer_class = UserDirectorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            User.objects
            .filter(is_active=True)
            .exclude(id=self.request.user.id)
            .select_related('staff_profile__department')
            .order_by('role', 'first_name', 'last_name', 'username')
        )


class DirectMessageView(APIView):
    """
    Send messages and retrieve either a whole mailbox or one conversation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        other_user_id = request.query_params.get('with_user')
        messages = DirectMessage.objects.filter(
            Q(sender=request.user) | Q(recipient=request.user)
        ).select_related(
            'sender', 'sender__staff_profile__department',
            'recipient', 'recipient__staff_profile__department'
        )

        if other_user_id:
            messages = messages.filter(
                Q(sender=request.user, recipient_id=other_user_id) |
                Q(sender_id=other_user_id, recipient=request.user)
            ).order_by('created_at')

            DirectMessage.objects.filter(
                sender_id=other_user_id,
                recipient=request.user,
                is_read=False
            ).update(is_read=True)
        else:
            messages = messages.order_by('-created_at')[:100]

        serializer = DirectMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = DirectMessageSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        output = DirectMessageSerializer(message, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update details and profile of the currently authenticated user.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Manually handle embedded patient profile details update if provided
        patient_profile_data = request.data.get('patient_profile')
        if patient_profile_data and instance.role == User.Role.PATIENT:
            profile = getattr(instance, 'patient_profile', None)
            if profile:
                profile_serializer = PatientProfileSerializer(profile, data=patient_profile_data, partial=partial)
                profile_serializer.is_valid(raise_exception=True)
                profile_serializer.save()
        
        self.perform_update(serializer)
        return Response(serializer.data)
