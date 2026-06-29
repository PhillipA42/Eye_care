from rest_framework import serializers
from apps.billing.models import Invoice, InsuranceClaim, InventoryItem, Order, OrderItem
from apps.users.serializers import UserSerializer
from apps.medical_records.serializers import PrescriptionSerializer

class InvoiceSerializer(serializers.ModelSerializer):
    patient_details = UserSerializer(source='patient', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'patient', 'patient_details', 'appointment', 'amount',
            'status', 'stripe_payment_intent_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['patient', 'stripe_payment_intent_id', 'created_at', 'updated_at']


class InsuranceClaimSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceClaim
        fields = [
            'id', 'invoice', 'insurance_provider', 'policy_number',
            'pre_auth_code', 'claim_status', 'amount_claimed',
            'amount_approved', 'submitted_at', 'updated_at'
        ]
        read_only_fields = ['submitted_at', 'updated_at']


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = ['id', 'name', 'sku', 'item_type', 'stock_level', 'unit_price', 'description']


class OrderItemSerializer(serializers.ModelSerializer):
    inventory_item_details = InventoryItemSerializer(source='inventory_item', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'inventory_item', 'inventory_item_details', 'quantity', 'price']
        read_only_fields = ['price']


class OrderSerializer(serializers.ModelSerializer):
    patient_details = UserSerializer(source='patient', read_only=True)
    prescription_details = PrescriptionSerializer(source='prescription', read_only=True)
    items = OrderItemSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = [
            'id', 'patient', 'patient_details', 'prescription', 'prescription_details',
            'order_type', 'status', 'delivery_address', 'is_pickup',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['patient', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)
        
        for item_data in items_data:
            inv_item = item_data['inventory_item']
            # Historical pricing lock
            OrderItem.objects.create(
                order=order,
                inventory_item=inv_item,
                quantity=item_data['quantity'],
                price=inv_item.unit_price
            )
            # Auto deduct inventory level on order placement
            inv_item.stock_level = max(0, inv_item.stock_level - item_data['quantity'])
            inv_item.save()
            
        return order
