import uuid
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from apps.billing.models import Invoice, InsuranceClaim, Payment, Receipt
from apps.billing.serializers import (
    InvoiceSerializer, InsuranceClaimSerializer, PaymentSerializer, ReceiptSerializer
)
from apps.users.permissions import IsPatient, IsReceptionist, IsPharmacistOrOptician, IsStaffUser
from apps.users.models import User

class InvoiceViewSet(viewsets.ModelViewSet):
    """
    Handle invoicing operations.
    Patients view their own; Staff manage invoices.
    """
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return Invoice.objects.filter(patient=user)
        return Invoice.objects.all()

    def perform_create(self, serializer):
        # Only staff can create invoices
        if self.request.user.role == User.Role.PATIENT:
            raise permissions.exceptions.PermissionDenied("Patients cannot generate invoices.")
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsPatient])
    def pay(self, request, pk=None):
        """
        Simulate a payment gateway transaction via Stripe.
        """
        invoice = self.get_object()
        if invoice.status == Invoice.PaymentStatus.PAID:
            return Response({"detail": "Invoice is already paid."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Payment Gateway Mock
        payment_method = request.data.get('payment_method_id', 'mock_card_token')
        
        invoice.status = Invoice.PaymentStatus.PAID
        invoice.stripe_payment_intent_id = f"pi_mock_{uuid.uuid4().hex[:12]}"
        invoice.save()
        
        return Response({
            "detail": "Payment simulated successfully.",
            "stripe_payment_intent_id": invoice.stripe_payment_intent_id,
            "status": invoice.status
        })


class InsuranceClaimViewSet(viewsets.ModelViewSet):
    """
    Manage insurance verification processes.
    Front Desk / Receptionists process submissions.
    """
    queryset = InsuranceClaim.objects.all()
    serializer_class = InsuranceClaimSerializer
    permission_classes = [IsReceptionist]

    @action(detail=True, methods=['post'])
    def process_approval(self, request, pk=None):
        """
        Receptionist approves or rejects claims with approved claim limits.
        """
        claim = self.get_object()
        claim_status = request.data.get('status')
        amount_approved = request.data.get('amount_approved', 0.00)
        
        if claim_status not in [InsuranceClaim.ClaimStatus.APPROVED, InsuranceClaim.ClaimStatus.REJECTED]:
            return Response({"detail": "Invalid claim status update."}, status=status.HTTP_400_BAD_REQUEST)
            
        claim.claim_status = claim_status
        if claim_status == InsuranceClaim.ClaimStatus.APPROVED:
            claim.amount_approved = amount_approved
            # Automatically update matched invoice status if fully paid by insurance
            if amount_approved >= claim.invoice.amount:
                claim.invoice.status = Invoice.PaymentStatus.PAID
                claim.invoice.save()
                
        claim.submitted_at = timezone.now()
        claim.save()
        
        return Response({
            "detail": f"Claim status updated to {claim_status}.",
            "claim_status": claim.claim_status,
            "amount_approved": claim.amount_approved
        })


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]

