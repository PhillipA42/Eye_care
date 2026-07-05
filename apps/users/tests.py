from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User

class UsersAuthAPITests(APITestCase):
    def setUp(self):
        self.register_url = reverse('users:patient_register')
        self.login_url = reverse('users:token_obtain')
        self.profile_url = reverse('users:profile_detail')
        self.department_url = reverse('users:department-list')
        
        self.user_data = {
            'username': 'testpatient',
            'email': 'patient@example.com',
            'password': 'securepassword123',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '1234567890',
            'patient_profile': {
                'insurance_provider': 'Blue Shield',
                'insurance_policy_number': 'BS-12345'
            }
        }

    def test_patient_registration(self):
        """
        Verify that patients can register through the public signup endpoint.
        """
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'testpatient')
        
        # Verify user is created with PATIENT role
        user = User.objects.get(username='testpatient')
        self.assertEqual(user.role, User.Role.PATIENT)
        self.assertEqual(user.patient_profile.insurance_provider, 'Blue Shield')

    def test_patient_login_and_token_retrieval(self):
        """
        Verify that a registered patient can login and obtain their token.
        """
        # Create user first
        self.client.post(self.register_url, self.user_data, format='json')
        
        # Try to login
        login_credentials = {
            'username': 'testpatient',
            'password': 'securepassword123'
        }
        response = self.client.post(self.login_url, login_credentials, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['role'], 'PATIENT')

    def test_unauthenticated_profile_access_denied(self):
        """
        Verify that accessing profile without token yields 401 Unauthorized.
        """
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_profile_access_success(self):
        """
        Verify that logged-in patient can fetch their profile.
        """
        # Register and Login
        self.client.post(self.register_url, self.user_data, format='json')
        login_credentials = {
            'username': 'testpatient',
            'password': 'securepassword123'
        }
        login_response = self.client.post(self.login_url, login_credentials, format='json')
        token = login_response.data['token']
        
        # Query profile using token header
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testpatient')
        self.assertEqual(response.data['patient_profile']['insurance_provider'], 'Blue Shield')

    def test_department_list_access(self):
        """
        Verify that active departments can be retrieved by authenticated users,
        and unauthenticated requests are blocked.
        """
        # Unauthenticated request should be denied
        response = self.client.get(self.department_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Register and Login to get a token
        self.client.post(self.register_url, self.user_data, format='json')
        login_credentials = {
            'username': 'testpatient',
            'password': 'securepassword123'
        }
        login_response = self.client.post(self.login_url, login_credentials, format='json')
        token = login_response.data['token']
        
        # Authenticated request should succeed
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        response = self.client.get(self.department_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify the seeded departments are returned
        self.assertTrue(len(response.data) > 0)
        # Check specific field keys
        self.assertIn('code', response.data[0])
        self.assertIn('name', response.data[0])
        self.assertIn('is_clinical', response.data[0])

