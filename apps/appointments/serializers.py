from rest_framework import serializers
from apps.appointments.models import AppointmentSlot, Appointment, QueueEntry
from apps.users.serializers import UserSerializer

class AppointmentSlotSerializer(serializers.ModelSerializer):
    doctor_details = UserSerializer(source='doctor', read_only=True)

    class Meta:
        model = AppointmentSlot
        fields = [
            'id', 'doctor', 'doctor_details', 'start_time', 'end_time',
            'slot_type', 'is_booked'
        ]
        read_only_fields = ['is_booked']


class AppointmentSerializer(serializers.ModelSerializer):
    patient_details = UserSerializer(source='patient', read_only=True)
    doctor_details = UserSerializer(source='doctor', read_only=True)
    slot_details = AppointmentSlotSerializer(source='slot', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_details', 'doctor', 'doctor_details',
            'slot', 'slot_details', 'triage_entry', 'status',
            'teleconsultation_room_id', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['patient', 'teleconsultation_room_id', 'created_at', 'updated_at']

    def validate_slot(self, value):
        if value.is_booked:
            raise serializers.ValidationError("This appointment slot is already booked.")
        return value


class QueueEntrySerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='appointment.patient.username', read_only=True)

    class Meta:
        model = QueueEntry
        fields = [
            'id', 'appointment', 'patient_name', 'check_in_time', 'status', 'priority', 'notes'
        ]
        read_only_fields = ['check_in_time']

