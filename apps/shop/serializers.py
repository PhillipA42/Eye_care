from rest_framework import serializers
from .models import Product, InventoryItem, Order, OrderItem


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'sku', 'description', 'item_type', 'unit_price', 'is_prescription_required']


class InventorySerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = InventoryItem
        fields = ['id', 'product', 'stock_level', 'location']


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'inventory_item', 'quantity', 'unit_price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'patient', 'status', 'total_amount', 'delivery_address', 'is_pickup', 'created_at', 'items', 'prescription']
        read_only_fields = ['patient', 'status', 'total_amount', 'created_at']
