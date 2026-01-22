"""
Complete Medical Reference Ranges for Centre de Santé JULIANNA Laboratory Tests
Based on international medical standards: WHO 2020, IFCC 2021, CDC Guidelines

All reference values are validated against current medical literature and
adapted for the Cameroon healthcare context.

Last updated: 2026-01
"""

# ============================================================================
# REFERENCE SOURCES
# ============================================================================

REFERENCE_SOURCES = {
    'hematology': 'WHO Laboratory Guidelines 2020',
    'biochemistry': 'IFCC Standards 2021',
    'serology': 'CDC Guidelines 2023',
    'bacteriology': 'Clinical Microbiology Standards (CLSI 2021)',
    'parasitology': 'WHO Parasitology Guidelines 2020',
    'endocrinology': 'Endocrine Society Clinical Guidelines 2022',
}


# ============================================================================
# COMPLETE LABORATORY TEST REFERENCE VALUES
# ============================================================================

LAB_TEST_REFERENCES = {

    # ========================================
    # BIOCHIMIE GÉNÉRALE
    # ========================================

    'ACIDE_URIQUE': {
        'test_code': 'BIO-AU',
        'name': 'Acide Urique',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'fasting_required': True,
        'fasting_hours': 8,
        'unit': 'mg/L',
        'normal_range_male': '35-70',
        'normal_range_female': '25-60',
        'normal_range_child': '20-50',
        'critical_low': '<20',
        'critical_high': '>120',
        'methodology': 'Spectrophotométrie enzymatique',
        'interpretation': {
            '<25': 'Hypouricémie',
            '25-70': 'Normal',
            '70-90': 'Hyperuricémie modérée',
            '>90': 'Hyperuricémie sévère - Risque de goutte',
        },
    },

    'ALBUMINE': {
        'test_code': 'BIO-ALB',
        'name': 'Albumine Sérique',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'g/L',
        'normal_range_general': '35-50',
        'normal_range_child': '38-54',
        'critical_low': '<25',
        'methodology': 'Vert de Bromocrésol (BCG)',
        'interpretation': {
            '<30': 'Hypoalbuminémie sévère',
            '30-35': 'Hypoalbuminémie modérée',
            '35-50': 'Normal',
            '>50': 'Hyperalbuminémie (rare)',
        },
    },

    'BILAN_LIPIDIQUE': {
        'test_code': 'BIO-BLIP',
        'name': 'Bilan Lipidique Complet',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'fasting_required': True,
        'fasting_hours': 12,
        'components': {
            'cholesterol_total': {
                'unit': 'g/L',
                'normal_range': '<2.00',
                'borderline': '2.00-2.40',
                'high': '>2.40',
            },
            'cholesterol_hdl': {
                'unit': 'g/L',
                'normal_male': '>0.40',
                'normal_female': '>0.50',
                'low_risk': '>0.60',
            },
            'cholesterol_ldl': {
                'unit': 'g/L',
                'optimal': '<1.00',
                'normal': '<1.30',
                'borderline': '1.30-1.60',
                'high': '>1.60',
            },
            'triglycerides': {
                'unit': 'g/L',
                'normal': '<1.50',
                'borderline': '1.50-2.00',
                'high': '>2.00',
            },
        },
    },

    'BILIRUBINE_DIRECTE': {
        'test_code': 'BIO-BILD',
        'name': 'Bilirubine Directe (Conjuguée)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'mg/L',
        'normal_range_general': '0-2',
        'critical_high': '>50',
        'methodology': 'Méthode de Jendrassik-Grof',
    },

    'BILIRUBINE_TOTALE': {
        'test_code': 'BIO-BILT',
        'name': 'Bilirubine Totale',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'mg/L',
        'normal_range_general': '3-10',
        'normal_range_newborn': '50-150',
        'critical_high': '>200',
        'methodology': 'Méthode de Jendrassik-Grof',
        'interpretation': {
            '<10': 'Normal',
            '10-30': 'Hyperbilirubinémie légère',
            '30-50': 'Ictère visible',
            '>50': 'Hyperbilirubinémie sévère',
        },
    },

    'CALCIUM': {
        'test_code': 'BIO-CA',
        'name': 'Calcium Sérique',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'fasting_required': True,
        'unit': 'mg/L',
        'normal_range_general': '90-105',
        'critical_low': '<70',
        'critical_high': '>130',
        'methodology': 'Spectrophotométrie',
        'interpretation': {
            '<85': 'Hypocalcémie',
            '90-105': 'Normal',
            '>110': 'Hypercalcémie',
        },
    },

    'CHOLESTEROL_TOTAL': {
        'test_code': 'BIO-CHOL',
        'name': 'Cholestérol Total',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'fasting_required': True,
        'unit': 'g/L',
        'normal_range_general': '<2.00',
        'interpretation': {
            '<2.00': 'Normal',
            '2.00-2.40': 'Limite supérieure (borderline)',
            '>2.40': 'Hypercholestérolémie',
        },
    },

    'CHOLESTEROL_HDL': {
        'test_code': 'BIO-HDL',
        'name': 'Cholestérol HDL (Bon cholestérol)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'g/L',
        'normal_range_male': '>0.40',
        'normal_range_female': '>0.50',
        'interpretation': {
            '<0.35': 'Facteur de risque cardiovasculaire majeur',
            '0.35-0.40': 'Bas (homme) / Facteur de risque',
            '0.40-0.50': 'Acceptable (homme)',
            '>0.60': 'Protecteur cardiovasculaire',
        },
    },

    'CHOLESTEROL_LDL': {
        'test_code': 'BIO-LDL',
        'name': 'Cholestérol LDL (Mauvais cholestérol)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'g/L',
        'normal_range_general': '<1.30',
        'interpretation': {
            '<1.00': 'Optimal',
            '1.00-1.30': 'Normal',
            '1.30-1.60': 'Limite supérieure',
            '1.60-1.90': 'Élevé',
            '>1.90': 'Très élevé',
        },
    },

    'CREATININE_SERUM': {
        'test_code': 'BIO-CREAS',
        'name': 'Créatinine Sérique',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'mg/L',
        'normal_range_male': '7-13',
        'normal_range_female': '6-11',
        'normal_range_child': '3-7',
        'critical_high': '>30',
        'methodology': 'Méthode de Jaffé cinétique',
        'interpretation': {
            '<5': 'Bas (masse musculaire réduite)',
            '6-13': 'Normal',
            '13-20': 'Insuffisance rénale légère',
            '20-50': 'Insuffisance rénale modérée',
            '>50': 'Insuffisance rénale sévère',
        },
    },

    'CREATININE_URINE': {
        'test_code': 'URO-CREAU',
        'name': 'Créatinine Urinaire',
        'category': 'Biochimie Générale',
        'sample_type': 'urine',
        'container_type': 'urine_cup',
        'unit': 'g/24h',
        'normal_range_male': '1.0-2.0',
        'normal_range_female': '0.8-1.8',
    },

    'CRP': {
        'test_code': 'BIO-CRP',
        'name': 'CRP (Protéine C-Réactive)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'mg/L',
        'normal_range_general': '<5',
        'interpretation': {
            '<5': 'Normal',
            '5-10': 'Inflammation légère',
            '10-50': 'Inflammation modérée',
            '50-100': 'Inflammation importante',
            '>100': 'Inflammation sévère ou infection bactérienne',
        },
    },

    'FER_SERIQUE': {
        'test_code': 'BIO-FER',
        'name': 'Fer Sérique',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'fasting_required': True,
        'unit': 'µg/dL',
        'normal_range_male': '50-160',
        'normal_range_female': '40-150',
        'normal_range_child': '50-120',
        'interpretation': {
            '<50': 'Déficit en fer',
            '50-160': 'Normal',
            '>200': 'Surcharge en fer',
        },
    },

    'G6PDH': {
        'test_code': 'BIO-G6PD',
        'name': 'G6PDH (Glucose-6-Phosphate Déshydrogénase)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'edta',
        'unit': 'U/g Hb',
        'normal_range_general': '7.0-20.5',
        'interpretation': {
            '<4.5': 'Déficit sévère',
            '4.5-7.0': 'Déficit modéré',
            '>7.0': 'Normal',
        },
    },

    'GAMMA_GT': {
        'test_code': 'BIO-GGT',
        'name': 'Gamma GT (Gamma-Glutamyl Transférase)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'UI/L',
        'normal_range_male': '<55',
        'normal_range_female': '<38',
        'interpretation': {
            'Normal': 'Fonction hépatique normale',
            '2-3x normal': 'Cytolyse hépatique modérée',
            '>5x normal': 'Atteinte hépatique sévère',
        },
    },

    'PAL': {
        'test_code': 'BIO-PAL',
        'name': 'Phosphatase Alcaline (PAL)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'UI/L',
        'normal_range_male': '40-130',
        'normal_range_female': '35-105',
        'normal_range_child': '100-320',
        'interpretation': {
            'Élevé adulte': 'Cholestase ou pathologie osseuse',
            'Élevé enfant': 'Normal (croissance)',
        },
    },

    'GLYCEMIE_JEUN': {
        'test_code': 'BIO-GLU',
        'name': 'Glycémie à Jeun',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'fluoride',
        'fasting_required': True,
        'fasting_hours': 8,
        'unit': 'mg/dL',
        'normal_range_general': '70-100',
        'normal_range_child': '60-100',
        'critical_low': '<50',
        'critical_high': '>400',
        'methodology': 'Méthode enzymatique (glucose oxydase)',
        'interpretation': {
            '<60': 'Hypoglycémie',
            '60-100': 'Normal',
            '100-126': 'Glycémie à jeun altérée (Pré-diabète)',
            '≥126': 'Diabète sucré (à confirmer)',
            '>200': 'Diabète sévère',
        },
    },

    'GLYCEMIE_POST_PRANDIALE': {
        'test_code': 'BIO-GLUPP',
        'name': 'Glycémie Post-Prandiale (2h)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'fluoride',
        'unit': 'mg/dL',
        'normal_range_general': '<140',
        'interpretation': {
            '<140': 'Normal',
            '140-200': 'Intolérance au glucose',
            '≥200': 'Diabète',
        },
    },

    'HCG': {
        'test_code': 'BIO-HCG',
        'name': 'HCG (Hormone Chorionique Gonadotrope)',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'mUI/mL',
        'normal_range_general': '<5 (non enceinte)',
        'interpretation': {
            '<5': 'Négatif',
            '5-25': 'Zone grise',
            '>25': 'Positif - Grossesse',
        },
        'pregnancy_values': {
            '3 semaines': '5-50',
            '4 semaines': '5-426',
            '5 semaines': '18-7340',
            '6 semaines': '1080-56500',
            '7-8 semaines': '7650-229000',
            '9-12 semaines': '25700-288000',
        },
    },

    'PROTEINES_TOTALES': {
        'test_code': 'BIO-PROT',
        'name': 'Protéines Totales',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'g/L',
        'normal_range_general': '60-80',
        'interpretation': {
            '<60': 'Hypoprotidémie',
            '60-80': 'Normal',
            '>90': 'Hyperprotidémie',
        },
    },

    'TRANSAMINASES_SGOT': {
        'test_code': 'BIO-ASAT',
        'name': 'ASAT (SGOT) - Transaminase',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'UI/L',
        'normal_range_male': '<40',
        'normal_range_female': '<35',
        'critical_high': '>300',
        'interpretation': {
            '<40': 'Normal',
            '40-200': 'Cytolyse modérée',
            '>200': 'Cytolyse sévère',
        },
    },

    'TRANSAMINASES_SGPT': {
        'test_code': 'BIO-ALAT',
        'name': 'ALAT (SGPT) - Transaminase',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'UI/L',
        'normal_range_male': '<41',
        'normal_range_female': '<33',
        'critical_high': '>300',
        'interpretation': {
            'Normal': 'Fonction hépatique normale',
            '2-5x normal': 'Hépatite modérée',
            '>10x normal': 'Hépatite aiguë',
        },
    },

    'TRIGLYCERIDES': {
        'test_code': 'BIO-TG',
        'name': 'Triglycérides',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'fasting_required': True,
        'fasting_hours': 12,
        'unit': 'g/L',
        'normal_range_general': '<1.50',
        'interpretation': {
            '<1.50': 'Normal',
            '1.50-2.00': 'Limite supérieure',
            '2.00-5.00': 'Hypertriglycéridémie modérée',
            '>5.00': 'Hypertriglycéridémie sévère - Risque pancréatite',
        },
    },

    'UREE': {
        'test_code': 'BIO-UREE',
        'name': 'Urée',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'g/L',
        'normal_range_general': '0.15-0.45',
        'normal_range_child': '0.10-0.40',
        'critical_high': '>1.80',
        'interpretation': {
            '<0.15': 'Hypourémie',
            '0.15-0.45': 'Normal',
            '0.45-1.00': 'Insuffisance rénale légère',
            '>1.00': 'Insuffisance rénale sévère',
        },
    },

    # ========================================
    # IONOGRAMMES ET ÉLECTROLYTES
    # ========================================

    'IONOGRAMME_COMPLET': {
        'test_code': 'ION-CS',
        'name': 'Ionogramme Sanguin Complet',
        'category': 'Ionogrammes',
        'sample_type': 'blood',
        'container_type': 'heparin',
        'components': {
            'sodium': {'unit': 'mmol/L', 'normal': '135-145'},
            'potassium': {'unit': 'mmol/L', 'normal': '3.5-5.0'},
            'chlore': {'unit': 'mmol/L', 'normal': '98-108'},
            'bicarbonates': {'unit': 'mmol/L', 'normal': '22-29'},
            'calcium': {'unit': 'mmol/L', 'normal': '2.20-2.60'},
        },
    },

    'SODIUM': {
        'test_code': 'ION-NA',
        'name': 'Sodium (Na+)',
        'category': 'Ionogrammes',
        'sample_type': 'blood',
        'container_type': 'heparin',
        'unit': 'mmol/L',
        'normal_range_general': '135-145',
        'critical_low': '<120',
        'critical_high': '>160',
        'interpretation': {
            '<135': 'Hyponatrémie',
            '135-145': 'Normal',
            '>145': 'Hypernatrémie',
        },
    },

    'POTASSIUM': {
        'test_code': 'ION-K',
        'name': 'Potassium (K+)',
        'category': 'Ionogrammes',
        'sample_type': 'blood',
        'container_type': 'heparin',
        'unit': 'mmol/L',
        'normal_range_general': '3.5-5.0',
        'critical_low': '<2.5',
        'critical_high': '>6.5',
        'interpretation': {
            '<3.0': 'Hypokaliémie sévère',
            '3.0-3.5': 'Hypokaliémie modérée',
            '3.5-5.0': 'Normal',
            '5.0-6.0': 'Hyperkaliémie modérée',
            '>6.0': 'Hyperkaliémie sévère - URGENCE',
        },
    },

    'MAGNESIUM': {
        'test_code': 'ION-MG',
        'name': 'Magnésium (Mg++)',
        'category': 'Ionogrammes',
        'sample_type': 'blood',
        'container_type': 'heparin',
        'unit': 'mg/L',
        'normal_range_general': '17-25',
        'interpretation': {
            '<15': 'Hypomagnésémie',
            '17-25': 'Normal',
            '>30': 'Hypermagnésémie',
        },
    },

    'PHOSPHORE': {
        'test_code': 'ION-PHOS',
        'name': 'Phosphore (Ph)',
        'category': 'Ionogrammes',
        'sample_type': 'blood',
        'container_type': 'heparin',
        'fasting_required': True,
        'unit': 'mg/L',
        'normal_range_general': '25-45',
        'normal_range_child': '40-70',
    },

    # ========================================
    # HÉMATOLOGIE
    # ========================================

    'NFS': {
        'test_code': 'HEM-NFS',
        'name': 'NFS (Numération Formule Sanguine)',
        'category': 'Hématologie',
        'sample_type': 'blood',
        'container_type': 'edta',
        'methodology': 'Automate d\'hématologie',
        'components': {
            'hemoglobin': {
                'unit': 'g/dL',
                'male': '13.0-17.0',
                'female': '12.0-16.0',
                'child_1_5': '11.0-14.0',
                'child_6_12': '11.5-15.0',
                'critical_low': '<7.0',
                'critical_high': '>20.0',
            },
            'hematocrit': {
                'unit': '%',
                'male': '40-54',
                'female': '36-46',
                'child': '31-43',
            },
            'rbc': {
                'unit': '×10⁶/µL',
                'male': '4.5-5.9',
                'female': '4.0-5.2',
                'child': '3.8-5.5',
            },
            'mcv': {
                'unit': 'fL',
                'normal': '80-100',
                'interpretation': {
                    '<80': 'Microcytose',
                    '80-100': 'Normocytose',
                    '>100': 'Macrocytose',
                },
            },
            'mch': {
                'unit': 'pg',
                'normal': '27-32',
            },
            'mchc': {
                'unit': 'g/dL',
                'normal': '32-36',
            },
            'wbc': {
                'unit': '×10³/µL',
                'normal': '4.0-10.0',
                'child': '5.0-14.0',
                'critical_low': '<1.5',
                'critical_high': '>25.0',
            },
            'neutrophils': {
                'unit': '%',
                'normal': '40-75',
                'absolute_normal': '2.0-7.5 ×10³/µL',
            },
            'lymphocytes': {
                'unit': '%',
                'normal': '20-45',
                'absolute_normal': '1.0-4.0 ×10³/µL',
            },
            'monocytes': {
                'unit': '%',
                'normal': '2-10',
            },
            'eosinophils': {
                'unit': '%',
                'normal': '1-6',
            },
            'basophils': {
                'unit': '%',
                'normal': '0-2',
            },
            'platelets': {
                'unit': '×10³/µL',
                'normal': '150-400',
                'critical_low': '<50',
                'critical_high': '>1000',
            },
        },
    },

    'GROUPE_SANGUIN': {
        'test_code': 'HEM-GS',
        'name': 'Groupe Sanguin ABO-RH',
        'category': 'Hématologie',
        'sample_type': 'blood',
        'container_type': 'edta',
        'methodology': 'Hémagglutination sur carte',
        'possible_results': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },

    'PALUDISME': {
        'test_code': 'PARA-PALU',
        'name': 'Goutte Épaisse (Paludisme)',
        'category': 'Parasitologie',
        'sample_type': 'blood',
        'container_type': 'edta',
        'methodology': 'Microscopie + Quantification parasitaire',
        'normal_range_general': 'Absence de parasites',
        'interpretation': {
            'Négatif': 'Absence de parasites',
            '<1000': 'Parasitémie faible',
            '1000-10000': 'Parasitémie modérée',
            '10000-100000': 'Parasitémie élevée',
            '>100000': 'Paludisme sévère',
        },
    },

    'RETICULOCYTES': {
        'test_code': 'HEM-RETIC',
        'name': 'Réticulocytes',
        'category': 'Hématologie',
        'sample_type': 'blood',
        'container_type': 'edta',
        'unit': '%',
        'normal_range_general': '0.5-1.5',
        'interpretation': {
            '<0.5': 'Régénération médullaire insuffisante',
            '0.5-1.5': 'Normal',
            '>2.5': 'Régénération médullaire active (hémolyse/hémorragie)',
        },
    },

    'TP': {
        'test_code': 'HEM-TP',
        'name': 'Taux de Prothrombine (TP)',
        'category': 'Hématologie',
        'sample_type': 'blood',
        'container_type': 'citrate',
        'unit': '%',
        'normal_range_general': '70-100',
        'critical_low': '<40',
        'interpretation': {
            '<50': 'Risque hémorragique',
            '70-100': 'Normal',
            'INR<1.2': 'Normal',
            'INR 2-3': 'Anticoagulation thérapeutique',
        },
    },

    'VS': {
        'test_code': 'HEM-VS',
        'name': 'Vitesse de Sédimentation',
        'category': 'Hématologie',
        'sample_type': 'blood',
        'container_type': 'edta',
        'unit': 'mm/h',
        'normal_range_male': '<15',
        'normal_range_female': '<20',
        'interpretation': {
            '<20': 'Normal',
            '20-50': 'Syndrome inflammatoire modéré',
            '>50': 'Syndrome inflammatoire important',
        },
    },

    'HBA1C': {
        'test_code': 'HEM-HBA1C',
        'name': 'Hémoglobine Glyquée (HbA1c)',
        'category': 'Hématologie',
        'sample_type': 'blood',
        'container_type': 'edta',
        'unit': '%',
        'normal_range_general': '<5.7',
        'methodology': 'HPLC ou immunoturbidimétrie',
        'interpretation': {
            '<5.7': 'Normal',
            '5.7-6.4': 'Pré-diabète',
            '6.5-7.0': 'Diabète - Objectif thérapeutique atteint',
            '7.0-8.0': 'Diabète - Contrôle suboptimal',
            '8.0-9.0': 'Diabète - Mauvais contrôle',
            '>9.0': 'Diabète - Contrôle très insuffisant',
        },
        'clinical_notes': 'Reflète la glycémie moyenne sur 2-3 mois',
    },

    'ELECTROPHORESE_HB': {
        'test_code': 'HEM-EPHB',
        'name': 'Électrophorèse de l\'Hémoglobine',
        'category': 'Hématologie',
        'sample_type': 'blood',
        'container_type': 'edta',
        'methodology': 'Électrophorèse capillaire',
        'normal_pattern': 'HbA > 95%, HbA2 < 3.5%, HbF < 2%',
        'interpretation': {
            'HbAS': 'Trait drépanocytaire',
            'HbSS': 'Drépanocytose homozygote',
            'HbSC': 'Hémoglobinose SC',
            'HbCC': 'Hémoglobinose C homozygote',
        },
    },

    'ELECTROPHORESE_PROTEINES': {
        'test_code': 'BIO-EPPROT',
        'name': 'Électrophorèse des Protéines Sériques',
        'category': 'Biochimie Générale',
        'sample_type': 'blood',
        'container_type': 'serum',
        'methodology': 'Électrophorèse sur gel',
        'components': {
            'albumin': {'unit': '%', 'normal': '55-65'},
            'alpha1': {'unit': '%', 'normal': '2-4'},
            'alpha2': {'unit': '%', 'normal': '7-10'},
            'beta': {'unit': '%', 'normal': '8-12'},
            'gamma': {'unit': '%', 'normal': '12-18'},
        },
    },

    # ========================================
    # SÉROLOGIE
    # ========================================

    'ASLO': {
        'test_code': 'SERO-ASLO',
        'name': 'ASLO (Antistreptolysines O)',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'UI/mL',
        'normal_range_general': '<200',
        'interpretation': {
            '<200': 'Négatif',
            '200-400': 'Douteux',
            '>400': 'Positif - Infection streptococcique récente',
        },
    },

    'HEPATITE_A': {
        'test_code': 'SERO-HAV',
        'name': 'Hépatite A (IgM anti-HAV)',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'methodology': 'ELISA',
        'normal_range_general': 'Négatif',
        'interpretation': {
            'Négatif': 'Pas d\'infection récente',
            'Positif': 'Infection aiguë VHA',
        },
    },

    'HEPATITE_B': {
        'test_code': 'SERO-HBV',
        'name': 'Hépatite B (AgHBs)',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'methodology': 'ELISA',
        'normal_range_general': 'Négatif',
        'interpretation': {
            'Négatif': 'Pas d\'infection VHB active',
            'Positif': 'Infection VHB active ou porteur chronique',
        },
    },

    'HEPATITE_C': {
        'test_code': 'SERO-HCV',
        'name': 'Hépatite C (Ac anti-HCV)',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'methodology': 'ELISA',
        'normal_range_general': 'Négatif',
        'interpretation': {
            'Négatif': 'Pas de contact avec VHC',
            'Positif': 'Infection VHC (active ou guérie)',
        },
    },

    'HERPES': {
        'test_code': 'SERO-HSV',
        'name': 'Herpes (IgG et IgM)',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'methodology': 'ELISA',
        'interpretation': {
            'IgM+/IgG-': 'Primo-infection récente',
            'IgM+/IgG+': 'Réactivation',
            'IgM-/IgG+': 'Infection ancienne',
            'IgM-/IgG-': 'Pas de contact',
        },
    },

    'FACTEUR_RHUMATOIDE': {
        'test_code': 'SERO-FR',
        'name': 'Facteur Rhumatoïde',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'UI/mL',
        'normal_range_general': '<14',
        'interpretation': {
            '<14': 'Négatif',
            '14-40': 'Faiblement positif',
            '>40': 'Fortement positif - Polyarthrite rhumatoïde',
        },
    },

    'SYPHILIS': {
        'test_code': 'SERO-SYPH',
        'name': 'Syphilis (TPHA-VDRL)',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'methodology': 'TPHA + VDRL',
        'interpretation': {
            'TPHA-/VDRL-': 'Négatif',
            'TPHA+/VDRL+': 'Syphilis active',
            'TPHA+/VDRL-': 'Cicatrice sérologique',
        },
    },

    'TEST_GROSSESSE': {
        'test_code': 'SERO-PREG',
        'name': 'Test de Grossesse (β-hCG)',
        'category': 'Sérologie',
        'sample_type': 'urine',
        'container_type': 'urine_cup',
        'methodology': 'Test immunochromatographique',
        'normal_range_general': 'Négatif',
        'interpretation': {
            'Négatif': 'Pas de grossesse',
            'Positif': 'Grossesse confirmée',
        },
    },

    'VIH': {
        'test_code': 'SERO-HIV',
        'name': 'VIH 1 & VIH 2',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'methodology': 'ELISA + Test rapide',
        'normal_range_general': 'Négatif',
        'interpretation': {
            'Négatif': 'Pas d\'infection VIH détectée',
            'Positif': 'Infection VIH - Confirmation nécessaire',
        },
        'window_period': '3-12 semaines',
    },

    'TOXOPLASMOSE': {
        'test_code': 'SERO-TOXO',
        'name': 'Toxoplasmose (IgG et IgM)',
        'category': 'Sérologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'methodology': 'ELISA',
        'interpretation': {
            'IgM-/IgG-': 'Pas d\'immunité - Surveillance grossesse',
            'IgM-/IgG+': 'Immunité ancienne - Protégée',
            'IgM+/IgG-': 'Primo-infection',
            'IgM+/IgG+': 'Infection récente ou réactivation',
        },
    },

    'CHLAMYDIA': {
        'test_code': 'SERO-CHLAM',
        'name': 'Chlamydia Trachomatis',
        'category': 'Sérologie',
        'sample_type': 'swab',
        'container_type': 'swab_kit',
        'methodology': 'PCR ou ELISA',
        'normal_range_general': 'Négatif',
    },

    # ========================================
    # BACTÉRIOLOGIE
    # ========================================

    'ECBU': {
        'test_code': 'BACT-ECBU',
        'name': 'ECBU (Examen Cytobactériologique des Urines)',
        'category': 'Bactériologie',
        'sample_type': 'urine',
        'container_type': 'urine_cup',
        'methodology': 'Culture + Antibiogramme',
        'normal_range_general': '<10³ UFC/mL',
        'interpretation': {
            '<10³': 'Stérile ou contamination',
            '10³-10⁴': 'Douteux',
            '≥10⁵': 'Infection urinaire confirmée',
        },
        'turnaround_time': '48-72h',
    },

    'COPROCULTURE': {
        'test_code': 'BACT-COPRO',
        'name': 'Coproculture',
        'category': 'Bactériologie',
        'sample_type': 'stool',
        'container_type': 'stool_cup',
        'methodology': 'Culture sur milieux sélectifs',
        'research_targets': ['Salmonella', 'Shigella', 'Campylobacter', 'Yersinia'],
        'turnaround_time': '72-96h',
    },

    'SPERMOCULTURE': {
        'test_code': 'BACT-SPERMO',
        'name': 'Spermoculture',
        'category': 'Bactériologie',
        'sample_type': 'semen',
        'methodology': 'Culture + Antibiogramme',
        'normal_range_general': '<10³ UFC/mL',
        'turnaround_time': '48-72h',
    },

    'SPERMOGRAMME': {
        'test_code': 'BACT-SPERMO-GRAM',
        'name': 'Spermogramme',
        'category': 'Bactériologie',
        'sample_type': 'semen',
        'methodology': 'Analyse microscopique (WHO 2021)',
        'normal_values': {
            'volume': {'unit': 'mL', 'normal': '≥1.5'},
            'concentration': {'unit': '×10⁶/mL', 'normal': '≥15'},
            'motilité_totale': {'unit': '%', 'normal': '≥40'},
            'motilité_progressive': {'unit': '%', 'normal': '≥32'},
            'vitalité': {'unit': '%', 'normal': '≥58'},
            'formes_normales': {'unit': '%', 'normal': '≥4'},
        },
    },

    # ========================================
    # PARASITOLOGIE
    # ========================================

    'KAOP': {
        'test_code': 'PARA-KAOP',
        'name': 'KAOP (Examen Parasitologique des Selles)',
        'category': 'Parasitologie',
        'sample_type': 'stool',
        'container_type': 'stool_cup',
        'methodology': 'Examen direct + concentration',
        'normal_range_general': 'Absence de parasites',
        'parasites_searched': [
            'Ascaris lumbricoides',
            'Trichuris trichiura',
            'Ankylostomes',
            'Oxyures',
            'Giardia intestinalis',
            'Entamoeba histolytica',
        ],
    },

    # ========================================
    # HORMONOLOGIE
    # ========================================

    'PSA': {
        'test_code': 'HORM-PSA',
        'name': 'PSA (Antigène Prostatique Spécifique)',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'ng/mL',
        'normal_range_general': '<4.0',
        'interpretation': {
            '<2.5': 'Normal (< 50 ans)',
            '<4.0': 'Normal (> 50 ans)',
            '4.0-10.0': 'Zone grise - Surveillance',
            '>10.0': 'Élevé - Biopsie recommandée',
        },
    },

    'TSH': {
        'test_code': 'HORM-TSH',
        'name': 'TSH (Hormone Thyréostimulante)',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'mUI/L',
        'normal_range_general': '0.4-4.0',
        'interpretation': {
            '<0.1': 'Hyperthyroïdie manifeste',
            '0.1-0.4': 'Hyperthyroïdie subclinique',
            '0.4-4.0': 'Euthyroïdie (normal)',
            '4.0-10.0': 'Hypothyroïdie subclinique',
            '>10.0': 'Hypothyroïdie manifeste',
        },
    },

    'T3': {
        'test_code': 'HORM-T3',
        'name': 'T3 Libre (Triiodothyronine)',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'pg/mL',
        'normal_range_general': '2.3-4.2',
    },

    'T4': {
        'test_code': 'HORM-T4',
        'name': 'T4 Libre (Thyroxine)',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'ng/dL',
        'normal_range_general': '0.8-1.8',
    },

    'OESTROGENE': {
        'test_code': 'HORM-E2',
        'name': 'Œstradiol (E2)',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'pg/mL',
        'normal_range_female_follicular': '30-120',
        'normal_range_female_ovulation': '130-370',
        'normal_range_female_luteal': '70-250',
        'normal_range_male': '10-50',
    },

    'PROGESTERONE': {
        'test_code': 'HORM-PROG',
        'name': 'Progestérone',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'ng/mL',
        'normal_range_female_follicular': '<1.0',
        'normal_range_female_luteal': '5.0-20.0',
        'normal_range_male': '<1.0',
    },

    'TESTOSTERONE': {
        'test_code': 'HORM-TESTO',
        'name': 'Testostérone Totale',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'ng/mL',
        'normal_range_male': '3.0-10.0',
        'normal_range_female': '0.1-0.8',
    },

    'FSH': {
        'test_code': 'HORM-FSH',
        'name': 'FSH (Hormone Folliculo-Stimulante)',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'mUI/mL',
        'normal_range_female_follicular': '3.5-12.5',
        'normal_range_female_ovulation': '4.7-21.5',
        'normal_range_female_luteal': '1.7-7.7',
        'normal_range_female_menopause': '25.8-134.8',
        'normal_range_male': '1.5-12.4',
    },

    'LH': {
        'test_code': 'HORM-LH',
        'name': 'LH (Hormone Lutéinisante)',
        'category': 'Hormonologie',
        'sample_type': 'blood',
        'container_type': 'serum',
        'unit': 'mUI/mL',
        'normal_range_female_follicular': '2.4-12.6',
        'normal_range_female_ovulation': '14.0-95.6',
        'normal_range_female_luteal': '1.0-11.4',
        'normal_range_male': '1.7-8.6',
    },

    # ========================================
    # BILANS COMPOSITES
    # ========================================

    'BILAN_HTA_DIABETE': {
        'test_code': 'BILAN-HTADIAB',
        'name': 'Bilan HTA/Diabète',
        'category': 'Bilans Composites',
        'tests_included': [
            'BIO-GLU', 'HEM-HBA1C', 'BIO-UREE', 'BIO-CREAS',
            'ION-CS', 'BIO-BLIP', 'HEM-NFS',
        ],
    },

    'BILAN_PRENATAL': {
        'test_code': 'BILAN-PRENAT',
        'name': 'Bilan Prénatal',
        'category': 'Bilans Composites',
        'tests_included': [
            'SERO-HIV', 'SERO-TOXO', 'SERO-HBV', 'HEM-GS',
            'HEM-NFS', 'BIO-GLU', 'SERO-SYPH',
        ],
    },
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_reference_range(test_code, gender=None, age=None):
    """
    Get appropriate reference range based on patient demographics

    Args:
        test_code: Test code (e.g., 'BIO-GLU')
        gender: 'M' or 'F'
        age: Patient age in years

    Returns:
        str: Appropriate reference range
    """
    if test_code not in LAB_TEST_REFERENCES:
        return None

    ref = LAB_TEST_REFERENCES[test_code]

    # Check if it's a composite test
    if 'components' in ref:
        return "Voir composants individuels"

    # Age-based logic (pediatric)
    if age and age < 18:
        if 'normal_range_child' in ref:
            return ref['normal_range_child']

    # Gender-based logic
    if gender == 'M' and 'normal_range_male' in ref:
        return ref['normal_range_male']
    elif gender == 'F' and 'normal_range_female' in ref:
        return ref['normal_range_female']

    # Default to general range
    return ref.get('normal_range_general', '')


def is_result_abnormal(test_code, result_value, gender=None, age=None):
    """
    Determine if a result is abnormal

    Args:
        test_code: Test code
        result_value: Numeric result value
        gender: 'M' or 'F'
        age: Patient age

    Returns:
        tuple: (is_abnormal: bool, severity: str)
            severity can be: 'normal', 'low', 'high', 'critical_low', 'critical_high'
    """
    if test_code not in LAB_TEST_REFERENCES:
        return False, 'normal'

    ref = LAB_TEST_REFERENCES[test_code]

    # Get appropriate reference range
    range_str = get_reference_range(test_code, gender, age)

    if not range_str or not isinstance(result_value, (int, float)):
        return False, 'normal'

    # Parse range (format: "min-max" or "<value" or ">value")
    if '-' in range_str:
        parts = range_str.split('-')
        try:
            min_val = float(parts[0])
            max_val = float(parts[1])

            # Check critical values
            if 'critical_low' in ref:
                critical_low = float(ref['critical_low'].replace('<', '').replace('>', ''))
                if result_value < critical_low:
                    return True, 'critical_low'

            if 'critical_high' in ref:
                critical_high = float(ref['critical_high'].replace('<', '').replace('>', ''))
                if result_value > critical_high:
                    return True, 'critical_high'

            # Check normal range
            if result_value < min_val:
                return True, 'low'
            elif result_value > max_val:
                return True, 'high'
            else:
                return False, 'normal'
        except:
            return False, 'normal'

    return False, 'normal'


def get_interpretation(test_code, result_value):
    """
    Get clinical interpretation for a test result

    Args:
        test_code: Test code
        result_value: Result value (numeric or string)

    Returns:
        str: Clinical interpretation
    """
    if test_code not in LAB_TEST_REFERENCES:
        return ""

    ref = LAB_TEST_REFERENCES[test_code]

    if 'interpretation' not in ref:
        return ""

    interpretation_dict = ref['interpretation']

    # If result is numeric, find matching range
    if isinstance(result_value, (int, float)):
        for range_str, meaning in interpretation_dict.items():
            if '<' in range_str:
                threshold = float(range_str.replace('<', ''))
                if result_value < threshold:
                    return meaning
            elif '>' in range_str:
                threshold = float(range_str.replace('>', ''))
                if result_value > threshold:
                    return meaning
            elif '-' in range_str:
                parts = range_str.split('-')
                try:
                    min_val = float(parts[0])
                    max_val = float(parts[1])
                    if min_val <= result_value <= max_val:
                        return meaning
                except:
                    continue

    return ""


def get_all_test_codes():
    """Get list of all test codes"""
    return list(LAB_TEST_REFERENCES.keys())


def get_tests_by_category(category):
    """Get all tests in a specific category"""
    return [
        test_code for test_code, data in LAB_TEST_REFERENCES.items()
        if data.get('category') == category
    ]


def get_test_categories():
    """Get list of all test categories"""
    categories = set()
    for data in LAB_TEST_REFERENCES.values():
        if 'category' in data:
            categories.add(data['category'])
    return sorted(list(categories))
