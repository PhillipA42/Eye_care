import hashlib
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from apps.appointments.models import Appointment
from apps.medical_records.models import (
    TriageEntry, VisualAcuityTest, Prescription, MedicalRecord, DiagnosticDeviceData
)
from apps.medical_records.serializers import (
    TriageEntrySerializer, VisualAcuityTestSerializer,
    PrescriptionSerializer, MedicalRecordSerializer, DiagnosticDeviceDataSerializer
)
from apps.users.permissions import IsPatient, IsClinicalStaff, IsStaffUser, IsPharmacistOrOptician
from apps.users.models import User

NORMAL_SNELLEN_ACUITY = '20/20'

class TriageViewSet(viewsets.ModelViewSet):
    """
    Handle remote patient pre-screening and symptoms assessments.
    Enforces object-level filtering: Patients view their own, Staff view all.
    """
    queryset = TriageEntry.objects.all()
    serializer_class = TriageEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return TriageEntry.objects.filter(patient=user)
        return TriageEntry.objects.all()

    def perform_create(self, serializer):
        symptoms = self.request.data.get('symptoms', {})
        urgency = TriageEntry.Urgency.LOW
        rec = "Based on symptoms, please book a routine remote video consult."
        
        pain_level = int(symptoms.get('pain_level', 0))
        blurry_vision = symptoms.get('blurry_vision', False)
        sudden_vision_loss = symptoms.get('sudden_loss', False)
        chemical_burn = symptoms.get('chemical_burn', False)

        if chemical_burn or sudden_vision_loss:
            urgency = TriageEntry.Urgency.EMERGENCY
            rec = "IMMEDIATE EMERGENCY: Please report to the physical clinic emergency room immediately."
        elif pain_level >= 7 or blurry_vision:
            urgency = TriageEntry.Urgency.HIGH
            rec = "Urgent consultation advised. Please book a physical or rapid telemedicine exam."
        elif pain_level >= 4:
            urgency = TriageEntry.Urgency.MEDIUM
            rec = "Moderate priority. A video consultation within 24-48 hours is recommended."

        serializer.save(
            patient=self.request.user,
            urgency_level=urgency,
            ai_recommendation=rec
        )


class VisualAcuityTestViewSet(viewsets.ModelViewSet):
    """
    Log and retrieve remote visual acuity self-tests.
    Clinical staff have read access for review; Patients can read/create their own.
    """
    queryset = VisualAcuityTest.objects.all()
    serializer_class = VisualAcuityTestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return VisualAcuityTest.objects.filter(patient=user)
        if user.role in [User.Role.OPHTHALMOLOGIST, User.Role.OPTOMETRIST]:
            return VisualAcuityTest.objects.all()
        return VisualAcuityTest.objects.none()

    def perform_create(self, serializer):
        serializer.save(
            patient=self.request.user,
            is_self_test=True
        )


class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    Manage digital medication and refraction prescriptions.
    Doctors/Optometrists write; Patients view own; Pharmacists/Opticians review to dispense.
    """
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return Prescription.objects.filter(patient=user)
        if user.role in [User.Role.OPHTHALMOLOGIST, User.Role.OPTOMETRIST, User.Role.PHARMACIST, User.Role.OPTICIAN]:
            return Prescription.objects.all()
        return Prescription.objects.none()

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsClinicalStaff])
    def sign(self, request, pk=None):
        """
        Cryptographically signs the prescription to mark it official for delivery/pickup.
        """
        prescription = self.get_object()
        if prescription.is_signed:
            return Response({"detail": "Prescription is already signed."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify doctor is the one who wrote it
        if prescription.doctor != request.user:
            return Response({"detail": "Only the issuing clinician can sign this prescription."}, status=status.HTTP_403_FORBIDDEN)
            
        # Create a mock digital signature hash using doctor id + prescription id + time
        raw_sig = f"doctor-{request.user.id}-presc-{prescription.id}-{timezone.now()}"
        signature_hash = hashlib.sha256(raw_sig.encode()).hexdigest()
        
        prescription.is_signed = True
        prescription.signature_hash = signature_hash
        prescription.signed_at = timezone.now()
        prescription.save()
        
        return Response({
            "detail": "Prescription signed successfully.",
            "signature_hash": signature_hash,
            "signed_at": prescription.signed_at
        })


class MedicalRecordViewSet(viewsets.ModelViewSet):
    """
    Manage clinical medical consult summaries.
    Accessible to: Patients (own records) and Clinical staff (Doctors/Optometrists).
    """
    queryset = MedicalRecord.objects.all()
    serializer_class = MedicalRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return MedicalRecord.objects.filter(patient=user)
        if user.role in [User.Role.OPHTHALMOLOGIST, User.Role.OPTOMETRIST]:
            return MedicalRecord.objects.all()
        return MedicalRecord.objects.none()

    def perform_create(self, serializer):
        # Enforce that only clinical staff can write medical records
        if self.request.user.role not in [User.Role.OPHTHALMOLOGIST, User.Role.OPTOMETRIST]:
            raise permissions.exceptions.PermissionDenied("Only Ophthalmologists and Optometrists can write medical records.")
        serializer.save(doctor=self.request.user)


class DiagnosticDeviceDataViewSet(viewsets.ModelViewSet):
    """
    Manage diagnostic physical scanner data integrations.
    Only clinical staff can upload/view device logs.
    """
    queryset = DiagnosticDeviceData.objects.all()
    serializer_class = DiagnosticDeviceDataSerializer
    permission_classes = [IsClinicalStaff]


class OptometristDashboardSummaryView(APIView):
    """
    Database-backed summary values for the signed-in optometrist dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if user.role != User.Role.OPTOMETRIST:
            return Response(
                {"detail": "Only optometrists can access this dashboard summary."},
                status=status.HTTP_403_FORBIDDEN
            )

        today = timezone.localdate()
        acuity_tests = VisualAcuityTest.objects.all()

        return Response({
            "today_appointments": Appointment.objects.filter(
                doctor=user,
                slot__start_time__date=today
            ).count(),
            "acuity_tests": acuity_tests.count(),
            "abnormal_acuity": acuity_tests.exclude(
                od_acuity=NORMAL_SNELLEN_ACUITY,
                os_acuity=NORMAL_SNELLEN_ACUITY
            ).count(),
            "refractions_issued": Prescription.objects.filter(
                doctor=user,
                refraction_details__isnull=False
            ).count(),
            "clinical_records": MedicalRecord.objects.filter(doctor=user).count(),
        })
