from rest_framework import serializers
from apps.billing.models import Invoice, InsuranceClaim, Payment, Receipt
from apps.users.serializers import UserSerializer

class InvoiceSerializer(serializers.ModelSerializer):
    patient_details = UserSerializer(source='patient', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'patient', 'patient_details', 'appointment', 'shop_order', 'amount',
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


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = '__all__'

