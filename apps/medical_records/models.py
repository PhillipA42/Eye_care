from django.db import models
from django.conf import settings

class TriageEntry(models.Model):
    class Urgency(models.TextChoices):
        LOW = 'LOW', 'Low Urgency'
        MEDIUM = 'MEDIUM', 'Medium Urgency'
        HIGH = 'HIGH', 'High Urgency'
        EMERGENCY = 'EMERGENCY', 'Immediate Action Required'

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='triage_entries',
        limit_choices_to={'role': 'PATIENT'}
    )
    symptoms = models.JSONField(help_text="Key-value pair of symptoms input by patient, e.g. {'blurry_vision': true, 'pain_level': 5}")
    urgency_level = models.CharField(max_length=20, choices=Urgency.choices, default=Urgency.LOW)
    ai_recommendation = models.TextField(blank=True, null=True, help_text="AI system recommendation or routing notes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Triage {self.patient.username} - {self.urgency_level} ({self.created_at.date()})"

class VisualAcuityTest(models.Model):
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='visual_acuity_tests',
        limit_choices_to={'role': 'PATIENT'}
    )
    test_date = models.DateTimeField(auto_now_add=True)
    distance_feet = models.IntegerField(default=10, help_text="Calibrated test distance (typically 10 or 20 feet)")
    
    # Acuity stored as Snellen fraction representation (e.g. '20/20', '20/40')
    od_acuity = models.CharField(max_length=10, help_text="Oculus Dexter (Right Eye) Acuity")
    os_acuity = models.CharField(max_length=10, help_text="Oculus Sinister (Left Eye) Acuity")
    
    is_self_test = models.BooleanField(default=True, help_text="True if taken at home by patient; False if verified in-clinic")
    device_info = models.CharField(max_length=255, blank=True, null=True, help_text="Screen size and browser calibration metadata")

    class Meta:
        ordering = ['-test_date']

    def __str__(self):
        return f"Acuity: {self.patient.username} - R:{self.od_acuity} L:{self.os_acuity}"

class Prescription(models.Model):
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='prescriptions_received',
        limit_choices_to={'role': 'PATIENT'}
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='prescriptions_written',
        limit_choices_to={'role__in': ['OPHTHALMOLOGIST', 'OPTOMETRIST']}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True, help_text="General instructions")
    
    # Digital Signature for verification/compliance
    is_signed = models.BooleanField(default=False)
    signature_hash = models.CharField(max_length=256, blank=True, null=True, help_text="SHA-256 hash representing doctor's digital signature")
    signed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Prescription #{self.id} for {self.patient.username}"

class RefractionPrescription(models.Model):
    prescription = models.OneToOneField(Prescription, on_delete=models.CASCADE, related_name='refraction_details')
    
    # Right Eye (OD)
    od_sphere = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Sphere (SPH)")
    od_cylinder = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, blank=True, null=True, help_text="Cylinder (CYL)")
    od_axis = models.IntegerField(blank=True, null=True, help_text="Axis (0-180)")
    od_add = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, blank=True, null=True, help_text="Reading Add")
    
    # Left Eye (OS)
    os_sphere = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Sphere (SPH)")
    os_cylinder = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, blank=True, null=True, help_text="Cylinder (CYL)")
    os_axis = models.IntegerField(blank=True, null=True, help_text="Axis (0-180)")
    os_add = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, blank=True, null=True, help_text="Reading Add")
    
    pupillary_distance = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True, help_text="PD in mm")

class MedicationItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='medication_items')
    drug_name = models.CharField(max_length=150)
    dosage = models.CharField(max_length=50, help_text="e.g. 1 drop, 500mg")
    frequency = models.CharField(max_length=100, help_text="e.g. Twice daily, Once every 4 hours")
    duration_days = models.IntegerField(default=7)
    instructions = models.TextField(blank=True, null=True)

class MedicalRecord(models.Model):
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medical_records',
        limit_choices_to={'role': 'PATIENT'}
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultations_logged',
        limit_choices_to={'role__in': ['OPHTHALMOLOGIST', 'OPTOMETRIST']}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    visit_type = models.CharField(
        max_length=30,
        choices=[
            ('TELECONSULTATION', 'Remote Video Consultation'),
            ('PHYSICAL_EXAM', 'Physical Exam'),
            ('DIAGNOSTIC_SCAN', 'Physical Diagnostic / Scan'),
            ('SURGERY', 'In-Person Surgery / Procedure')
        ],
        default='TELECONSULTATION'
    )
    
    # Clinical fields
    chief_complaint = models.TextField()
    diagnosis_codes = models.CharField(max_length=100, blank=True, null=True, help_text="ICD-10 codes separated by commas")
    treatment_plan = models.TextField()
    
    # Encryption layers
    is_encrypted = models.BooleanField(default=False)
    encrypted_clinical_notes = models.BinaryField(blank=True, null=True, help_text="Ciphertext of detailed clinical examinations")

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Record: {self.patient.username} - {self.created_at.date()}"

class DiagnosticDeviceData(models.Model):
    class DeviceType(models.TextChoices):
        AUTOREFRACTOR = 'AUTOREFRACTOR', 'Autorefractor'
        OCT_SCANNER = 'OCT_SCANNER', 'Optical Coherence Tomography (OCT) Scanner'
        TONOMETER = 'TONOMETER', 'Tonometer (Intraocular Pressure)'
        PENTACAM = 'PENTACAM', 'Pentacam / Corneal Topographer'

    medical_record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='device_data')
    device_type = models.CharField(max_length=50, choices=DeviceType.choices)
    measured_at = models.DateTimeField()
    raw_data_json = models.JSONField(help_text="Structured measurements from the device (e.g. {'IOP_OD': 14, 'IOP_OS': 15})")
    scan_file = models.FileField(upload_to='scans/', blank=True, null=True, help_text="Raw scanned file PDF/Image")

    class Meta:
        ordering = ['-measured_at']

    def __str__(self):
        return f"{self.get_device_type_display()} for Record #{self.medical_record.id}"
