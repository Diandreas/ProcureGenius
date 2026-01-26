# ⏱️ Système de Timer pour Consultations - Documentation

## Vue d'ensemble

Le système de timer permet de tracker automatiquement la durée des consultations et le temps d'attente des patients pour générer des statistiques précises.

---

## 🎯 Fonctionnalités

### 1. **Chronomètre Visuel**
- Timer en temps réel qui démarre lors de la consultation
- Affichage en format MM:SS ou HH:MM:SS
- Design adaptatif selon l'état (en attente, en cours, terminée)

### 2. **Capture Automatique des Temps**
- `started_at`: Heure de début de consultation (clic sur "Démarrer")
- `ended_at`: Heure de fin de consultation (clic sur "Terminer")
- Sauvegarde automatique dans la base de données

### 3. **Calculs Statistiques**
- **Durée consultation**: `ended_at - started_at`
- **Temps d'attente**: `started_at - heure_de_facturation`

---

## 📁 Fichiers Modifiés/Créés

### Frontend

#### 1. **Nouveau Composant: ConsultationTimer.jsx**
Localisation: [frontend/src/components/healthcare/ConsultationTimer.jsx](frontend/src/components/healthcare/ConsultationTimer.jsx)

**Fonctionnalités:**
- Timer en temps réel avec mise à jour chaque seconde
- 3 états visuels: Non démarré, En cours, Terminé
- Boutons "Démarrer" et "Terminer" avec couleurs adaptées
- Affichage de l'heure de début et de fin
- Messages d'aide contextuels

**Props:**
```javascript
<ConsultationTimer
  onStart={(timestamp) => {}}      // Callback quand timer démarre
  onEnd={(timestamp) => {}}         // Callback quand timer se termine
  initialStartTime={null}           // ISO string ou null
  initialEndTime={null}             // ISO string ou null
/>
```

#### 2. **ConsultationForm.jsx Modifié**
Localisation: [frontend/src/pages/healthcare/consultations/ConsultationForm.jsx](frontend/src/pages/healthcare/consultations/ConsultationForm.jsx)

**Changements:**
- Import du composant `ConsultationTimer`
- Ajout de `started_at` et `ended_at` dans `formData`
- Callbacks `handleTimerStart` et `handleTimerEnd`
- Intégration du timer dans la colonne gauche
- Envoi des timestamps au backend lors de la sauvegarde

### Backend

#### 1. **Modèle Consultation**
Localisation: [apps/consultations/models.py](apps/consultations/models.py:67-85)

**Nouveaux champs:**
```python
started_at = models.DateTimeField(
    null=True, blank=True,
    verbose_name=_("Heure de début")
)
ended_at = models.DateTimeField(
    null=True, blank=True,
    verbose_name=_("Heure de fin")
)
```

**Propriétés calculées:**
```python
@property
def duration_minutes(self):
    """Durée de la consultation en minutes"""
    if self.started_at and self.ended_at:
        delta = self.ended_at - self.started_at
        return int(delta.total_seconds() / 60)
    return None

@property
def wait_time_minutes(self):
    """Temps d'attente avant consultation"""
    if self.started_at and self.consultation_invoice:
        # Utilise paid_at si disponible, sinon created_at
        if hasattr(self.consultation_invoice, 'paid_at') and self.consultation_invoice.paid_at:
            delta = self.started_at - self.consultation_invoice.paid_at
        else:
            delta = self.started_at - self.consultation_invoice.created_at
        return int(delta.total_seconds() / 60)
    return None
```

#### 2. **Serializers**
Localisation: [apps/consultations/serializers.py](apps/consultations/serializers.py:110-135)

**Champs ajoutés dans ConsultationSerializer:**
```python
'started_at',
'ended_at',
'duration_minutes',    # Propriété calculée
'wait_time_minutes',   # Propriété calculée
```

#### 3. **Migration**
Localisation: [apps/consultations/migrations/0006_consultation_timing.py](apps/consultations/migrations/0006_consultation_timing.py)

**Commande pour appliquer:**
```bash
python manage.py migrate consultations
```

---

## 🚀 Utilisation

### Workflow Standard

1. **Création de la consultation**
   - Le formulaire s'ouvre
   - Le timer est visible mais non démarré (état gris)

2. **Patient arrive et est facturé**
   - Une facture est créée avec `created_at` ou `paid_at`
   - Ceci servira de référence pour le temps d'attente

3. **Début de consultation**
   - Le médecin clique sur **"Démarrer Consultation"**
   - `started_at` est enregistré automatiquement
   - Le timer commence (affichage rouge)
   - Les champs de consultation deviennent actifs

4. **Pendant la consultation**
   - Le timer compte en temps réel
   - Le médecin remplit le dossier médical
   - Peut sauvegarder en brouillon sans terminer

5. **Fin de consultation**
   - Le médecin clique sur **"Terminer Consultation"**
   - `ended_at` est enregistré
   - Le timer s'arrête (affichage vert)
   - La durée finale est affichée

6. **Sauvegarde**
   - Les timestamps sont envoyés au backend
   - Les calculs de statistiques utilisent ces données

---

## 📊 Intégration avec les Statistiques

Les temps capturés alimentent les indicateurs suivants:

### N°4 - Temps d'attente moyen
```python
# Dans ActivityIndicatorsView
consultations_with_wait = Consultation.objects.filter(
    started_at__isnull=False,
    consultation_invoice__isnull=False
)

wait_times = [c.wait_time_minutes for c in consultations_with_wait]
avg_wait_time = sum(wait_times) / len(wait_times)
```

### N°5 - Durée moyenne de consultation
```python
consultations_with_duration = Consultation.objects.filter(
    started_at__isnull=False,
    ended_at__isnull=False
)

durations = [c.duration_minutes for c in consultations_with_duration]
avg_duration = sum(durations) / len(durations)
```

---

## 🎨 Interface Utilisateur

### États Visuels

#### 1. **Non démarré** (Gris)
- Timer affiche 00:00
- Bouton "Démarrer Consultation" (bleu)
- Message: "Cliquez pour démarrer"

#### 2. **En cours** (Rouge)
- Timer compte en temps réel
- Affiche l'heure de début
- Bouton "Terminer Consultation" (rouge)
- Message: "Le chronomètre est en cours"

#### 3. **Terminé** (Vert)
- Timer affiche la durée finale
- Affiche heure de début et de fin
- Aucun bouton
- Message: "Consultation terminée - Durée enregistrée"

### Exemple d'Affichage

```
┌─────────────────────────────────────┐
│ ⏱️  Chronomètre de Consultation     │
│                                     │
│         00:15:42                    │
│       15 minutes                    │
│                                     │
│   Début: 14:30:00   Fin: 14:45:42  │
│                                     │
│  ✓ Consultation terminée           │
└─────────────────────────────────────┘
```

---

## 🔧 Configuration

### Pas de configuration nécessaire!

Le système fonctionne automatiquement une fois:
1. ✅ La migration appliquée
2. ✅ Le composant intégré au formulaire
3. ✅ Le backend mis à jour

---

## 📈 Données Générées

### Exemple de données sauvegardées

```json
{
  "id": "uuid",
  "patient": "patient-uuid",
  "consultation_date": "2026-01-25T14:30:00Z",
  "started_at": "2026-01-25T14:30:15Z",
  "ended_at": "2026-01-25T14:45:42Z",
  "duration_minutes": 15,
  "wait_time_minutes": 5,
  "chief_complaint": "Mal de tête",
  "diagnosis": "Migraine"
}
```

### Calculs automatiques

- **Durée**: 15 minutes (de 14:30:15 à 14:45:42)
- **Temps d'attente**: 5 minutes (facture créée à 14:25:00, consultation démarrée à 14:30:15)

---

## ⚠️ Points Importants

### Consultations Existantes

Les consultations créées **avant** l'implémentation du timer auront:
- `started_at = null`
- `ended_at = null`
- `duration_minutes = null`
- `wait_time_minutes = null`

Elles ne seront **pas** incluses dans les statistiques de temps.

### Validation

Le système ne force PAS l'utilisateur à démarrer le timer. C'est **optionnel**.

Si le timer n'est pas utilisé:
- La consultation est quand même valide
- Les statistiques de temps seront à 0 pour cette période
- Les autres indicateurs (nombre de consultations, revenue) fonctionnent normalement

### Persistance

Les timestamps sont sauvegardés:
- À chaque clic sur "Enregistrer (Brouillon)"
- Lors du clic sur "Terminer & Prescrire"
- Automatiquement lors de tout update du formulaire

---

## 🐛 Dépannage

### Le timer ne démarre pas

**Vérifier:**
1. Le composant `ConsultationTimer` est bien importé
2. Les callbacks `onStart` et `onEnd` sont définis
3. La console navigateur pour erreurs JavaScript

### Les temps ne sont pas sauvegardés

**Vérifier:**
1. La migration a été appliquée: `python manage.py migrate consultations`
2. Les champs `started_at` et `ended_at` sont dans le payload de l'API
3. Le serializer inclut ces champs

### Les statistiques affichent 0

**Raisons possibles:**
1. Aucune consultation n'a utilisé le timer
2. Les consultations sont trop anciennes (avant implémentation)
3. Le filtre de dates exclut les consultations avec timer

---

## 💡 Améliorations Futures Possibles

1. **Pause/Reprise**: Permettre de mettre en pause le timer
2. **Alertes**: Notifier si consultation dépasse X minutes
3. **Historique**: Voir l'historique des temps pour un patient
4. **Auto-stop**: Terminer automatiquement après X minutes d'inactivité
5. **Export**: Exporter les données de timing en CSV

---

Dernière mise à jour: 2026-01-25
