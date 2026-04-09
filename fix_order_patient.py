from apps.laboratory.models import LabOrder
from datetime import date
try:
    o = LabOrder.objects.get(order_number='LAB-20260404-0002')
    p = o.patient
    sp = o.subcontractor_patient
    
    # Update Client (patient)
    if p:
        p.name = 'Koueko Dominique Christelle'
        p.gender = 'F'
        # Assuming 39 years old as of today (April 9, 2026)
        p.date_of_birth = date(1987, 4, 9)
        p.save()
        print(f"Updated patient: {p.name}")
    
    # Update SubcontractorPatient
    if sp:
        sp.first_name = 'Dominique Christelle'
        sp.last_name = 'Koueko'
        sp.gender = 'F'
        sp.date_of_birth = date(1987, 4, 9)
        sp.save()
        print(f"Updated subcontractor patient: {sp.full_name}")
    else:
        print("No subcontractor patient linked to this order.")
except LabOrder.DoesNotExist:
    print("Order #LAB-20260404-0002 not found.")
except Exception as e:
    print(f"An error occurred: {e}")
