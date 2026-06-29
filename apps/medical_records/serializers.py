from rest_framework import serializers
from apps.medical_records.models import (
    TriageEntry, VisualAcuityTest, Prescription, 
    RefractionPrescription, MedicationItem, MedicalRecord, DiagnosticDeviceData
)
from apps.users.serializers import UserSerializer
from apps.medical_records.encryption import encrypt_text, decrypt_text

class TriageEntrySerializer(serializers.ModelSerializer):
    patient_details = UserSerializer(source='patient', read_only=True)

    class Meta:
        model = TriageEntry
        fields = [
            'id', 'patient', 'patient_details', 'symptoms',
            'urgency_level', 'ai_recommendation', 'created_at'
        ]
        read_only_fields = ['patient', 'urgency_level', 'ai_recommendation', 'created_at']

    def validate_symptoms(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Symptoms must be structured as a dictionary of key-value answers.")
        return value


class VisualAcuityTestSerializer(serializers.ModelSerializer):
    patient_details = UserSerializer(source='patient', read_only=True)

    class Meta:
        model = VisualAcuityTest
        fields = [
            'id', 'patient', 'patient_details', 'test_date',
            'distance_feet', 'od_acuity', 'os_acuity', 'is_self_test', 'device_info'
        ]
        read_only_fields = ['patient', 'test_date']


class MedicationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationItem
        fields = ['id', 'drug_name', 'dosage', 'frequency', 'duration_days', 'instructions']


class RefractionPrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefractionPrescription
        fields = [
            'id', 'od_sphere', 'od_cylinder', 'od_axis', 'od_add',
            'os_sphere', 'os_cylinder', 'os_axis', 'os_add', 'pupillary_distance'
        ]


class PrescriptionSerializer(serializers.ModelSerializer):
    patient_details = UserSerializer(source='patient', read_only=True)
    doctor_details = UserSerializer(source='doctor', read_only=True)
    medication_items = MedicationItemSerializer(many=True, required=False)
    refraction_details = RefractionPrescriptionSerializer(required=False)

    class Meta:
        model = Prescription
        fields = [
            'id', 'patient', 'patient_details', 'doctor', 'doctor_details',
            'notes', 'is_signed', 'signature_hash', 'signed_at',
            'medication_items', 'refraction_details', 'created_at'
        ]
        read_only_fields = ['doctor', 'is_signed', 'signature_hash', 'signed_at', 'created_at']

    def create(self, validated_data):
        med_data = validated_data.pop('medication_items', [])
        ref_data = validated_data.pop('refraction_details', None)
        
        prescription = Prescription.objects.create(**validated_data)
        
        for item in med_data:
            MedicationItem.objects.create(prescription=prescription, **item)
        if ref_data:
            RefractionPrescription.objects.create(prescription=prescription, **ref_data)
            
        return prescription


class DiagnosticDeviceDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticDeviceData
        fields = ['id', 'medical_record', 'device_type', 'measured_at', 'raw_data_json', 'scan_file']


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_details = UserSerializer(source='patient', read_only=True)
    doctor_details = UserSerializer(source='doctor', read_only=True)
    device_data = DiagnosticDeviceDataSerializer(many=True, read_only=True)
    clinical_notes = serializers.CharField(write_only=True, required=False)
    decrypted_notes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'patient', 'patient_details', 'doctor', 'doctor_details',
            'created_at', 'visit_type', 'chief_complaint', 'diagnosis_codes',
            'treatment_plan', 'is_encrypted', 'clinical_notes', 'decrypted_notes',
            'device_data'
        ]
        read_only_fields = ['doctor', 'created_at']

    def get_decrypted_notes(self, obj):
        # Decrypt notes only if the user is authorized (authenticated and either the patient or doctor)
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return "[Unauthorized]"
        if request.user != obj.patient and request.user != obj.doctor and request.user.role not in ['OPHTHALMOLOGIST', 'OPTOMETRIST']:
            return "[Access Denied]"
        
        if obj.is_encrypted and obj.encrypted_clinical_notes:
            return decrypt_text(obj.encrypted_clinical_notes)
        return ""

    def create(self, validated_data):
        clinical_notes = validated_data.pop('clinical_notes', '')
        
        # Automatically encrypt patient clinical findings
        if clinical_notes:
            validated_data['encrypted_clinical_notes'] = encrypt_text(clinical_notes)
            validated_data['is_encrypted'] = True
            
        return MedicalRecord.objects.create(**validated_data)
