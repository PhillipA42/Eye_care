import uuid
from rest_framework import viewsets, permissions, status, views
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from apps.appointments.models import AppointmentSlot, Appointment, QueueEntry
from apps.appointments.serializers import AppointmentSlotSerializer, AppointmentSerializer, QueueEntrySerializer
from apps.users.permissions import IsPatient, IsStaffUser
from apps.users.models import User

class AppointmentSlotViewSet(viewsets.ModelViewSet):
    """
    List available or booked appointment slots.
    Filtered by doctor, slot_type, and status.
    """
    queryset = AppointmentSlot.objects.all()
    serializer_class = AppointmentSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        # By default, patients only see future unbooked slots
        if self.request.user.role == User.Role.PATIENT:
            queryset = queryset.filter(is_booked=False, start_time__gt=timezone.now())

        doctor_id = self.request.query_params.get('doctor_id')
        doctor = self.request.query_params.get('doctor')
        department_id = self.request.query_params.get('department_id')
        slot_type = self.request.query_params.get('slot_type')
        is_booked = self.request.query_params.get('is_booked')
        
        if doctor_id or doctor:
            queryset = queryset.filter(doctor_id=doctor_id or doctor)
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        if slot_type:
            queryset = queryset.filter(slot_type=slot_type)
        if is_booked in ['true', 'false', 'True', 'False', '1', '0']:
            queryset = queryset.filter(is_booked=is_booked.lower() in ['true', '1'])
            
        return queryset.order_by('start_time')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [User.Role.OPHTHALMOLOGIST, User.Role.OPTOMETRIST]:
            raise permissions.exceptions.PermissionDenied("Only clinical staff can publish appointment slots.")

        doctor = serializer.validated_data.get('doctor')
        if doctor != user:
            raise permissions.exceptions.PermissionDenied("Clinicians can only publish their own appointment slots.")

        serializer.save()


class AppointmentSlotTypeListView(views.APIView):
    """
    Appointment slot types exposed from the backend for frontend option lists.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response([
            {'value': value, 'label': label}
            for value, label in AppointmentSlot.SlotType.choices
        ])


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    Handle patient booking and appointment listings.
    Patients see their own appointments; staff see all.
    """
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return Appointment.objects.filter(patient=user).order_by('-slot__start_time')
        # Staff can see all appointments
        return Appointment.objects.all().order_by('-slot__start_time')

    def perform_create(self, serializer):
        # Transaction ensures slot booking state changes atomically
        with transaction.atomic():
            slot = serializer.validated_data['slot']
            slot.is_booked = True
            slot.save()
            
            # Automatically assign teleconsultation room ID for video slots
            room_id = None
            if slot.slot_type == AppointmentSlot.SlotType.TELECONSULTATION:
                room_id = f"room-{uuid.uuid4()}"
                
            serializer.save(
                patient=self.request.user,
                teleconsultation_room_id=room_id
            )


class TeleconsultationRoomTokenView(views.APIView):
    """
    Generate a mock Agora/WebRTC signaling token for a specific video consultation.
    Only accessible by the scheduled patient or doctor.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, appointment_id, *args, **kwargs):
        try:
            appointment = Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        # Enforce strict object-level validation
        if request.user != appointment.patient and request.user != appointment.doctor:
            return Response({"error": "Unauthorized access to this consultation room."}, status=status.HTTP_403_FORBIDDEN)

        if appointment.slot.slot_type != AppointmentSlot.SlotType.TELECONSULTATION:
            return Response({"error": "This appointment is not scheduled for virtual teleconsultation."}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a room ID if it does not exist yet
        if not appointment.teleconsultation_room_id:
            appointment.teleconsultation_room_id = f"room-{uuid.uuid4()}"
            appointment.save()

        # Mock Agora/WebRTC values
        return Response({
            "appointment_id": appointment.id,
            "room_id": appointment.teleconsultation_room_id,
            "agora_app_id": "mock-agora-app-id-7a8e9d",
            "token": f"mock-token-token-{uuid.uuid4()}",
            "expires_in": 7200,
            "user_role": "publisher" if request.user.role in [User.Role.OPHTHALMOLOGIST, User.Role.OPTOMETRIST] else "subscriber"
        })


class QueueEntryViewSet(viewsets.ModelViewSet):
    """
    Manage the physical clinic queue check-ins and priorities.
    Available to staff.
    """
    queryset = QueueEntry.objects.all()
    serializer_class = QueueEntrySerializer
    permission_classes = [IsStaffUser]
