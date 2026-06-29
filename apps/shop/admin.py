from django.contrib import admin
from .models import Product, InventoryItem, Order, OrderItem, PrescriptionRequirement

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'sku', 'item_type', 'unit_price', 'is_prescription_required')
    search_fields = ('name', 'sku')

@admin.register(InventoryItem)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'stock_level', 'location')
    list_filter = ('location',)

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'status', 'total_amount', 'created_at')
    list_filter = ('status',)
    inlines = [OrderItemInline]

@admin.register(PrescriptionRequirement)
class PrescriptionRequirementAdmin(admin.ModelAdmin):
    list_display = ('id', 'product')
