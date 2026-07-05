from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.billing.views import InvoiceViewSet, InsuranceClaimViewSet, PaymentViewSet, ReceiptViewSet

app_name = 'billing'

router = DefaultRouter()
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('claims', InsuranceClaimViewSet, basename='claim')
router.register('payments', PaymentViewSet, basename='payment')
router.register('receipts', ReceiptViewSet, basename='receipt')

urlpatterns = [
    path('', include(router.urls)),
]
