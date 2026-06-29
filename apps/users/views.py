from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from apps.users.models import User, PatientProfile
from apps.users.serializers import UserRegistrationSerializer, UserSerializer, PatientProfileSerializer

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
