from django.db import migrations


DEPARTMENTS = [
    {
        'code': 'OPHTHALMOLOGY',
        'name': 'Ophthalmology',
        'description': 'Medical and surgical eye disease diagnosis, treatment, and follow-up.',
        'is_clinical': True,
        'sort_order': 10,
    },
    {
        'code': 'OPTOMETRY',
        'name': 'Optometry',
        'description': 'Vision testing, refraction, visual acuity review, and optical prescriptions.',
        'is_clinical': True,
        'sort_order': 20,
    },
    {
        'code': 'TRIAGE_SCREENING',
        'name': 'Triage and Screening',
        'description': 'Initial assessment, symptom screening, priority routing, and patient intake checks.',
        'is_clinical': True,
        'sort_order': 30,
    },
    {
        'code': 'DIAGNOSTICS_IMAGING',
        'name': 'Diagnostics and Imaging',
        'description': 'OCT, fundus imaging, tonometry, visual field testing, and diagnostic device services.',
        'is_clinical': True,
        'sort_order': 40,
    },
    {
        'code': 'SURGERY_THEATRE',
        'name': 'Surgery and Theatre',
        'description': 'Operating theatre scheduling, procedures, cataract surgery, retina surgery, and perioperative care.',
        'is_clinical': True,
        'sort_order': 50,
    },
    {
        'code': 'TELEMEDICINE',
        'name': 'Telemedicine',
        'description': 'Remote consultations, virtual follow-up, and video visit coordination.',
        'is_clinical': True,
        'sort_order': 60,
    },
    {
        'code': 'RECEPTION_FRONT_DESK',
        'name': 'Reception and Front Desk',
        'description': 'Patient registration, appointments, check-in, and queue coordination.',
        'is_clinical': False,
        'sort_order': 70,
    },
    {
        'code': 'PHARMACY',
        'name': 'Pharmacy',
        'description': 'Medication dispensing, prescription review, medicine inventory, and patient counseling.',
        'is_clinical': False,
        'sort_order': 80,
    },
    {
        'code': 'OPTICAL_DISPENSARY',
        'name': 'Optical Dispensary',
        'description': 'Eyeglass dispensing, lens fitting, frame inventory, and optical order fulfillment.',
        'is_clinical': False,
        'sort_order': 90,
    },
    {
        'code': 'BILLING_INSURANCE',
        'name': 'Billing and Insurance',
        'description': 'Invoices, payments, insurance claims, approvals, and financial records.',
        'is_clinical': False,
        'sort_order': 100,
    },
    {
        'code': 'MEDICAL_RECORDS',
        'name': 'Medical Records',
        'description': 'Patient files, clinical documentation, records access, and health information management.',
        'is_clinical': False,
        'sort_order': 110,
    },
    {
        'code': 'INVENTORY_STORES',
        'name': 'Inventory and Stores',
        'description': 'Stock receiving, reorder tracking, product storage, and supply management.',
        'is_clinical': False,
        'sort_order': 120,
    },
    {
        'code': 'ADMINISTRATION',
        'name': 'Administration',
        'description': 'Hospital operations, staff administration, compliance, and system oversight.',
        'is_clinical': False,
        'sort_order': 130,
    },
]

ROLE_DEPARTMENTS = {
    'OPHTHALMOLOGIST': 'OPHTHALMOLOGY',
    'OPTOMETRIST': 'OPTOMETRY',
    'RECEPTIONIST': 'RECEPTION_FRONT_DESK',
    'PHARMACIST': 'PHARMACY',
    'OPTICIAN': 'OPTICAL_DISPENSARY',
    'ADMIN': 'ADMINISTRATION',
}


def seed_departments(apps, schema_editor):
    Department = apps.get_model('users', 'Department')
    StaffProfile = apps.get_model('users', 'StaffProfile')
    User = apps.get_model('users', 'User')

    departments_by_code = {}
    for department_data in DEPARTMENTS:
        department, _ = Department.objects.update_or_create(
            code=department_data['code'],
            defaults={
                'name': department_data['name'],
                'description': department_data['description'],
                'is_clinical': department_data['is_clinical'],
                'is_active': True,
                'sort_order': department_data['sort_order'],
            }
        )
        departments_by_code[department.code] = department

    for user in User.objects.exclude(role='PATIENT'):
        department = departments_by_code.get(ROLE_DEPARTMENTS.get(user.role))
        if not department:
            continue
        profile, _ = StaffProfile.objects.get_or_create(user=user)
        if not profile.department_id:
            profile.department = department
            profile.save(update_fields=['department'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_department_staffprofile_department'),
    ]

    operations = [
        migrations.RunPython(seed_departments, noop_reverse),
    ]
