from django.urls import path
from apps.users.views import CustomObtainAuthToken, PatientRegistrationView, UserProfileView

app_name = 'users'

urlpatterns = [
    path('auth/token/', CustomObtainAuthToken.as_view(), name='token_obtain'),
    path('auth/register/', PatientRegistrationView.as_view(), name='patient_register'),
    path('profile/', UserProfileView.as_view(), name='profile_detail'),
]
