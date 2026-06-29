from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.billing.views import InvoiceViewSet, InsuranceClaimViewSet, InventoryItemViewSet, OrderViewSet

app_name = 'billing'

router = DefaultRouter()
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('claims', InsuranceClaimViewSet, basename='claim')
router.register('inventory', InventoryItemViewSet, basename='inventory')
router.register('orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
