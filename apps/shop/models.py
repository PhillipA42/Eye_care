from django.db import models
from django.conf import settings


class Product(models.Model):
    MEDICATION = 'MEDICATION'
    FRAME = 'FRAME'
    LENS = 'LENS'
    ACCESSORY = 'ACCESSORY'

    ITEM_TYPES = [
        (MEDICATION, 'Medication'),
        (FRAME, 'Frame'),
        (LENS, 'Lens'),
        (ACCESSORY, 'Accessory')
    ]

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    item_type = models.CharField(max_length=32, choices=ITEM_TYPES, default=MEDICATION)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_prescription_required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.sku})"


class InventoryItem(models.Model):
    product = models.ForeignKey(Product, related_name='inventory', on_delete=models.CASCADE)
    stock_level = models.IntegerField(default=0)
    location = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('product', 'location')
        

    def __str__(self):
        return f"{self.product.name} @ {self.location or 'default'}"


class Order(models.Model):
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (COMPLETED, 'Completed'),
        (CANCELLED, 'Cancelled')
    ]

    patient = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='shop_orders', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_address = models.TextField(blank=True)
    is_pickup = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # link to the medical_records.Prescription model (prescriptions are stored in medical_records)
    prescription = models.ForeignKey('medical_records.Prescription', null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"Order #{self.id} by {self.patient} - {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    inventory_item = models.ForeignKey(InventoryItem, null=True, blank=True, on_delete=models.SET_NULL)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def line_total(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"


class PrescriptionRequirement(models.Model):
    product = models.ForeignKey(Product, related_name='prescription_requirements', on_delete=models.CASCADE)
    # link to a prescription model in existing apps; we'll validate on order
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Prescription requirement for {self.product.name}"