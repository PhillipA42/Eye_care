from rest_framework import permissions
from apps.users.models import User

class IsPatient(permissions.BasePermission):
    """
    Allows access only to verified patients.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.Role.PATIENT


class IsOphthalmologist(permissions.BasePermission):
    """
    Allows access only to Ophthalmologists.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.Role.OPHTHALMOLOGIST


class IsOptometrist(permissions.BasePermission):
    """
    Allows access only to Optometrists.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.Role.OPTOMETRIST


class IsReceptionist(permissions.BasePermission):
    """
    Allows access only to Receptionists / Front Desk.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.Role.RECEPTIONIST


class IsPharmacist(permissions.BasePermission):
    """
    Allows access only to Pharmacists.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.Role.PHARMACIST


class IsOptician(permissions.BasePermission):
    """
    Allows access only to Opticians.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == User.Role.OPTICIAN


class IsPharmacistOrOptician(permissions.BasePermission):
    """
    Allows access to either Pharmacists or Opticians.
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in [User.Role.PHARMACIST, User.Role.OPTICIAN])


class IsClinicalStaff(permissions.BasePermission):
    """
    Allows access only to clinical staff (Doctors and Optometrists).
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in [User.Role.OPHTHALMOLOGIST, User.Role.OPTOMETRIST])


class IsStaffUser(permissions.BasePermission):
    """
    Allows access to any non-patient operational or clinical staff user.
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role != User.Role.PATIENT)
