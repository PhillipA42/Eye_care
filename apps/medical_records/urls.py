from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.medical_records.views import (
    TriageViewSet, VisualAcuityTestViewSet, PrescriptionViewSet,
    MedicalRecordViewSet, DiagnosticDeviceDataViewSet
)

app_name = 'medical_records'

router = DefaultRouter()
router.register('triage', TriageViewSet, basename='triage')
router.register('acuity-tests', VisualAcuityTestViewSet, basename='acuity-test')
router.register('prescriptions', PrescriptionViewSet, basename='prescription')
router.register('records', MedicalRecordViewSet, basename='record')
router.register('device-data', DiagnosticDeviceDataViewSet, basename='device-data')

urlpatterns = [
    path('', include(router.urls)),
]
