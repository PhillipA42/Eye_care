import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User, StaffProfile, PatientProfile

def create_user(username, email, password, role, first_name, last_name, is_staff=False, is_superuser=False):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'role': role,
            'first_name': first_name,
            'last_name': last_name,
            'is_staff': is_staff,
            'is_superuser': is_superuser
        }
    )
    if created:
        user.set_password(password)
        user.save()
        print(f"Created user: {username} ({role})")
    else:
        # Update password and roles just in case
        user.role = role
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.set_password(password)
        user.save()
        print(f"Updated existing user: {username} ({role})")

    # Associate profile if not present
    if role == User.Role.PATIENT:
        PatientProfile.objects.get_or_create(
            user=user,
            defaults={'is_verified': True}
        )
    elif role in [User.Role.OPHTHALMOLOGIST, User.Role.OPTOMETRIST, User.Role.RECEPTIONIST, User.Role.PHARMACIST, User.Role.OPTICIAN]:
        StaffProfile.objects.get_or_create(
            user=user,
            defaults={
                'license_number': f"LIC-{username.upper()}-123",
                'specialization': "General Ophthalmic Practice"
            }
        )
    return user

if __name__ == '__main__':
    print("Seeding test users...")
    
    # 1. Admin / Superuser
    create_user(
        username='admin',
        email='admin@eyecare.com',
        password='adminpassword123',
        role=User.Role.ADMIN,
        first_name='Admin',
        last_name='User',
        is_staff=True,
        is_superuser=True
    )

    # 2. Doctor (Ophthalmologist)
    create_user(
        username='doctor',
        email='doctor@eyecare.com',
        password='doctorpassword123',
        role=User.Role.OPHTHALMOLOGIST,
        first_name='John',
        last_name='Doe'
    )

    # 3. Receptionist (Front Desk)
    create_user(
        username='receptionist',
        email='receptionist@eyecare.com',
        password='receptpassword123',
        role=User.Role.RECEPTIONIST,
        first_name='Alice',
        last_name='Smith'
    )

    # 4. Pharmacist
    create_user(
        username='pharmacist',
        email='pharmacist@eyecare.com',
        password='pharmpassword123',
        role=User.Role.PHARMACIST,
        first_name='Bob',
        last_name='Jones'
    )

    # 5. Patient
    create_user(
        username='patient',
        email='patient@eyecare.com',
        password='patientpassword123',
        role=User.Role.PATIENT,
        first_name='Charlie',
        last_name='Brown'
    )

    print("Seeding complete! You can now log in with these credentials.")
