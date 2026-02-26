"""
Met a jour les valeurs de reference des examens de laboratoire.
"""
from django.core.management.base import BaseCommand
from apps.laboratory.models import LabTest


REFERENCE_DATA = [

    # ===== HEMATOLOGIE =====
    {
        'match': 'NUM\u00c9RATION FORMULE',
        'template': (
            "WBC : \n"
            "LYM# : \n"
            "MID# : \n"
            "GRA# : \n"
            "MONO# : \n"
            "LYM% : \n"
            "MID% : \n"
            "GRA% : \n"
            "MONO% : \n"
            "RBC : \n"
            "HGB : \n"
            "HCT : \n"
            "MCV : \n"
            "MCH : \n"
            "MCHC : \n"
            "RDW-CV : \n"
            "RDW-SD : \n"
            "PLT : \n"
            "MPV : \n"
            "PDW : \n"
            "PCT : \n"
            "P-LCC : \n"
            "P-LCR : "
        ),
        'male': (
            "WBC : 4.5\u201311.0 \u00d710\u2079/L\n"
            "LYM# : 1.0\u20134.8 \u00d710\u2079/L\n"
            "MID# : 0.0\u20130.9 \u00d710\u2079/L\n"
            "GRA# : 1.8\u20137.7 \u00d710\u2079/L\n"
            "MONO# : 0.1\u20131.0 \u00d710\u2079/L\n"
            "LYM% : 20\u201340 %\n"
            "MID% : 2\u20138 %\n"
            "GRA% : 50\u201370 %\n"
            "MONO% : 2\u201310 %\n"
            "RBC : 4.5\u20135.5 \u00d710\u00b9\u00b2/L\n"
            "HGB : 130\u2013175 g/L\n"
            "HCT : 40\u201352 %\n"
            "MCV : 80\u2013100 fL\n"
            "MCH : 27\u201333 pg\n"
            "MCHC : 315\u2013360 g/L\n"
            "RDW-CV : 11.5\u201314.5 %\n"
            "RDW-SD : 35\u201356 fL\n"
            "PLT : 150\u2013400 \u00d710\u2079/L\n"
            "MPV : 7.5\u201312.5 fL\n"
            "PDW : 9.0\u201317.9 %\n"
            "PCT : 0.100\u20130.500 %\n"
            "P-LCC : 30\u201390 \u00d710\u2079/L\n"
            "P-LCR : 13\u201343 %"
        ),
        'female': (
            "WBC : 4.5\u201311.0 \u00d710\u2079/L\n"
            "LYM# : 1.0\u20134.8 \u00d710\u2079/L\n"
            "MID# : 0.0\u20130.9 \u00d710\u2079/L\n"
            "GRA# : 1.8\u20137.7 \u00d710\u2079/L\n"
            "MONO# : 0.1\u20131.0 \u00d710\u2079/L\n"
            "LYM% : 20\u201340 %\n"
            "MID% : 2\u20138 %\n"
            "GRA% : 50\u201370 %\n"
            "MONO% : 2\u201310 %\n"
            "RBC : 4.0\u20135.0 \u00d710\u00b9\u00b2/L\n"
            "HGB : 120\u2013160 g/L\n"
            "HCT : 36\u201346 %\n"
            "MCV : 80\u2013100 fL\n"
            "MCH : 27\u201333 pg\n"
            "MCHC : 315\u2013360 g/L\n"
            "RDW-CV : 11.5\u201314.5 %\n"
            "RDW-SD : 35\u201356 fL\n"
            "PLT : 150\u2013400 \u00d710\u2079/L\n"
            "MPV : 7.5\u201312.5 fL\n"
            "PDW : 9.0\u201317.9 %\n"
            "PCT : 0.100\u20130.500 %\n"
            "P-LCC : 30\u201390 \u00d710\u2079/L\n"
            "P-LCR : 13\u201343 %"
        ),
        'general': '',
    },
    {
        'match': 'TAUX DE PROTHROMBINE',
        'template': (
            "TP : %\n"
            "INR : \n"
            "TQ : s\n"
            "TCK : s\n"
            "Fibrinogene : g/L"
        ),
        'general': (
            "TP : 70\u2013100 %\n"
            "INR : 0.8\u20131.2  (anticoag. : 2.0\u20133.0 / valve : 2.5\u20133.5)\n"
            "TQ : 11\u201314 s\n"
            "TCK : 25\u201340 s  (ratio < 1.2)\n"
            "Fibrinogene : 2.0\u20134.0 g/L"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'TAUX DE R\u00c9TICULOCYTES',
        'general': (
            "R\u00e9ticulocytes % : 0.5\u20132.5 %\n"
            "R\u00e9ticulocytes abs. : 25\u2013100 \u00d710\u2079/L\n"
            "R\u00e9g\u00e9n\u00e9ratif : > 120 \u00d710\u2079/L | Ar\u00e9g\u00e9n\u00e9ratif : < 25 \u00d710\u2079/L"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'VITESSE DE S\u00c9DIMENTATION',
        'male': "1h : < 15 mm | 2h : < 20 mm  (> 50 ans : < 20 / < 30 mm)",
        'female': "1h : < 20 mm | 2h : < 30 mm  (> 50 ans : < 30 / < 40 mm)",
        'general': '',
    },
    {
        'match': "\u00c9LECTROPHOR\u00c8SE DE L'H\u00c9MOGLOBINE",
        'general': (
            "HbA : 95\u201398 %\n"
            "HbA2 : 2.0\u20133.5 %  (> 3.5 % = trait \u03b2-thal.)\n"
            "HbF : < 2 %  (> 2 % pathologique apr\u00e8s 6 mois)\n"
            "HbS : Absent"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'G6PDH',
        'general': (
            "Activit\u00e9 G6PD : 7\u201320 UI/g Hb\n"
            "D\u00e9ficit s\u00e9v\u00e8re : < 2 UI/g Hb | Partiel : 2\u20137 UI/g Hb"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'GROUPE SANGUIN',
        'general': "Groupe ABO : A, B, AB ou O\nRh\u00e9sus (D) : Rh+ ou Rh\u2212",
        'male': '', 'female': '',
    },
    {
        'match': 'H\u00c9MOGLOBINE HbA1C',
        'general': (
            "< 5.7 % : Normal\n"
            "5.7\u20136.4 % : Pr\u00e9diab\u00e8te\n"
            ">= 6.5 % : Diab\u00e8te\n"
            "Objectif diab\u00e9tique : < 7.0 %  (fragile : < 8.0 %)"
        ),
        'male': '', 'female': '',
    },

    # ===== BIOCHIMIE - GLUCIDES =====
    {
        'match': 'GLYC\u00c9MIE \u00c0 JEUN',
        'general': (
            "Normal : 70\u2013100 mg/dL  (3.9\u20135.5 mmol/L)\n"
            "Pr\u00e9diab\u00e8te : 100\u2013125 mg/dL\n"
            "Diab\u00e8te : >= 126 mg/dL\n"
            "Hypoglyc\u00e9mie : < 70 mg/dL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'GLYC\u00c9MIE POST PRANDIALE',
        'general': (
            "Normal \u00e0 2h : < 140 mg/dL\n"
            "Pr\u00e9diab\u00e8te \u00e0 2h : 140\u2013199 mg/dL\n"
            "Diab\u00e8te \u00e0 2h : >= 200 mg/dL"
        ),
        'male': '', 'female': '',
    },

    # ===== BIOCHIMIE - FONCTION RENALE =====
    {
        'match': 'CR\u00c9ATININE',
        'male': (
            "Cr\u00e9atinine : 70\u2013106 \u00b5mol/L  (0.8\u20131.2 mg/dL)\n"
            "DFG (CKD-EPI) : >= 90 = Normal | 60\u201389 = L\u00e9ger\n"
            "45\u201359 = Mod\u00e9r\u00e9 | 30\u201344 = Mod\u00e9r\u00e9-s\u00e9v\u00e8re\n"
            "15\u201329 = S\u00e9v\u00e8re | < 15 = IRC terminale"
        ),
        'female': (
            "Cr\u00e9atinine : 44\u201380 \u00b5mol/L  (0.5\u20130.9 mg/dL)\n"
            "DFG (CKD-EPI) : >= 90 = Normal | 60\u201389 = L\u00e9ger\n"
            "45\u201359 = Mod\u00e9r\u00e9 | 30\u201344 = Mod\u00e9r\u00e9-s\u00e9v\u00e8re\n"
            "15\u201329 = S\u00e9v\u00e8re | < 15 = IRC terminale"
        ),
        'general': '',
    },
    {
        'match': 'UR\u00c9E',
        'general': (
            "Ur\u00e9e : 2.5\u20137.5 mmol/L  (15\u201345 mg/dL)\n"
            "Ratio Ur\u00e9e/Cr\u00e9atinine : 40\u2013100  (> 100 = cause pr\u00e9r\u00e9nale)"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'ACIDE URIQUE',
        'male': "Acide urique : 200\u2013420 \u00b5mol/L  (3.4\u20137.0 mg/dL)",
        'female': "Acide urique : 140\u2013360 \u00b5mol/L  (2.4\u20136.0 mg/dL)",
        'general': '',
    },

    # ===== BIOCHIMIE - PROTEINES =====
    {
        'match': 'ALBUMINE',
        'general': (
            "Albumine : 35\u201352 g/L\n"
            "< 35 g/L : hypoalbuminémie | < 28 g/L : sévère"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'PROT\u00c9INES TOTALES',
        'general': (
            "Prot\u00e9ines totales : 60\u201380 g/L\n"
            "Albumine : 35\u201352 g/L | Globulines : 20\u201335 g/L"
        ),
        'male': '', 'female': '',
    },
    {
        'match': '\u00c9LECTROPHOR\u00c8SE PROT\u00c9INES',
        'general': (
            "Albumine : 35\u201352 g/L  (55\u201365 %)\n"
            "\u03b11-globulines : 2\u20134 g/L  (2\u20135 %)\n"
            "\u03b12-globulines : 5\u20139 g/L  (7\u201312 %)\n"
            "\u03b2-globulines : 6\u201311 g/L  (8\u201314 %)\n"
            "\u03b3-globulines : 7\u201316 g/L  (11\u201321 %)"
        ),
        'male': '', 'female': '',
    },

    # ===== BIOCHIMIE - BILAN HEPATIQUE =====
    {
        'match': 'BILIRUBINE TOTALE',
        'general': (
            "Bilirubine totale : 0\u201320 \u00b5mol/L  (0\u20131.2 mg/dL)\n"
            "Sub-ict\u00e8re : 20\u201340 | Ict\u00e8re : > 40 \u00b5mol/L"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'BILIRUBINE DIRECTE',
        'general': (
            "Bilirubine directe : 0\u20135 \u00b5mol/L  (< 25% du total)\n"
            "Bilirubine indirecte : 0\u201317 \u00b5mol/L"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'SGOT',
        'template': (
            "ASAT (SGOT) :  UI/L\n"
            "ALAT (SGPT) :  UI/L"
        ),
        'male': (
            "ASAT/SGOT : < 40 UI/L\n"
            "ALAT/SGPT : < 41 UI/L\n"
            "Ratio ASAT/ALAT : < 1 viral | > 2 alcoolique\n"
            "LDH : 135\u2013214 UI/L"
        ),
        'female': (
            "ASAT/SGOT : < 35 UI/L\n"
            "ALAT/SGPT : < 35 UI/L\n"
            "Ratio ASAT/ALAT : < 1 viral | > 2 alcoolique"
        ),
        'general': '',
    },
    {
        'match': 'GAMMA GT',
        'male': "GGT : < 55 UI/L",
        'female': "GGT : < 38 UI/L",
        'general': '',
    },
    {
        'match': 'PAL (PHOSPHATASE',
        'general': (
            "PAL : 40\u2013130 UI/L  (enfant : jusqu'\u00e0 400 UI/L)\n"
            "Grossesse T3 : jusqu'\u00e0 3\u00d7 LSN"
        ),
        'male': '', 'female': '',
    },

    # ===== BIOCHIMIE - BILAN LIPIDIQUE =====
    {
        'match': 'CHOLEST\u00c9ROL TOTAL',
        'general': (
            "Optimal : < 200 mg/dL  (< 5.2 mmol/L)\n"
            "Limite : 200\u2013239 mg/dL\n"
            "\u00c9lev\u00e9 : >= 240 mg/dL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'CHOLEST\u00c9ROL HDL',
        'male': "HDL : > 40 mg/dL  (optimal > 60 mg/dL)",
        'female': "HDL : > 50 mg/dL  (optimal > 60 mg/dL)",
        'general': '',
    },
    {
        'match': 'CHOLEST\u00c9ROL LDL',
        'general': (
            "Optimal : < 100 mg/dL\n"
            "Limite : 130\u2013159 mg/dL\n"
            "\u00c9lev\u00e9 : >= 160 mg/dL\n"
            "Risque \u00e9lev\u00e9 : < 70 mg/dL | Tr\u00e8s \u00e9lev\u00e9 : < 55 mg/dL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'TRIGLYC\u00c9RIDES',
        'general': (
            "Normal : < 150 mg/dL  (< 1.7 mmol/L)\n"
            "Limite : 150\u2013199 | \u00c9lev\u00e9 : 200\u2013499\n"
            "Tr\u00e8s \u00e9lev\u00e9 : >= 500 mg/dL (risque pancr\u00e9atite)"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'BILAN LIPIDIQUE',
        'template': (
            "CT : mg/dL\n"
            "HDL : mg/dL\n"
            "LDL : mg/dL\n"
            "TG : mg/dL\n"
            "Non-HDL : mg/dL\n"
            "Ratio CT/HDL : "
        ),
        'male': (
            "CT : < 200 mg/dL\n"
            "HDL : > 40 mg/dL\n"
            "LDL : < 130 mg/dL\n"
            "TG : < 150 mg/dL\n"
            "Ratio CT/HDL : < 5.0"
        ),
        'female': (
            "CT : < 200 mg/dL\n"
            "HDL : > 50 mg/dL\n"
            "LDL : < 130 mg/dL\n"
            "TG : < 150 mg/dL\n"
            "Ratio CT/HDL : < 4.5"
        ),
        'general': '',
    },

    # ===== BIOCHIMIE - MINERAUX =====
    {
        'match': 'FER S\u00c9RIQUE',
        'template': (
            "Fer s\u00e9rique : \u00b5mol/L\n"
            "Ferritine : \u00b5g/L\n"
            "Transferrine : mg/dL\n"
            "Coeff. saturation : %"
        ),
        'male': (
            "Fer s\u00e9rique : 11\u201328 \u00b5mol/L\n"
            "Ferritine : 30\u2013300 \u00b5g/L  (< 30 : carence)\n"
            "Transferrine : 220\u2013370 mg/dL\n"
            "Saturation transferrine : 20\u201345 %  (< 16 % : carence)"
        ),
        'female': (
            "Fer s\u00e9rique : 9\u201330 \u00b5mol/L\n"
            "Ferritine : 15\u2013150 \u00b5g/L  (< 15 : carence)\n"
            "Transferrine : 220\u2013370 mg/dL\n"
            "Saturation transferrine : 15\u201340 %  (< 16 % : carence)"
        ),
        'general': '',
    },
    {
        'match': 'CALCIUM CA++',
        'general': (
            "Ca++ total : 2.15\u20132.55 mmol/L  (8.6\u201310.2 mg/dL)\n"
            "Ca++ ionis\u00e9 : 1.15\u20131.35 mmol/L"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'MAGN\u00c9SIUM MG++',
        'general': "Mg++ : 0.75\u20131.10 mmol/L  (1.8\u20132.6 mg/dL)",
        'male': '', 'female': '',
    },
    {
        'match': 'PHOSPHORE PH',
        'general': "Phosphore : 0.80\u20131.45 mmol/L  (2.5\u20134.5 mg/dL)",
        'male': '', 'female': '',
    },
    {
        'match': 'POTASSIUM K+',
        'general': (
            "K+ : 3.5\u20135.0 mmol/L\n"
            "Hypo : < 3.5 | Hyper : > 5.0 (arythmie > 6.0)"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'SODIUM NA+',
        'general': (
            "Na+ : 136\u2013145 mmol/L\n"
            "Hypo : < 136 (s\u00e9v\u00e8re < 125) | Hyper : > 145"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'IONOGRAMME SIMPLE',
        'template': (
            "Na+ : mmol/L\n"
            "K+ : mmol/L\n"
            "Cl\u2212 : mmol/L"
        ),
        'general': (
            "Na+ : 136\u2013145 mmol/L\n"
            "K+ : 3.5\u20135.0 mmol/L\n"
            "Cl\u2212 : 98\u2013106 mmol/L\n"
            "HCO3\u2212 : 22\u201329 mmol/L\n"
            "Trou anionique : 8\u201316 mmol/L"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'IONOGRAMME COMPLET',
        'template': (
            "Na+ : mmol/L\n"
            "K+ : mmol/L\n"
            "Cl\u2212 : mmol/L\n"
            "HCO3\u2212 : mmol/L\n"
            "Mg++ : mmol/L\n"
            "Ca++ : mmol/L\n"
            "Phosphore : mmol/L"
        ),
        'general': (
            "Na+ : 136\u2013145 mmol/L\n"
            "K+ : 3.5\u20135.0 mmol/L\n"
            "Cl\u2212 : 98\u2013106 mmol/L\n"
            "HCO3\u2212 : 22\u201329 mmol/L\n"
            "Trou anionique : 8\u201316 mmol/L\n"
            "Mg++ : 0.75\u20131.10 mmol/L\n"
            "Ca++ : 2.15\u20132.55 mmol/L\n"
            "Phosphore : 0.80\u20131.45 mmol/L\n"
            "Osmolal. calc. : 280\u2013300 mOsm/kg"
        ),
        'male': '', 'female': '',
    },

    # ===== INFLAMMATION / IMMUNOLOGIE =====
    {
        'match': 'CRP',
        'general': (
            "CRP : < 5 mg/L\n"
            "5\u201310 : l\u00e9g\u00e8re | 10\u201340 : mod\u00e9r\u00e9e\n"
            "40\u2013200 : bact. s\u00e9v\u00e8re | > 200 : sepsis"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'ASLO',
        'general': (
            "ASLO adulte : < 200 UI/mL\n"
            "200\u2013400 : douteux | > 400 : positif\n"
            "Enfant < 5 ans : < 100 | 5\u201315 ans : < 250 UI/mL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'FACTEUR RHUMATO\u00cfDE',
        'general': (
            "FR : < 14 UI/mL\n"
            "14\u201360 : limite | > 60 : positif\n"
            "Anti-CCP : < 7 U/mL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'PROCALCITONINE',
        'general': (
            "PCT : < 0.05 ng/mL\n"
            "0.05\u20130.50 : virus/l\u00e9ger\n"
            "0.50\u20132.0 : bact. probable\n"
            "2.0\u201310 : sepsis | > 10 : choc septique"
        ),
        'male': '', 'female': '',
    },

    # ===== CHIMIE URINAIRE =====
    {
        'match': 'CHIMIE URINAIRE',
        'general': (
            "pH : 5.0\u20138.0\n"
            "Densit\u00e9 : 1.005\u20131.030\n"
            "Leucocytes : N\u00e9gatif  (< 10/\u00b5L)\n"
            "Nitrites : N\u00e9gatif\n"
            "Prot\u00e9ines : N\u00e9gatif  (< 0.15 g/L)\n"
            "Glucose : N\u00e9gatif\n"
            "Sang/Hb : N\u00e9gatif  (H\u00e9maturie > 5 GR/\u00b5L)\n"
            "C\u00e9tones : N\u00e9gatif\n"
            "Bilirubine : N\u00e9gatif\n"
            "Urobilinogène : 0.1\u20131.0 mg/dL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'ECBU',
        'general': (
            "Leucocytes : < 10/\u00b5L  (infect. > 10 000/mL)\n"
            "Bact\u00e9ries : < 10\u00b3 UFC/mL  (infect. >= 10\u2075)\n"
            "H\u00e9maties : < 5/\u00b5L"
        ),
        'male': '', 'female': '',
    },

    # ===== SEROLOGIE VIRALE =====
    {
        'match': 'VIH',
        'general': (
            "Ag p24 + Ac anti-VIH 1/2 : N\u00e9gatif\n"
            "Charge virale VIH-1 ARN : < 20 copies/mL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'H\u00c9PATITE A',
        'general': (
            "IgM anti-HAV : N\u00e9gatif  (+ = infection aig\u00fce)\n"
            "IgG anti-HAV : Variable  (+ = immunit\u00e9)"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'H\u00c9PATITE B',
        'general': (
            "AgHBs : N\u00e9gatif\n"
            "Ac anti-HBs : > 10 UI/L = immunit\u00e9 (vaccin)\n"
            "Ac anti-HBc IgM : N\u00e9gatif  (+ = aig\u00fce)\n"
            "AgHBe : N\u00e9gatif\n"
            "ADN VHB : < 10 UI/mL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'H\u00c9PATITE C',
        'general': (
            "Ac anti-VHC : N\u00e9gatif\n"
            "ARN VHC (PCR) : N\u00e9gatif"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'SYPHILIS',
        'general': (
            "TPHA : N\u00e9gatif\n"
            "VDRL : N\u00e9gatif  (titre < 1/2)"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'TOXOPLASMOSE',
        'general': (
            "IgM anti-Toxo : N\u00e9gatif  (< 6 UI/mL)\n"
            "IgG anti-Toxo : N\u00e9gatif ou variable\n"
            "Avidit\u00e9 IgG \u00e9lev\u00e9e (> 60%) : ancienne (> 4 mois)"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'RUB\u00c9OLE',
        'general': (
            "IgG anti-Rub\u00e9ole : > 10 UI/mL = immun\u00e9\n"
            "IgM anti-Rub\u00e9ole : N\u00e9gatif  (+ = infection r\u00e9cente)"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'HERP\u00c8S',
        'general': (
            "IgM anti-HSV 1/2 : N\u00e9gatif\n"
            "IgG anti-HSV 1 : Variable  (commun 60\u201380%)\n"
            "IgG anti-HSV 2 : N\u00e9gatif  (+ = herp\u00e8s g\u00e9nital)"
        ),
        'male': '', 'female': '',
    },

    # ===== PARASITOLOGIE / BACTERIOLOGIE =====
    {
        'match': 'PALUDISME',
        'general': (
            "TDR Plasmodium : N\u00e9gatif\n"
            "Frottis / Goutte \u00e9paisse : N\u00e9gatif\n"
            "Parasit\u00e9mie P. falciparum : < 1% l\u00e9ger | > 5% grave"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'SELLES : KAOP',
        'general': (
            "Macro : consistance normale, sans sang ni mucus\n"
            "Micro : \u0152ufs, kystes, larves : Absent\n"
            "Kato-Katz : 0 oeuf/g"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'H\u00c9MOCULTURE',
        'general': (
            "H\u00e9moculture : St\u00e9rile (n\u00e9gative)\n"
            "Si positive : identification + antibiogramme"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'GONOCOQUE',
        'general': (
            "Neisseria gonorrhoeae : N\u00e9gatif\n"
            "Antibiogramme si culture positive"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'COPROCULTURE',
        'general': (
            "Salmonella, Shigella, Campylobacter : Absents\n"
            "E. coli path., Yersinia : Absents\n"
            "Antibiogramme si culture positive"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'SPERMOCULTURE',
        'general': (
            "Spermoculture : St\u00e9rile\n"
            "Infection : >= 10\u00b3 UFC/mL\n"
            "Antibiogramme si positif"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'SPERMOGRAMME',
        'template': (
            "Volume : mL\n"
            "pH : \n"
            "Concentration : millions/mL\n"
            "Nb total spz : millions\n"
            "Mobilit\u00e9 progressive (PR) : %\n"
            "Mobilit\u00e9 totale (PR+NP) : %\n"
            "Vitalit\u00e9 : %\n"
            "Formes normales (Kruger) : %"
        ),
        'general': (
            "Volume : >= 1.4 mL\n"
            "pH : 7.2\u20138.0\n"
            "Concentration : >= 16 millions/mL\n"
            "Nb total spz : >= 39 millions\n"
            "PR : >= 30 %\n"
            "PR+NP : >= 42 %\n"
            "Vitalit\u00e9 : >= 54 %\n"
            "Formes normales : >= 4 %"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'CERVICO-VAGINAL',
        'general': (
            "Flore (D\u00f6derlein) : Lactobacillus dominants\n"
            "pH vaginal : 3.8\u20134.5\n"
            "Candida, Trichomonas, Gardnerella : Absents\n"
            "Score de Nugent : 0\u20133"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'FROTTIS DE GORGE',
        'general': (
            "Strepto A (S. pyogenes) : N\u00e9gatif\n"
            "C. diphtheriae, Candida : Absents"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'PUS',
        'general': (
            "Gram direct : Absence de germes\n"
            "Culture : St\u00e9rile\n"
            "Antibiogramme si positif"
        ),
        'male': '', 'female': '',
    },

    # ===== HORMONES THYROIDIENNES =====
    {
        'match': 'TSH',
        'general': (
            "TSH : 0.40\u20134.00 mUI/L\n"
            "< 0.40 : hyperthyro\u00efdie | > 4.00 : hypothyro\u00efdie\n"
            "Grossesse T1 : 0.1\u20132.5 | T2 : 0.2\u20133.0 | T3 : 0.3\u20133.5 mUI/L"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'T3 (TRIIODOTHYRONINE)',
        'general': (
            "T3 libre (fT3) : 2.3\u20134.2 pg/mL  (3.5\u20136.5 pmol/L)\n"
            "T3 totale : 0.8\u20132.0 ng/mL"
        ),
        'male': '', 'female': '',
    },
    {
        'match': 'T4 (THYROXINE)',
        'general': (
            "T4 libre (fT4) : 0.80\u20131.80 ng/dL  (10\u201323 pmol/L)\n"
            "T4 totale : 4.5\u201312.5 \u00b5g/dL"
        ),
        'male': '', 'female': '',
    },

    # ===== HORMONES SEXUELLES =====
    {
        'match': 'TESTOST',
        'male': (
            "Test. totale : 8.7\u201329.4 nmol/L  (250\u2013836 ng/dL)\n"
            "Test. libre : 0.17\u20130.64 nmol/L\n"
            "SHBG : 13\u201371 nmol/L"
        ),
        'female': (
            "Test. totale : 0.5\u20132.6 nmol/L  (14\u201376 ng/dL)\n"
            "> 2.6 nmol/L : hyperandrog\u00e9nisme"
        ),
        'general': '',
    },
    {
        'match': 'PROGEST\u00c9RONE',
        'male': "Progest\u00e9rone : 0.2\u20131.4 nmol/L",
        'female': (
            "Folliculaire : < 3.2 nmol/L\n"
            "Lut\u00e9ale : 15\u201390 nmol/L  (< 16 : insuffisance)\n"
            "T1 grossesse : 35\u2013145 nmol/L"
        ),
        'general': '',
    },
    {
        'match': 'ESTRADIOL',
        'male': "E2 : 40\u2013160 pmol/L  (10\u201345 pg/mL)",
        'female': (
            "Folliculaire pr\u00e9coce : 75\u2013260 pmol/L\n"
            "Pic ovulatoire : 400\u20131200 pmol/L\n"
            "Lut\u00e9ale : 110\u2013650 pmol/L\n"
            "M\u00e9nopause : 40\u2013140 pmol/L"
        ),
        'general': '',
    },
    {
        'match': 'FSH',
        'male': (
            "FSH : 1.5\u201312.4 UI/L\n"
            "> 12 : insuffisance testiculaire"
        ),
        'female': (
            "Folliculaire : 3.5\u201312.5 UI/L\n"
            "Pic ovulatoire : 4.7\u201321.5 UI/L\n"
            "Lut\u00e9ale : 1.7\u20137.7 UI/L\n"
            "M\u00e9nopause : 25\u2013135 UI/L  (> 40 = confirm\u00e9)"
        ),
        'general': '',
    },
    {
        'match': 'LH (Hormone Lut\u00e9',
        'male': "LH : 1.7\u20138.6 UI/L",
        'female': (
            "Folliculaire : 2.4\u201312.6 UI/L\n"
            "Pic ovulatoire : 14\u201396 UI/L  (ovulation dans 24\u201348h)\n"
            "Lut\u00e9ale : 1.0\u201311.4 UI/L\n"
            "M\u00e9nopause : 7.7\u201359 UI/L\n"
            "LH/FSH > 2 en folliculaire : SOPK suspect"
        ),
        'general': '',
    },

    # ===== ONCOLOGIE / GROSSESSE =====
    {
        'match': 'HCG GROSSESSE (AUTOMATE',
        'general': "< 5.0 UI/L : Non enceinte / Homme",
        'male': '',
        'female': (
            "Non enceinte : < 5.0 UI/L\n"
            "S3\u20134 : 10\u2013750 | S5\u20136 : 200\u20137000\n"
            "S7\u20138 : 3000\u201380000 | S9\u201313 : 20000\u2013200000 UI/L\n"
            "T2 : 2000\u201345000 | T3 : 3000\u201350000 UI/L"
        ),
    },
    {
        'match': 'HCG GROSSESSE (TEST RAPIDE',
        'general': "Positif / N\u00e9gatif  (seuil : 25 UI/L)",
        'male': '', 'female': '',
    },
    {
        'match': 'PSA TOTAL',
        'male': (
            "< 40 ans : < 2.0 ng/mL\n"
            "40\u201349 ans : < 2.5 | 50\u201359 ans : < 3.5\n"
            "60\u201369 ans : < 4.5 | > 70 ans : < 6.5 ng/mL\n"
            "Zone grise : 4\u201310 | \u00c9lev\u00e9 : > 10 ng/mL"
        ),
        'female': '',
        'general': '',
    },
    {
        'match': 'PSA LIBRE',
        'male': (
            "Ratio PSA libre/total :\n"
            "> 25 % : b\u00e9nin | 15\u201325 % : zone | < 15 % : risque \u00e9lev\u00e9"
        ),
        'female': '',
        'general': '',
    },
    {
        'match': 'IGE TOTAL',
        'general': (
            "Adulte : < 100 kUI/L\n"
            "100\u2013200 : limite | > 200 : allergie probable\n"
            "Nourrisson : < 15 | 2\u20135 ans : < 60 | 6\u20139 ans : < 90 kUI/L"
        ),
        'male': '', 'female': '',
    },
]


class Command(BaseCommand):
    help = 'Met a jour les valeurs de reference des examens de labo'

    def handle(self, *args, **options):
        updated = 0
        skipped = 0

        for entry in REFERENCE_DATA:
            match_str = entry['match']
            qs = LabTest.objects.filter(name__icontains=match_str)

            if not qs.exists():
                safe_match = match_str.encode('ascii', 'replace').decode('ascii')
                self.stdout.write(self.style.WARNING(f'  [NON TROUVE] {safe_match}'))
                skipped += 1
                continue

            for test in qs:
                changed = False
                if entry.get('general') is not None and entry['general'] != test.normal_range_general:
                    test.normal_range_general = entry['general']
                    changed = True
                if entry.get('male') is not None and entry['male'] != test.normal_range_male:
                    test.normal_range_male = entry['male']
                    changed = True
                if entry.get('female') is not None and entry['female'] != test.normal_range_female:
                    test.normal_range_female = entry['female']
                    changed = True
                if entry.get('template') is not None and entry['template'] != test.result_template:
                    test.result_template = entry['template']
                    changed = True
                if changed:
                    test.save(update_fields=['normal_range_general', 'normal_range_male', 'normal_range_female', 'result_template'])
                    safe_name = test.name.encode('ascii', 'replace').decode('ascii')
                    self.stdout.write(self.style.SUCCESS(f'  [OK] {safe_name}'))
                    updated += 1
                else:
                    skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nTermine : {updated} examens mis a jour, {skipped} ignores.'
        ))
