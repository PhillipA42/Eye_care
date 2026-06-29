from django.db import models
from django.conf import settings

class Invoice(models.Model):
    class PaymentStatus(models.TextChoices):
        UNPAID = 'UNPAID', 'Unpaid'
        PAID = 'PAID', 'Paid'
        PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
        REFUNDED = 'REFUNDED', 'Refunded'

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invoices',
        limit_choices_to={'role': 'PATIENT'}
    )
    appointment = models.OneToOneField(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice #{self.id} - {self.patient.username} (${self.amount})"

class InsuranceClaim(models.Model):
    class ClaimStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        PAID = 'PAID', 'Paid'

    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name='insurance_claim')
    insurance_provider = models.CharField(max_length=100)
    policy_number = models.CharField(max_length=50)
    pre_auth_code = models.CharField(max_length=50, blank=True, null=True)
    claim_status = models.CharField(max_length=20, choices=ClaimStatus.choices, default=ClaimStatus.DRAFT)
    amount_claimed = models.DecimalField(max_digits=10, decimal_places=2)
    amount_approved = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    submitted_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Claim #{self.id} for Invoice #{self.invoice.id} ({self.claim_status})"

class InventoryItem(models.Model):
    class ItemType(models.TextChoices):
        MEDICATION = 'MEDICATION', 'Medication'
        GLASSES_FRAME = 'GLASSES_FRAME', 'Glasses Frame'
        GLASSES_LENS = 'GLASSES_LENS', 'Glasses Lens'
        CONTACT_LENS = 'CONTACT_LENS', 'Contact Lenses'
        ACCESSORY = 'ACCESSORY', 'Accessory / Eye Drops'

    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, unique=True)
    item_type = models.CharField(max_length=20, choices=ItemType.choices)
    stock_level = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['item_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku}) - Qty: {self.stock_level}"

class Order(models.Model):
    class OrderStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending Payment'
        PROCESSING = 'PROCESSING', 'Processing / Dispensing'
        SHIPPED = 'SHIPPED', 'Out for Delivery / Ready for Pickup'
        DELIVERED = 'DELIVERED', 'Delivered / Fulfilled'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class OrderType(models.TextChoices):
        MEDICATION = 'MEDICATION', 'Medication Order'
        OPTICAL = 'OPTICAL', 'Optical Order (Glasses/Contacts)'

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        limit_choices_to={'role': 'PATIENT'}
    )
    prescription = models.ForeignKey(
        'medical_records.Prescription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    order_type = models.CharField(max_length=20, choices=OrderType.choices)
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    delivery_address = models.TextField(blank=True, null=True, help_text="Empty if in-clinic pickup")
    is_pickup = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} - {self.patient.username} ({self.status})"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name='order_items')
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Historical price at purchase time")

    def __str__(self):
        return f"{self.quantity} x {self.inventory_item.name} for Order #{self.order.id}"
