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

    # Medical fields for Pharmacist Dashboard
    generic_name = models.CharField(max_length=255, blank=True, default="")
    brand_name = models.CharField(max_length=255, blank=True, default="")
    manufacturer = models.CharField(max_length=255, blank=True, default="")
    strength = models.CharField(max_length=100, blank=True, default="")
    dosage_form = models.CharField(max_length=100, blank=True, default="")
    storage_instructions = models.TextField(blank=True, default="")
    barcode = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return f"{self.name} ({self.sku})"


class InventoryItem(models.Model):
    product = models.ForeignKey(Product, related_name='inventory', on_delete=models.CASCADE)
    stock_level = models.IntegerField(default=0)
    location = models.CharField(max_length=255, blank=True)

    # Tracking fields for Pharmacist Dashboard
    batch_number = models.CharField(max_length=100, blank=True, default="")
    supplier = models.CharField(max_length=255, blank=True, default="")
    reorder_level = models.IntegerField(default=10)
    expiry_date = models.DateField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    image_url = models.CharField(max_length=500, blank=True, default="")

    # Optical Tracking fields
    sphere = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Sphere (SPH)")
    cylinder = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Cylinder (CYL)")
    axis = models.IntegerField(null=True, blank=True, help_text="Axis (0-180)")

    class Meta:
        unique_together = ('product', 'location', 'batch_number')
        

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


class RepairRequest(models.Model):
    class RepairStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        COLLECTED = 'COLLECTED', 'Collected by Patient'

    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='repair_requests', limit_choices_to={'role': 'PATIENT'})
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='repairs_handled', limit_choices_to={'role': 'OPTICIAN'})
    description = models.TextField(help_text="e.g. Replace nose pads, fix broken frame")
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=RepairStatus.choices, default=RepairStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Repair #{self.id} for {self.patient.username} ({self.status})"