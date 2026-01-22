"""
Clinical Simulation Scenarios for Centre de Santé JULIANNA
15 realistic patient profiles with complete clinical pathways
"""

from datetime import date, timedelta
from decimal import Decimal


# ============================================================================
# PATIENT PROFILES
# ============================================================================

PATIENT_PROFILES = [
    # 1. Chronic Disease - Diabetes Type 2 + HTA
    {
        'id': 'PAT-001',
        'first_name': 'Paul Martin',
        'last_name': 'MBARGA',
        'date_of_birth': date(1969, 3, 15),  # 55 ans
        'gender': 'M',
        'blood_type': 'O+',
        'phone': '+237 670 123 456',
        'email': 'paul.mbarga@email.cm',
        'address': 'Makepe, Douala',
        'chronic_conditions': 'Diabète Type 2, Hypertension artérielle',
        'known_allergies': '',
        'occupation': 'Fonctionnaire',
    },

    # 2. Pregnancy Follow-up
    {
        'id': 'PAT-002',
        'first_name': 'Marie Claire',
        'last_name': 'FOTSO',
        'date_of_birth': date(1996, 7, 22),  # 28 ans
        'gender': 'F',
        'blood_type': 'A+',
        'phone': '+237 681 234 567',
        'email': 'marie.fotso@email.cm',
        'address': 'Akwa, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Enseignante',
        'pregnancy_info': {
            'gravida': 2,
            'para': 1,
            'estimated_delivery_date': date.today() + timedelta(days=120),
            'trimester': 2,
        },
    },

    # 3. Pediatric - Malaria
    {
        'id': 'PAT-003',
        'first_name': 'Junior',
        'last_name': 'NKOULOU',
        'date_of_birth': date(2017, 5, 10),  # 7 ans
        'gender': 'M',
        'blood_type': 'B+',
        'phone': '+237 699 345 678',  # Parent contact
        'address': 'Bonamoussadi, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'parent_guardian': 'Esther NKOULOU',
    },

    # 4. Geriatric - Multiple Pathologies
    {
        'id': 'PAT-004',
        'first_name': 'MAMA Louise',
        'last_name': 'TCHANA',
        'date_of_birth': date(1952, 11, 8),  # 72 ans
        'gender': 'F',
        'blood_type': 'AB+',
        'phone': '+237 670 456 789',
        'address': 'Deïdo, Douala',
        'chronic_conditions': 'HTA, Arthrose, Insuffisance rénale chronique légère',
        'known_allergies': 'AINS',
        'occupation': 'Retraitée',
    },

    # 5. Acute Infection - Typhoid
    {
        'id': 'PAT-005',
        'first_name': 'Serge',
        'last_name': 'KAMDEM',
        'date_of_birth': date(1992, 2, 18),  # 32 ans
        'gender': 'M',
        'blood_type': 'O+',
        'phone': '+237 681 567 890',
        'address': 'Bonapriso, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Ingénieur',
    },

    # 6. Anemia - Iron Deficiency
    {
        'id': 'PAT-006',
        'first_name': 'Judith',
        'last_name': 'EBOGO',
        'date_of_birth': date(1989, 9, 5),  # 35 ans
        'gender': 'F',
        'blood_type': 'A-',
        'phone': '+237 699 678 901',
        'address': 'New-Bell, Douala',
        'chronic_conditions': 'Anémie ferriprive',
        'known_allergies': '',
        'occupation': 'Commerçante',
    },

    # 7. Routine Check-up - Healthy
    {
        'id': 'PAT-007',
        'first_name': 'François',
        'last_name': 'BELLA',
        'date_of_birth': date(1982, 4, 30),  # 42 ans
        'gender': 'M',
        'blood_type': 'O+',
        'phone': '+237 670 789 012',
        'address': 'Bali, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Chef d\'entreprise',
    },

    # 8. STI Screening
    {
        'id': 'PAT-008',
        'first_name': 'Prisca',
        'last_name': 'ATANGANA',
        'date_of_birth': date(2000, 6, 12),  # 24 ans
        'gender': 'F',
        'blood_type': 'B+',
        'phone': '+237 681 890 123',
        'address': 'Ndogpassi, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Étudiante',
    },

    # 9. Gastroenteritis
    {
        'id': 'PAT-009',
        'first_name': 'Patrick',
        'last_name': 'EYOUM',
        'date_of_birth': date(1995, 1, 25),  # 29 ans
        'gender': 'M',
        'blood_type': 'A+',
        'phone': '+237 699 901 234',
        'address': 'Yassa, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Informaticien',
    },

    # 10. Pediatric - Respiratory Infection
    {
        'id': 'PAT-010',
        'first_name': 'Baby Alicia',
        'last_name': 'NGONO',
        'date_of_birth': date(2022, 10, 8),  # 2 ans
        'gender': 'F',
        'blood_type': 'O+',
        'phone': '+237 670 012 345',  # Parent contact
        'address': 'Logbaba, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'parent_guardian': 'Marie NGONO',
    },

    # 11. Hypertension - New Diagnosis
    {
        'id': 'PAT-011',
        'first_name': 'Jean',
        'last_name': 'MVONDO',
        'date_of_birth': date(1978, 8, 14),  # 46 ans
        'gender': 'M',
        'blood_type': 'A+',
        'phone': '+237 681 123 456',
        'address': 'Bonabéri, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Chauffeur',
    },

    # 12. Urinary Tract Infection
    {
        'id': 'PAT-012',
        'first_name': 'Sandrine',
        'last_name': 'EFFA',
        'date_of_birth': date(1993, 12, 3),  # 31 ans
        'gender': 'F',
        'blood_type': 'B+',
        'phone': '+237 699 234 567',
        'address': 'Kotto, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Infirmière',
    },

    # 13. Thyroid Disorder
    {
        'id': 'PAT-013',
        'first_name': 'Christine',
        'last_name': 'BILONG',
        'date_of_birth': date(1985, 5, 20),  # 39 ans
        'gender': 'F',
        'blood_type': 'O-',
        'phone': '+237 670 345 678',
        'address': 'Bépanda, Douala',
        'chronic_conditions': 'Hypothyroïdie',
        'known_allergies': '',
        'occupation': 'Pharmacienne',
    },

    # 14. Sports Physical - Athlete
    {
        'id': 'PAT-014',
        'first_name': 'Boris',
        'last_name': 'NJOYA',
        'date_of_birth': date(1998, 3, 7),  # 26 ans
        'gender': 'M',
        'blood_type': 'A+',
        'phone': '+237 681 456 789',
        'address': 'Cité SIC, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Footballeur professionnel',
    },

    # 15. Abdominal Pain - H. Pylori
    {
        'id': 'PAT-015',
        'first_name': 'Aïssatou',
        'last_name': 'MAHAMAT',
        'date_of_birth': date(1987, 7, 29),  # 37 ans
        'gender': 'F',
        'blood_type': 'O+',
        'phone': '+237 699 567 890',
        'address': 'Madagascar, Douala',
        'chronic_conditions': '',
        'known_allergies': '',
        'occupation': 'Restauratrice',
    },
]


# ============================================================================
# CLINICAL SCENARIOS
# ============================================================================

CLINICAL_SCENARIOS = {

    # ========================================
    # SCENARIO 1: Diabète Type 2 + HTA
    # ========================================
    'DIAB-001': {
        'patient_id': 'PAT-001',
        'scenario_name': 'Suivi Diabète Type 2 + HTA',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Suivi diabète + fatigue persistante depuis 2 semaines',
                'vitals': {
                    'temperature': 36.8,
                    'bp_systolic': 145,
                    'bp_diastolic': 92,
                    'heart_rate': 82,
                    'respiratory_rate': 16,
                    'weight': 92,
                    'height': 172,
                    'bmi': 31.1,
                },
                'physical_exam': 'Patient en surpoids. Pas d\'œdème des membres inférieurs. Pouls périphériques présents. Abdomen souple.',
                'assessment': 'Diabète Type 2 déséquilibré, Hypertension artérielle Grade 1',
                'plan': [
                    'Bilan biologique complet (glycémie, HbA1c, fonction rénale, bilan lipidique)',
                    'Ajustement traitement hypoglycémiant',
                    'Renforcement conseils hygiéno-diététiques',
                    'Revoir dans 7 jours pour résultats',
                ],
                'lab_orders': [
                    'GLYCEMIE_JEUN',
                    'HBA1C',
                    'UREE',
                    'CREATININE_SERUM',
                    'BILAN_LIPIDIQUE',
                    'NFS',
                ],
                'expected_results': {
                    'GLYCEMIE_JEUN': {'value': 165, 'unit': 'mg/dL', 'abnormal': True, 'severity': 'high'},
                    'HBA1C': {'value': 8.2, 'unit': '%', 'abnormal': True, 'severity': 'high'},
                    'UREE': {'value': 0.42, 'unit': 'g/L', 'abnormal': False},
                    'CREATININE_SERUM': {'value': 11, 'unit': 'mg/L', 'abnormal': False},
                },
            },
            {
                'day': 7,
                'visit_type': 'follow_up',
                'purpose': 'Récupération des résultats de laboratoire et ajustement thérapeutique',
                'assessment': 'Diabète Type 2 mal contrôlé (HbA1c 8.2%), HTA',
                'prescriptions': [
                    {
                        'medication_name': 'Paracétamol 500mg',
                        'dosage': '850mg',
                        'frequency': '3 fois par jour',
                        'duration': '3 mois',
                        'route': 'oral',
                        'quantity': 270,
                        'instructions': 'À prendre pendant les repas',
                    },
                    {
                        'medication_name': 'Amoxicilline 500mg',
                        'dosage': '2mg',
                        'frequency': '1 fois par jour le matin',
                        'duration': '3 mois',
                        'route': 'oral',
                        'quantity': 90,
                        'instructions': 'À prendre le matin à jeun',
                    },
                ],
                'counseling_notes': 'Surveiller la glycémie à jeun. Régime pauvre en sucres rapides. Activité physique 30 min/jour. Perte de poids recommandée.',
                'next_appointment_days': 30,
            },
        ],
    },

    # ========================================
    # SCENARIO 2: Grossesse - Suivi Prénatal
    # ========================================
    'PREG-001': {
        'patient_id': 'PAT-002',
        'scenario_name': 'Consultation Prénatale T2',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Consultation prénatale de routine - 2ème trimestre',
                'vitals': {
                    'temperature': 36.7,
                    'bp_systolic': 118,
                    'bp_diastolic': 72,
                    'weight': 65,
                    'height': 162,
                },
                'physical_exam': 'Hauteur utérine: 20 cm. Mouvements fœtaux présents. BCF: 145 bpm',
                'assessment': 'Grossesse G2P1 à 20 SA - Évolution normale',
                'plan': [
                    'Bilan prénatal complet',
                    'Supplémentation en fer et acide folique',
                    'Échographie morphologique (si non faite)',
                ],
                'lab_orders': [
                    'VIH',
                    'TOXOPLASMOSE',
                    'HEPATITE_B',
                    'GROUPE_SANGUIN',
                    'NFS',
                    'GLYCEMIE_JEUN',
                ],
                'expected_results': {
                    'VIH': {'value': 'Négatif', 'abnormal': False},
                    'TOXOPLASMOSE': {'value': 'IgG+ / IgM-', 'abnormal': False, 'interpretation': 'Immunité ancienne'},
                    'HEPATITE_B': {'value': 'Négatif', 'abnormal': False},
                    'GLYCEMIE_JEUN': {'value': 85, 'unit': 'mg/dL', 'abnormal': False},
                },
                'prescriptions': [
                    {
                        'medication_name': 'Acide folique',
                        'dosage': '0.4mg',
                        'frequency': '1 fois par jour',
                        'duration': '3 mois',
                        'route': 'oral',
                        'quantity': 90,
                    },
                    {
                        'medication_name': 'Tardyferon',
                        'dosage': '80mg',
                        'frequency': '1 fois par jour',
                        'duration': '3 mois',
                        'route': 'oral',
                        'quantity': 90,
                    },
                ],
                'next_appointment_days': 30,
            },
        ],
    },

    # ========================================
    # SCENARIO 3: Paludisme Pédiatrique
    # ========================================
    'PALU-001': {
        'patient_id': 'PAT-003',
        'scenario_name': 'Paludisme simple chez enfant de 7 ans',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Fièvre élevée depuis 2 jours + frissons + maux de tête',
                'vitals': {
                    'temperature': 39.4,
                    'bp_systolic': 95,
                    'bp_diastolic': 60,
                    'heart_rate': 110,
                    'respiratory_rate': 24,
                    'weight': 22,
                },
                'physical_exam': 'Enfant fébrile, fatigué. Pas de raideur nuque. Abdomen souple, rate palpable. Pas de signes de déshydratation.',
                'assessment': 'Suspicion paludisme simple',
                'plan': [
                    'Goutte épaisse + NFS',
                    'Traitement antipaludique si positif',
                    'Antalgique/antipyrétique',
                ],
                'lab_orders': ['PALUDISME', 'NFS'],
                'expected_results': {
                    'PALUDISME': {
                        'value': 'Plasmodium falciparum présent',
                        'parasite_density': 15000,
                        'unit': 'parasites/µL',
                        'abnormal': True,
                        'severity': 'moderate',
                    },
                    'NFS': {
                        'hemoglobin': {'value': 10.2, 'unit': 'g/dL', 'abnormal': True},
                        'wbc': {'value': 7.5, 'unit': '×10³/µL', 'abnormal': False},
                        'platelets': {'value': 120, 'unit': '×10³/µL', 'abnormal': True},
                    },
                },
                'prescriptions': [
                    {
                        'medication_name': 'Coartem',
                        'dosage': '2 comprimés',
                        'frequency': '2 fois par jour',
                        'duration': '3 jours',
                        'route': 'oral',
                        'quantity': 1,  # 1 kit complet
                        'instructions': 'À prendre pendant les repas',
                    },
                    {
                        'medication_name': 'Paracétamol 500mg',
                        'dosage': '500mg',
                        'frequency': '3 fois par jour si fièvre',
                        'duration': '5 jours',
                        'route': 'oral',
                        'quantity': 15,
                    },
                ],
                'counseling_notes': 'Moustiquaire imprégnée. Surveillance température. Revenir si aggravation.',
                'next_appointment_days': 7,
            },
            {
                'day': 7,
                'visit_type': 'follow_up',
                'purpose': 'Contrôle post-traitement',
                'vitals': {
                    'temperature': 36.8,
                    'weight': 22,
                },
                'assessment': 'Paludisme guéri - Apyrexie',
                'lab_orders': ['PALUDISME'],
                'expected_results': {
                    'PALUDISME': {'value': 'Absence de parasites', 'abnormal': False},
                },
            },
        ],
    },

    # ========================================
    # SCENARIO 4: Gériatrie - Polypathologie
    # ========================================
    'GERIA-001': {
        'patient_id': 'PAT-004',
        'scenario_name': 'Suivi gériatrique - HTA + IRC',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Suivi régulier + essoufflement à l\'effort',
                'vitals': {
                    'temperature': 36.6,
                    'bp_systolic': 158,
                    'bp_diastolic': 88,
                    'heart_rate': 76,
                    'weight': 68,
                    'height': 158,
                },
                'physical_exam': 'Œdèmes malléolaires bilatéraux. Auscultation pulmonaire: quelques crépitants bases. Abdomen souple.',
                'assessment': 'HTA mal contrôlée, IRC stade 2, Insuffisance cardiaque débutante?',
                'plan': [
                    'Bilan fonction rénale + ionogramme',
                    'Ajustement traitement antihypertenseur',
                    'Régime pauvre en sel',
                ],
                'lab_orders': [
                    'UREE',
                    'CREATININE_SERUM',
                    'IONOGRAMME_COMPLET',
                    'NFS',
                ],
                'expected_results': {
                    'UREE': {'value': 0.68, 'unit': 'g/L', 'abnormal': True},
                    'CREATININE_SERUM': {'value': 18, 'unit': 'mg/L', 'abnormal': True},
                    'SODIUM': {'value': 138, 'unit': 'mmol/L', 'abnormal': False},
                    'POTASSIUM': {'value': 4.8, 'unit': 'mmol/L', 'abnormal': False},
                },
                'prescriptions': [
                    {
                        'medication_name': 'Coveram',
                        'dosage': '5mg/10mg',
                        'frequency': '1 fois par jour',
                        'duration': '3 mois',
                        'route': 'oral',
                        'quantity': 90,
                    },
                ],
                'counseling_notes': 'Régime hyposodé. Surveillance poids quotidien. Limiter apports hydriques.',
                'next_appointment_days': 15,
            },
        ],
    },

    # ========================================
    # SCENARIO 5: Gastroentérite
    # ========================================
    'GASTRO-001': {
        'patient_id': 'PAT-009',
        'scenario_name': 'Gastroentérite aiguë',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Diarrhées liquides + vomissements depuis 24h + douleurs abdominales',
                'vitals': {
                    'temperature': 37.8,
                    'bp_systolic': 110,
                    'bp_diastolic': 70,
                    'heart_rate': 95,
                    'weight': 72,
                },
                'physical_exam': 'Pli cutané conservé. Abdomen souple, sensible diffusément. Bruits hydroaériques augmentés.',
                'assessment': 'Gastroentérite aiguë, déshydratation légère',
                'plan': [
                    'Réhydratation orale',
                    'Traitement symptomatique',
                    'Régime sans résidus',
                ],
                'prescriptions': [
                    {
                        'medication_name': 'Lopéramide',
                        'dosage': '2mg',
                        'frequency': 'Après chaque selle liquide (max 8/j)',
                        'duration': '3 jours',
                        'route': 'oral',
                        'quantity': 12,
                    },
                    {
                        'medication_name': 'Spasfon',
                        'dosage': '80mg',
                        'frequency': '3 fois par jour',
                        'duration': '5 jours',
                        'route': 'oral',
                        'quantity': 15,
                    },
                ],
                'counseling_notes': 'Boire abondamment (SRO). Régime BRAT. Hygiène des mains. Revenir si déshydratation.',
            },
        ],
    },

    # ========================================
    # SCENARIO 6: Infection Respiratoire Pédiatrique
    # ========================================
    'RESP-001': {
        'patient_id': 'PAT-010',
        'scenario_name': 'Bronchiolite chez nourrisson',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Toux + respiration difficile + fièvre depuis 3 jours',
                'vitals': {
                    'temperature': 38.2,
                    'heart_rate': 140,
                    'respiratory_rate': 45,
                    'weight': 11,
                    'oxygen_saturation': 94,
                },
                'physical_exam': 'Tirage sous-costal. Sibilants diffus bilatéraux. Pas de cyanose.',
                'assessment': 'Bronchiolite aiguë modérée',
                'plan': [
                    'Désobstruction rhinopharyngée',
                    'Aérosols',
                    'Surveillance clinique',
                ],
                'prescriptions': [
                    {
                        'medication_name': 'Sérum Physiologique',
                        'dosage': 'selon besoin',
                        'frequency': 'Avant chaque repas',
                        'duration': '7 jours',
                        'route': 'nasal',
                        'quantity': 2,
                    },
                    {
                        'medication_name': 'Helicidine',
                        'dosage': '5mL',
                        'frequency': '3 fois par jour',
                        'duration': '5 jours',
                        'route': 'oral',
                        'quantity': 1,
                    },
                ],
                'counseling_notes': 'Fractionner repas. Position semi-assise. Revenir si gêne respiratoire s\'aggrave.',
            },
        ],
    },

    # ========================================
    # SCENARIO 7: HTA - Nouvelle Découverte
    # ========================================
    'HTA-001': {
        'patient_id': 'PAT-011',
        'scenario_name': 'Découverte HTA',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Céphalées fréquentes + vertiges',
                'vitals': {
                    'temperature': 36.9,
                    'bp_systolic': 168,
                    'bp_diastolic': 102,
                    'heart_rate': 88,
                    'weight': 85,
                    'height': 175,
                },
                'physical_exam': 'Pas d\'œdèmes. Auscultation cardio-pulmonaire normale. Pas de souffle vasculaire.',
                'assessment': 'Hypertension artérielle Grade 2',
                'plan': [
                    'Bilan initial HTA (fonction rénale, ionogramme, glycémie, bilan lipidique)',
                    'Instauration traitement antihypertenseur',
                    'Règles hygiéno-diététiques',
                ],
                'lab_orders': [
                    'UREE',
                    'CREATININE_SERUM',
                    'IONOGRAMME_COMPLET',
                    'GLYCEMIE_JEUN',
                    'BILAN_LIPIDIQUE',
                ],
                'expected_results': {
                    'GLYCEMIE_JEUN': {'value': 95, 'unit': 'mg/dL', 'abnormal': False},
                    'CREATININE_SERUM': {'value': 10, 'unit': 'mg/L', 'abnormal': False},
                },
                'prescriptions': [
                    {
                        'medication_name': 'Amoxiciline 500mg',
                        'dosage': '5mg',
                        'frequency': '1 fois par jour',
                        'duration': '3 mois',
                        'route': 'oral',
                        'quantity': 90,
                    },
                ],
                'counseling_notes': 'Réduire sel. Perte de poids. Activité physique régulière. Auto-mesure TA.',
                'next_appointment_days': 14,
            },
        ],
    },

    # ========================================
    # SCENARIO 8: Infection Urinaire
    # ========================================
    'UTI-001': {
        'patient_id': 'PAT-012',
        'scenario_name': 'Cystite aiguë simple',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Brûlures mictionnelles + pollakiurie depuis 2 jours',
                'vitals': {
                    'temperature': 37.2,
                    'bp_systolic': 118,
                    'bp_diastolic': 75,
                },
                'physical_exam': 'Fosses lombaires libres. Hypogastre sensible. Pas de leucorrhée.',
                'assessment': 'Cystite aiguë simple',
                'plan': [
                    'ECBU',
                    'Antibiothérapie probabiliste',
                    'Hydratation abondante',
                ],
                'lab_orders': ['ECBU'],
                'expected_results': {
                    'ECBU': {
                        'value': 'E. coli > 10⁵ UFC/mL',
                        'abnormal': True,
                        'interpretation': 'Infection urinaire confirmée',
                        'sensitivity': 'Sensible à Amoxicilline, Ciprofloxacine',
                    },
                },
                'prescriptions': [
                    {
                        'medication_name': 'Ciprofloxacine 500mg',
                        'dosage': '500mg',
                        'frequency': '2 fois par jour',
                        'duration': '3 jours',
                        'route': 'oral',
                        'quantity': 6,
                    },
                ],
                'counseling_notes': 'Boire 2L/jour. Uriner après rapports. Canneberge.',
            },
        ],
    },

    # ========================================
    # SCENARIO 9: Anémie Ferriprive
    # ========================================
    'ANEM-001': {
        'patient_id': 'PAT-006',
        'scenario_name': 'Anémie ferriprive',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Fatigue importante + pâleur + essoufflement',
                'vitals': {
                    'temperature': 36.7,
                    'bp_systolic': 110,
                    'bp_diastolic': 70,
                    'heart_rate': 95,
                },
                'physical_exam': 'Pâleur conjonctivale et palmaire. Souffle systolique fonctionnel. Pas d\'organomégalie.',
                'assessment': 'Anémie microcytaire hypochrome - suspicion carence martiale',
                'plan': [
                    'NFS + fer sérique',
                    'Supplémentation en fer',
                    'Recherche cause (ménorragies, alimentation)',
                ],
                'lab_orders': ['NFS', 'FER_SERIQUE'],
                'expected_results': {
                    'NFS': {
                        'hemoglobin': {'value': 8.5, 'unit': 'g/dL', 'abnormal': True, 'severity': 'low'},
                        'mcv': {'value': 72, 'unit': 'fL', 'abnormal': True, 'interpretation': 'Microcytose'},
                    },
                    'FER_SERIQUE': {'value': 28, 'unit': 'µg/dL', 'abnormal': True},
                },
                'prescriptions': [
                    {
                        'medication_name': 'Tardyferon',
                        'dosage': '80mg',
                        'frequency': '1 fois par jour',
                        'duration': '3 mois',
                        'route': 'oral',
                        'quantity': 90,
                    },
                ],
                'counseling_notes': 'Alimentation riche en fer (viande rouge). À distance des repas. Constipation possible.',
                'next_appointment_days': 30,
            },
        ],
    },

    # ========================================
    # SCENARIO 10: Check-up de Routine
    # ========================================
    'CHECKUP-001': {
        'patient_id': 'PAT-007',
        'scenario_name': 'Bilan de santé annuel',
        'visits': [
            {
                'day': 0,
                'visit_type': 'consultation',
                'chief_complaint': 'Bilan de santé de routine',
                'vitals': {
                    'temperature': 36.8,
                    'bp_systolic': 122,
                    'bp_diastolic': 78,
                    'heart_rate': 68,
                    'weight': 75,
                    'height': 178,
                    'bmi': 23.7,
                },
                'physical_exam': 'Examen clinique complet normal.',
                'assessment': 'Bilan de santé - Aucune anomalie détectée',
                'plan': [
                    'Bilan biologique de routine',
                    'Conseils préventifs',
                ],
                'lab_orders': [
                    'GLYCEMIE_JEUN',
                    'BILAN_LIPIDIQUE',
                    'NFS',
                    'UREE',
                    'CREATININE_SERUM',
                ],
                'expected_results': {
                    'GLYCEMIE_JEUN': {'value': 88, 'unit': 'mg/dL', 'abnormal': False},
                    'CHOLESTEROL_TOTAL': {'value': 1.85, 'unit': 'g/L', 'abnormal': False},
                },
                'counseling_notes': 'Maintenir hygiène de vie. Activité physique régulière. Alimentation équilibrée.',
            },
        ],
    },

    # Additional scenarios 11-15 would follow similar patterns for:
    # - Thyroid disorder follow-up
    # - Sports physical
    # - H. Pylori gastritis
    # - STI screening
    # - Acute typhoid fever
}


# ============================================================================
# MEDICATION DISPENSING TEMPLATES
# ============================================================================

COMMON_MEDICATION_INSTRUCTIONS = {
    'oral_tablets': 'À avaler avec un grand verre d\'eau',
    'oral_syrup': 'Bien agiter avant emploi. Utiliser la cuillère-mesure fournie',
    'topical_cream': 'Appliquer en couche mince sur la zone affectée',
    'eye_drops': 'Instiller dans le sac conjonctival',
    'nasal_spray': 'Pulvériser dans chaque narine',
    'injectable': 'Administration par personnel qualifié uniquement',
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_patient_by_id(patient_id):
    """Get patient profile by ID"""
    for patient in PATIENT_PROFILES:
        if patient['id'] == patient_id:
            return patient
    return None


def get_scenario_by_id(scenario_id):
    """Get clinical scenario by ID"""
    return CLINICAL_SCENARIOS.get(scenario_id)


def calculate_age(date_of_birth):
    """Calculate age from date of birth"""
    today = date.today()
    return today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))


def get_all_patient_ids():
    """Get list of all patient IDs"""
    return [p['id'] for p in PATIENT_PROFILES]


def get_all_scenario_ids():
    """Get list of all scenario IDs"""
    return list(CLINICAL_SCENARIOS.keys())
