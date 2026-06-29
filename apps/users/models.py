from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = 'PATIENT', 'Patient'
        OPHTHALMOLOGIST = 'OPHTHALMOLOGIST', 'Ophthalmologist (Doctor)'
        OPTOMETRIST = 'OPTOMETRIST', 'Optometrist'
        RECEPTIONIST = 'RECEPTIONIST', 'Front Desk / Receptionist'
        PHARMACIST = 'PHARMACIST', 'Pharmacist'
        OPTICIAN = 'OPTICIAN', 'Optician'
        ADMIN = 'ADMIN', 'Admin'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    patient_number = models.CharField(max_length=20, unique=True, blank=True, null=True, editable=False)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['role']),
        ]

class PatientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    insurance_provider = models.CharField(max_length=100, blank=True, null=True)
    insurance_policy_number = models.CharField(max_length=50, blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True, null=True)
    is_verified = models.BooleanField(default=False, help_text="Requires verification by receptionist or admin")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Patient: {self.user.get_full_name() or self.user.username}"

class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    license_number = models.CharField(max_length=50, unique=True, blank=True, null=True, help_text="Medical board license identifier")
    specialization = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. Retina Specialist, Pediatric Optometry")
    is_active_staff = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Staff ({self.user.role}): {self.user.get_full_name() or self.user.username}"
