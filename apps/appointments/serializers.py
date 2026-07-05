from datetime import timedelta

from rest_framework import serializers
from apps.appointments.models import AppointmentSlot, Appointment, QueueEntry
from apps.users.serializers import UserSerializer, DepartmentSerializer

class AppointmentSlotSerializer(serializers.ModelSerializer):
    doctor_details = UserSerializer(source='doctor', read_only=True)
    department_details = DepartmentSerializer(source='department', read_only=True)
    slot_type_label = serializers.CharField(source='get_slot_type_display', read_only=True)
    duration_minutes = serializers.IntegerField(write_only=True, required=False, min_value=1)
    capacity = serializers.IntegerField(write_only=True, required=False, min_value=1)
    is_virtual = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = AppointmentSlot
        fields = [
            'id', 'doctor', 'doctor_details', 'department', 'department_details',
            'start_time', 'end_time', 'duration_minutes', 'slot_type', 'slot_type_label',
            'is_booked', 'capacity', 'is_virtual'
        ]
        read_only_fields = ['is_booked']
        extra_kwargs = {
            'end_time': {'required': False},
        }

    def validate(self, attrs):
        if not attrs.get('end_time') and not attrs.get('duration_minutes'):
            raise serializers.ValidationError({
                'end_time': 'Provide end_time or duration_minutes.'
            })
        return attrs

    def create(self, validated_data):
        duration_minutes = validated_data.pop('duration_minutes', None)
        validated_data.pop('capacity', None)
        validated_data.pop('is_virtual', None)

        if duration_minutes and not validated_data.get('end_time'):
            validated_data['end_time'] = validated_data['start_time'] + timedelta(minutes=duration_minutes)

        if not validated_data.get('department'):
            staff_profile = getattr(validated_data['doctor'], 'staff_profile', None)
            validated_data['department'] = getattr(staff_profile, 'department', None)

        return super().create(validated_data)


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
