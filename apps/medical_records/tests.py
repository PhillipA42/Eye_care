from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User
from apps.medical_records.models import Prescription, MedicalRecord

class MedicalRecordsAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.patient = User.objects.create_user(
            username='patient1', password='password123', role=User.Role.PATIENT
        )
        self.doctor = User.objects.create_user(
            username='doctor1', password='password123', role=User.Role.OPHTHALMOLOGIST
        )
        self.other_doctor = User.objects.create_user(
            username='doctor2', password='password123', role=User.Role.OPHTHALMOLOGIST
        )
        self.receptionist = User.objects.create_user(
            username='recept1', password='password123', role=User.Role.RECEPTIONIST
        )

        # Prescription URLS
        self.presc_list_url = reverse('medical_records:prescription-list')
        self.record_list_url = reverse('medical_records:record-list')

    def test_clinician_can_write_medical_record_with_encryption(self):
        """
        Verify that clinical staff can create a medical record, and details are stored encrypted.
        """
        self.client.force_authenticate(user=self.doctor)
        
        record_data = {
            'patient': self.patient.id,
            'chief_complaint': 'Severe blurriness in right eye',
            'diagnosis_codes': 'H52.13',
            'treatment_plan': 'Prescribed correction lenses and drops',
            'clinical_notes': 'Slight macular drusen observed. Suspected early dry AMD.'
        }
        
        response = self.client.post(self.record_list_url, record_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify db field-level encryption
        record_id = response.data['id']
        db_record = MedicalRecord.objects.get(id=record_id)
        
        self.assertTrue(db_record.is_encrypted)
        # Check that in DB it is binary ciphertext, not cleartext
        self.assertNotEqual(db_record.encrypted_clinical_notes, b'Slight macular drusen observed. Suspected early dry AMD.')
        
        # Verify that fetching via API returns decrypted notes for doctor
        self.assertEqual(response.data['decrypted_notes'], 'Slight macular drusen observed. Suspected early dry AMD.')

    def test_non_clinician_cannot_write_medical_record(self):
        """
        Verify that receptionists or patients cannot write medical records.
        """
        self.client.force_authenticate(user=self.receptionist)
        record_data = {
            'patient': self.patient.id,
            'chief_complaint': 'Checkup',
            'treatment_plan': 'None'
        }
        response = self.client.post(self.record_list_url, record_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_digital_prescription_signing(self):
        """
        Verify that prescription can be signed only by the issuing doctor.
        """
        # Create prescription
        prescription = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            notes='Use eye drops twice daily.'
        )
        
        sign_url = reverse('medical_records:prescription-sign', args=[prescription.id])
        
        # Patient tries to sign -> Access Denied
        self.client.force_authenticate(user=self.patient)
        response = self.client.post(sign_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Other doctor tries to sign -> Access Denied
        self.client.force_authenticate(user=self.other_doctor)
        response = self.client.post(sign_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Issuing doctor signs -> Approved
        self.client.force_authenticate(user=self.doctor)
        response = self.client.post(sign_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('signature_hash', response.data)
        
        db_presc = Prescription.objects.get(id=prescription.id)
        self.assertTrue(db_presc.is_signed)
