from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User
from apps.billing.models import Invoice, InsuranceClaim, InventoryItem, Order

class BillingAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.patient = User.objects.create_user(
            username='patient1', password='password123', role=User.Role.PATIENT
        )
        self.receptionist = User.objects.create_user(
            username='recept1', password='password123', role=User.Role.RECEPTIONIST
        )
        self.pharmacist = User.objects.create_user(
            username='pharm1', password='password123', role=User.Role.PHARMACIST
        )

        # Create inventory items
        self.med_item = InventoryItem.objects.create(
            name='Dilating Drops',
            sku='MED-DROP-01',
            item_type=InventoryItem.ItemType.MEDICATION,
            stock_level=10,
            unit_price=15.00
        )

        self.invoice = Invoice.objects.create(
            patient=self.patient,
            amount=50.00,
            status=Invoice.PaymentStatus.UNPAID
        )

        self.orders_url = reverse('billing:order-list')

    def test_patient_can_pay_invoice_via_stripe_mock(self):
        """
        Verify that patients can execute mock Stripe payment intents.
        """
        self.client.force_authenticate(user=self.patient)
        pay_url = reverse('billing:invoice-pay', args=[self.invoice.id])
        
        response = self.client.post(pay_url, {'payment_method_id': 'tok_visa'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('stripe_payment_intent_id', response.data)
        
        # Verify db update
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, Invoice.PaymentStatus.PAID)

    def test_receptionist_can_approve_insurance_claim(self):
        """
        Verify receptionist can process claim approval and trigger invoice status changes.
        """
        claim = InsuranceClaim.objects.create(
            invoice=self.invoice,
            insurance_provider='Cigna',
            policy_number='CG-888',
            amount_claimed=50.00
        )
        
        claim_url = reverse('billing:claim-process-approval', args=[claim.id])
        
        # Patient cannot process -> 403 Forbidden
        self.client.force_authenticate(user=self.patient)
        response = self.client.post(claim_url, {'status': 'APPROVED', 'amount_approved': 50.00}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Receptionist processes -> 200 OK
        self.client.force_authenticate(user=self.receptionist)
        response = self.client.post(claim_url, {'status': 'APPROVED', 'amount_approved': 50.00}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify db checks
        claim.refresh_from_db()
        self.assertEqual(claim.claim_status, InsuranceClaim.ClaimStatus.APPROVED)
        self.assertEqual(claim.invoice.status, Invoice.PaymentStatus.PAID)

    def test_order_creation_deducts_inventory_levels(self):
        """
        Verify that placing a medication order reduces stock.
        """
        self.client.force_authenticate(user=self.patient)
        
        order_data = {
            'order_type': Order.OrderType.MEDICATION,
            'delivery_address': '123 Remote Road',
            'items': [
                {
                    'inventory_item': self.med_item.id,
                    'quantity': 2
                }
            ]
        }
        
        response = self.client.post(self.orders_url, order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Stock should fall from 10 to 8
        self.med_item.refresh_from_db()
        self.assertEqual(self.med_item.stock_level, 8)
