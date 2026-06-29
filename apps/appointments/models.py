from django.db import models
from django.conf import settings

class AppointmentSlot(models.Model):
    class SlotType(models.TextChoices):
        TELECONSULTATION = 'TELECONSULTATION', 'Remote Video Consultation (15 min)'
        PHYSICAL_EXAM = 'PHYSICAL_EXAM', 'Physical Exam (30 min)'
        DIAGNOSTIC_SCAN = 'DIAGNOSTIC_SCAN', 'Physical Diagnostic / Scan (45 min)'
        SURGERY = 'SURGERY', 'In-Person Surgery / Procedure (60+ min)'

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='slots_created',
        limit_choices_to={'role__in': ['OPHTHALMOLOGIST', 'OPTOMETRIST']}
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    slot_type = models.CharField(max_length=30, choices=SlotType.choices, default=SlotType.TELECONSULTATION)
    is_booked = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['doctor', 'start_time']),
            models.Index(fields=['is_booked']),
            models.Index(fields=['slot_type']),
        ]

    def __str__(self):
        return f"{self.doctor.get_full_name()} - {self.slot_type} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"

class Appointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'
        NO_SHOW = 'NO_SHOW', 'No Show'

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appointments_as_patient',
        limit_choices_to={'role': 'PATIENT'}
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='appointments_as_doctor',
        limit_choices_to={'role__in': ['OPHTHALMOLOGIST', 'OPTOMETRIST']}
    )
    slot = models.OneToOneField(AppointmentSlot, on_delete=models.PROTECT, related_name='appointment')
    triage_entry = models.OneToOneField(
        'medical_records.TriageEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointment'
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    teleconsultation_room_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="WebRTC/Agora Room Identifier for Video Calls"
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['patient']),
            models.Index(fields=['doctor']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Appt: {self.patient.username} w/ {self.doctor.username} on {self.slot.start_time.date()}"

class QueueEntry(models.Model):
    class QueueStatus(models.TextChoices):
        WAITING = 'WAITING', 'Waiting'
        CALLED = 'CALLED', 'Called in'
        COMPLETED = 'COMPLETED', 'Completed'
        LEFT = 'LEFT', 'Left without being seen'

    class Priority(models.TextChoices):
        NORMAL = 'NORMAL', 'Normal'
        URGENT = 'URGENT', 'Urgent / Dilated Scan'
        EMERGENCY = 'EMERGENCY', 'Emergency'

    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='queue_entry')
    check_in_time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=QueueStatus.choices, default=QueueStatus.WAITING)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['priority', 'check_in_time']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
        ]

    def __str__(self):
        return f"Queue #{self.id} - {self.appointment.patient.username} ({self.get_priority_display()})"
