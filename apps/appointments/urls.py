from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.appointments.views import (
    AppointmentSlotViewSet,
    AppointmentSlotTypeListView,
    AppointmentViewSet,
    TeleconsultationRoomTokenView,
    QueueEntryViewSet
)

app_name = 'appointments'

router = DefaultRouter()
router.register('slots', AppointmentSlotViewSet, basename='slot')
router.register('bookings', AppointmentViewSet, basename='booking')
router.register('queue', QueueEntryViewSet, basename='queue')

urlpatterns = [
    path('', include(router.urls)),
    path('slot-types/', AppointmentSlotTypeListView.as_view(), name='slot-type-list'),
    path('bookings/<int:appointment_id>/token/', TeleconsultationRoomTokenView.as_view(), name='room_token'),
]
