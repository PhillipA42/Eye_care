from rest_framework import serializers
from .models import Product, InventoryItem, Order, OrderItem
from django.contrib.auth import get_user_model

User = get_user_model()


class PatientDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'date_of_birth', 'gender', 'address']


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 'item_type', 'unit_price', 'is_prescription_required',
            'generic_name', 'brand_name', 'manufacturer', 'strength', 'dosage_form', 'storage_instructions', 'barcode'
        ]


class InventorySerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True, required=False
    )

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'product', 'product_id', 'stock_level', 'location', 
            'batch_number', 'supplier', 'reorder_level', 'expiry_date', 'price', 'image_url'
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'inventory_item', 'quantity', 'unit_price']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    patient_details = PatientDetailSerializer(source='patient', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'patient', 'patient_details', 'status', 'total_amount', 
            'delivery_address', 'is_pickup', 'created_at', 'items', 'prescription'
        ]
        read_only_fields = ['patient', 'total_amount', 'created_at']
