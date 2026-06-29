from rest_framework import serializers
from apps.users.models import User, PatientProfile, StaffProfile


def generate_patient_number():
    last_user = User.objects.exclude(patient_number__isnull=True).exclude(patient_number='').order_by('-id').first()
    if not last_user or not last_user.patient_number:
        return 'PT-000001'

    try:
        sequence = int(last_user.patient_number.split('-')[-1]) + 1
    except (ValueError, IndexError):
        sequence = (last_user.id or 0) + 1
    return f'PT-{sequence:06d}'

class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = [
            'insurance_provider',
            'insurance_policy_number',
            'emergency_contact_name',
            'emergency_contact_phone',
            'is_verified'
        ]
        read_only_fields = ['is_verified']


class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = ['license_number', 'specialization', 'is_active_staff']
        read_only_fields = ['is_active_staff']


class UserSerializer(serializers.ModelSerializer):
    patient_profile = PatientProfileSerializer(required=False)
    staff_profile = StaffProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'patient_number', 'phone_number', 'date_of_birth', 'gender', 'address',
            'patient_profile', 'staff_profile'
        ]
        read_only_fields = ['role']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    patient_profile = PatientProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'phone_number', 'date_of_birth', 'gender', 'address', 'patient_profile'
        ]

    def create(self, validated_data):
        profile_data = validated_data.pop('patient_profile', None)
        # Registrations default to patient role
        user = User.objects.create_user(
            role=User.Role.PATIENT,
            **validated_data
        )
        user.patient_number = generate_patient_number()
        user.save(update_fields=['patient_number'])
        if profile_data:
            PatientProfile.objects.create(user=user, **profile_data)
        else:
            PatientProfile.objects.create(user=user)
        return user
