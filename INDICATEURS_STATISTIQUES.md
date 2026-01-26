# 📊 Indicateurs de Suivi d'Activité - Documentation

## Résumé des Modifications

Ce document explique les changements apportés pour implémenter les 7 indicateurs de suivi d'activité dans le dashboard.

---

## 🔧 Modifications du Backend

### 1. Modèle Consultation ([apps/consultations/models.py](apps/consultations/models.py))

**Nouveaux champs ajoutés:**
```python
started_at = models.DateTimeField(null=True, blank=True)  # Heure de début de consultation
ended_at = models.DateTimeField(null=True, blank=True)    # Heure de fin de consultation
```

**Nouvelles propriétés calculées:**
```python
@property
def duration_minutes(self):
    """Durée de la consultation en minutes"""
    # Calcule: ended_at - started_at

@property
def wait_time_minutes(self):
    """Temps d'attente avant consultation en minutes"""
    # Calcule: started_at - consultation_invoice.created_at (ou paid_at si disponible)
```

**Migration nécessaire:**
```bash
python manage.py migrate consultations 0006_consultation_timing
```

---

### 2. API Analytics ([apps/analytics/healthcare_analytics.py](apps/analytics/healthcare_analytics.py))

**Nouvelle vue: `ActivityIndicatorsView`**

Endpoint: `/api/analytics/healthcare/activity-indicators/`

**Paramètres:**
- `period`: day | week | month (défaut: month)
- `start_date`: Date de début (format: YYYY-MM-DD)
- `end_date`: Date de fin (format: YYYY-MM-DD)

**Logique de calcul corrigée:**

#### N°1 - Nombre de consultations
```python
# Compte les Consultation par période
consultations = Consultation.objects.filter(
    organization=organization,
    consultation_date__date__gte=start_date,
    consultation_date__date__lte=end_date
).count()
```

#### N°2 - Nouveaux patients
```python
# Compte les patients ayant eu leur PREMIÈRE VISITE dans la période
# (et non plus la date de création du compte)
new_patients = PatientVisit.objects.filter(
    first_visit__date__gte=start_date,
    first_visit__date__lte=end_date
).distinct('patient').count()
```

#### N°3 - Actes médicaux et paramédicaux
```python
# Total = Consultations + Ordres de labo + Soins infirmiers
total = num_consultations + lab_orders_count + nursing_care_count

# Soins identifiés par catégorie de produit (regex: soin|pansement|vaccination|injection)
nursing_care = InvoiceItem.objects.filter(
    product__category__name__iregex=r'(soin|pansement|vaccination|injection|perfusion)'
).count()
```

#### N°4 - Temps d'attente moyen
```python
# Temps entre facturation et début de consultation
wait_time = started_at - consultation_invoice.created_at
# Utilise la nouvelle propriété wait_time_minutes du modèle
```

#### N°5 - Durée moyenne de consultation
```python
# Temps entre début et fin de consultation
duration = ended_at - started_at
# Utilise la nouvelle propriété duration_minutes du modèle
```

#### N°6 - Chiffre d'affaires
```python
# Somme des revenues: consultations + laboratoire
total_revenue = consultation_revenue + lab_revenue
```

#### N°7 - Coût moyen par acte
```python
# Calcule le coût moyen pour consultations, labos, et actes combinés
avg_cost = total_revenue / total_acts_count
```

---

## 🎨 Modifications du Frontend

### 1. Nouveau composant ([frontend/src/components/analytics/ActivityIndicatorsCard.jsx](frontend/src/components/analytics/ActivityIndicatorsCard.jsx))

**Fonctionnalités:**
- Affichage des 7 indicateurs organisés en 3 sections
- Sélecteur de période (Jour/Semaine/Mois)
- Design moderne avec couleurs par catégorie
- Animations au survol

**Structure:**
1. **Indicateurs d'Activité et de Volume** (vert/bleu/violet)
   - Consultations
   - Nouveaux patients
   - Actes médicaux

2. **Indicateurs de Performance** (orange/cyan)
   - Temps d'attente moyen
   - Durée moyenne consultation

3. **Indicateurs Financiers** (rouge/rose/violet)
   - Chiffre d'affaires
   - Coût moyen consultation
   - Coût moyen par acte

### 2. Service API ([frontend/src/services/healthcareAnalyticsAPI.js](frontend/src/services/healthcareAnalyticsAPI.js))

```javascript
getActivityIndicators: async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.period) queryParams.append('period', params.period);
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);

  const response = await api.get(`/analytics/healthcare/activity-indicators/?${queryParams.toString()}`);
  return response.data;
}
```

### 3. Dashboard ([frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx))

Le composant `ActivityIndicatorsCard` a été intégré entre les modules Santé et Inventaire.

---

## 📝 Utilisation dans l'application

### Comment enregistrer les temps de consultation

**Dans le formulaire de consultation:**

1. **Au début de la consultation:**
   ```python
   consultation.started_at = timezone.now()
   consultation.save()
   ```

2. **À la fin de la consultation:**
   ```python
   consultation.ended_at = timezone.now()
   consultation.save()
   ```

**Exemple de workflow:**
```
1. Patient payé → Facture créée (consultation_invoice.created_at)
2. Médecin commence → started_at enregistré
3. Médecin termine → ended_at enregistré

Calculs automatiques:
- Temps d'attente = started_at - invoice.created_at
- Durée consultation = ended_at - started_at
```

---

## ⚠️ Points importants

### Catégories de soins

Pour que le comptage des soins (N°3) fonctionne, assurez-vous que vos catégories de produits contiennent les mots-clés:
- "soin"
- "pansement"
- "vaccination"
- "injection"
- "perfusion"

**Exemples de catégories valides:**
- "Soins infirmiers"
- "Pansements"
- "Vaccinations"
- "Injections et perfusions"

### Données de timing

Les statistiques N°4 (temps d'attente) et N°5 (durée) ne fonctionneront que pour les consultations ayant les champs `started_at` et `ended_at` remplis.

**Consultations existantes:** Ces champs seront `null`, donc moyenne = 0 jusqu'à ce que de nouvelles consultations soient créées avec ces champs.

---

## 🚀 Prochaines étapes

1. **Exécuter la migration:**
   ```bash
   python manage.py migrate consultations
   ```

2. **Modifier le formulaire de consultation** pour capturer automatiquement `started_at` et `ended_at`:
   - Ajouter un bouton "Démarrer consultation" qui enregistre `started_at`
   - Enregistrer automatiquement `ended_at` lors de la sauvegarde finale

3. **Créer/Vérifier les catégories de produits** pour les soins infirmiers

---

## 📊 Structure de la réponse API

```json
{
  "period": "month",
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "activity_volume": {
    "consultations": {
      "total": 150,
      "timeline": [{"date": "2026-01-01", "count": 5}, ...]
    },
    "new_patients": {
      "total": 30,
      "timeline": [...]
    },
    "medical_acts": {
      "total": 250,
      "consultations": 150,
      "lab_orders": 80,
      "nursing_care": 20
    }
  },
  "performance": {
    "avg_wait_time_minutes": 15.5,
    "avg_consultation_duration_minutes": 25.3,
    "total_visits_tracked": 145
  },
  "financial": {
    "total_revenue": 1250000.00,
    "consultation_revenue": 750000.00,
    "lab_revenue": 500000.00,
    "avg_consultation_cost": 5000.00,
    "avg_lab_cost": 6250.00,
    "avg_cost_per_act": 5000.00,
    "revenue_timeline": [...]
  }
}
```

---

## 🐛 Dépannage

**Problème:** Les statistiques de temps (N°4, N°5) affichent 0

**Solution:** Vérifiez que les consultations ont `started_at` et `ended_at` remplis. Pour les nouvelles consultations, modifiez le formulaire pour capturer ces informations.

---

**Problème:** Les soins ne sont pas comptés

**Solution:** Vérifiez que vos catégories de produits contiennent les mots-clés appropriés (soin, pansement, vaccination, etc.)

---

Dernière mise à jour: 2026-01-25
