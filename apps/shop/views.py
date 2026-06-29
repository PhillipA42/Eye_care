from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Product, InventoryItem, Order, OrderItem
from .serializers import ProductSerializer, InventorySerializer, OrderSerializer
from django.shortcuts import get_object_or_404
from apps.users.permissions import IsPatient


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]


class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryItem.objects.select_related('product').all()
    serializer_class = InventorySerializer
    permission_classes = [permissions.AllowAny]


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_queryset(self):
        # patients only see their orders
        return self.queryset.filter(patient=self.request.user)

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        """
        Expects payload: { items: [{product_id, quantity}], delivery_address, is_pickup, prescription_id (optional) }
        """
        data = request.data
        items = data.get('items', [])
        delivery_address = data.get('delivery_address', '')
        is_pickup = data.get('is_pickup', False)
        prescription_id = data.get('prescription_id', None)

        # Basic checks
        if len(items) == 0:
            return Response({'detail': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate prescription requirement
        for it in items:
            prod = get_object_or_404(Product, id=it.get('product_id'))
            if prod.is_prescription_required:
                if not prescription_id:
                    return Response({'detail': f'Product {prod.name} requires a prescription.'}, status=status.HTTP_400_BAD_REQUEST)
                # verify prescription belongs to the user
                try:
                    from apps.medical_records.models import Prescription as MedPrescription
                except Exception:
                    from apps.appointments.models import Prescription as AppointmentPrescription
                    MedPrescription = AppointmentPrescription

                try:
                    pres = MedPrescription.objects.get(id=prescription_id, patient=request.user)
                except MedPrescription.DoesNotExist:
                    return Response({'detail': 'Invalid prescription id or prescription does not belong to the user.'}, status=status.HTTP_400_BAD_REQUEST)

        # create order
        order = Order.objects.create(patient=request.user, delivery_address=delivery_address, is_pickup=is_pickup)
        total = 0
        for it in items:
            prod = get_object_or_404(Product, id=it.get('product_id'))
            qty = int(it.get('quantity', 1))
            item_price = prod.unit_price
            OrderItem.objects.create(order=order, product=prod, quantity=qty, unit_price=item_price)
            total += float(item_price) * qty

        order.total_amount = total
        if prescription_id:
            try:
                order.prescription_id = int(prescription_id)
            except Exception:
                pass
        order.save()

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
