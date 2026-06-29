from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, InventoryViewSet, OrderViewSet

app_name = 'shop'

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='shop-products')
router.register(r'inventory', InventoryViewSet, basename='shop-inventory')
router.register(r'orders', OrderViewSet, basename='shop-orders')

urlpatterns = [
    path('', include(router.urls)),
]
