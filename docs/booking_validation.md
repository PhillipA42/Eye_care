# Booking API Validation Guidance

This document describes recommended server-side validation for the booking endpoint (`POST /appointments/bookings/`). These rules improve data quality, protect scheduling correctness, and ensure required patient information for care coordination.

Required fields (recommended):
- `slot` (integer): ID of the slot being booked. Must refer to an existing slot with available capacity. Validate that the slot's `start_time` is in the future or within allowed booking window.
- `patient_name` (string): Non-empty, max length 120.
- `phone_number` (string): Required for reminders and contact; validate using E.164 or a permissive pattern and store canonical form.
- `reason_for_visit` (string): Non-empty, max length 1000.

Optional fields:
- `insurance` (string): Optional; max length 160.
- `language` (string): Optional; max length 50.
- `notes` (string): Optional additional notes from patient.

Server-side checks:
- Slot existence & capacity: verify the `slot` exists and its `bookings_count < capacity` before creating booking. Use transactional update to avoid race conditions.
- Slot visibility: ensure slot is published and not marked private/internal.
- Time window: enforce minimum lead time (e.g., no bookings within 10 minutes of start) and maximum booking horizon (e.g., not more than 6 months out).
- Duplicate booking protection: prevent the same user from booking multiple overlapping slots with the same provider. Use patient identity (user id or phone) and slot time overlap checks.
- Rate limiting: limit the number of bookings per IP or per user to mitigate abuse.
- Contact verification: optionally send an SMS/email confirmation and mark booking as `unconfirmed` until verified.
- Business hours: enforce clinic business hours if applicable for in-clinic slots.

Response shape (suggested):
- `201 Created` on success with JSON body containing created booking, and optionally `room_url` or `token` if a telemedicine slot.
  {
    "id": 123,
    "slot": 45,
    "patient_name": "Jane Doe",
    "status": "SCHEDULED",
    "room_url": "https://tele.example.com/room/abc123",
    "token": null
  }

- `4xx` errors for validation failures with clear `detail` messages.

Security & Privacy:
- Do not log full phone numbers in plaintext to shared logs; redact when possible.
- Rate limit sensitive endpoints and use CAPTCHA for public-facing booking pages if abuse is detected.
- Ensure bookings and patient data are stored under appropriate access controls and HIPAA-like compliance where applicable.

Implementation notes:
- Use database constraints and optimistic locking where possible to enforce capacity.
- Consider background job for sending confirmations and post-booking tasks (calendar invite, reminders).
