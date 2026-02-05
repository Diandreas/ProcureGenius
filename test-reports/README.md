# Tests Automatisés - Centre de Santé JULIANNA

Tests automatisés avec Puppeteer pour les 7 parcours patients du Centre de Santé JULIANNA.

## Prérequis

- Node.js installé
- Backend Django running sur port 8000
- Frontend React running sur port 3000
- Puppeteer et Chrome installés

## Installation

```bash
# 1. Installer Puppeteer
npm install puppeteer

# 2. Installer Chrome pour Puppeteer
npx puppeteer browsers install chrome
```

## Utilisation

### Lancer tous les tests

```bash
cd test-reports
node run-all-tests.js
```

Les tests vont:
1. Vérifier que les serveurs backend et frontend sont actifs
2. Lancer Chrome en mode visible
3. Exécuter les 7 cas de test séquentiellement
4. Générer des rapports Markdown avec screenshots
5. Créer un rapport de synthèse global

### Durée estimée

- 4-5 minutes pour exécuter les 7 tests
- ~35 secondes par test en moyenne

## Structure des fichiers

```
test-reports/
├── run-all-tests.js          # Script principal
├── helpers.js                # Fonctions utilitaires
├── test-cases/               # Scripts de test individuels
│   ├── cas1a-consultation.js
│   ├── cas1b-laboratoire.js
│   ├── cas1c-resultats.js
│   ├── cas1d-pharmacie.js
│   ├── cas2-patient-externe.js
│   ├── cas6-historique-medecin.js
│   └── cas7-historique-patient.js
├── screenshots/              # Screenshots par cas
│   ├── cas1a/
│   ├── cas1b/
│   └── ...
├── logs/                     # Logs console
├── har/                      # Network HAR exports
├── network/                  # API calls JSON
├── cas1a-accueil-consultation.md    # Rapport détaillé Cas 1a
├── cas1b-accueil-laboratoire.md     # Rapport détaillé Cas 1b
├── ... (autres rapports)
└── rapport-synthese.md              # Rapport de synthèse global
```

## Les 7 Parcours Testés

### Cas 1a: Accueil + Enregistrement + Caisse + Consultation
- Création patient Fabrice
- Enregistrement visite consultation
- Paiement consultation
- Consultation médicale

### Cas 1b: Accueil + Caisse + Laboratoire
- Fabrice revient pour examens
- Création ordre laboratoire
- Paiement examens

### Cas 1c: Accueil - Récupération Résultats
- Fabrice récupère résultats examens
- Saisie résultats par biologiste
- Génération PDF résultats

### Cas 1d: Accueil + Caisse + Médicaments
- Fabrice achète médicaments
- Vérification stock pharmacie
- Dispensation médicaments

### Cas 2: Patient Externe pour Examens
- Création patient Angel (externe)
- Ordre laboratoire sans consultation
- Génération résultats

### Cas 6: Consultation Historique par Médecin
- Médecin consulte historique Fabrice
- Navigation dans tous les onglets
- Vérification accès complet données

### Cas 7: Patient Demande Son Historique
- Fabrice demande copie historique
- Génération PDF historique complet
- Facturation service (1000 FC)

## Credentials

- **Admin**: `julianna_admin` / `julianna2025`
- **Réception**: `julianna_reception` / `julianna2025`
- **Médecin**: `julianna_doctor` / `julianna2025`
- **Labo**: `julianna_lab` / `julianna2025`
- **Pharmacie**: `julianna_pharmacist` / `julianna2025`

## Données de Test

**Patient Fabrice** (créé en Cas 1a):
- Nom: Fabrice Mukendi
- Téléphone: +243991234567
- Adresse: Makepe Saint-Tropez, Douala

**Patient Angel** (créé en Cas 2):
- Nom: Angel Nkomo
- Téléphone: +243997654321
- Adresse: Bonapriso, Douala

## Résultats des Tests

Après exécution, consultez:
- `rapport-synthese.md` pour le résumé global
- `cas[X].md` pour les rapports détaillés individuels
- `screenshots/cas[X]/` pour les captures d'écran
- `logs/cas[X]_console.log` pour les logs console
- `har/cas[X].har` pour le traffic réseau complet

## Dépannage

### Chrome ne se lance pas
```bash
npx puppeteer browsers install chrome
```

### Serveurs non accessibles
Vérifiez que:
- Backend Django tourne sur `http://localhost:8000`
- Frontend React tourne sur `http://localhost:3000`

### Tests échouent
1. Vérifiez les logs dans `logs/`
2. Consultez les screenshots dans `screenshots/`
3. Examinez le rapport d'erreur dans le fichier `.md` du cas
4. Vérifiez les appels API dans `network/`

## Automatisation avec Chrome DevTools

Les tests utilisent Chrome DevTools Protocol (CDP) pour:
- Capturer tous les appels réseau (Network)
- Enregistrer les logs console
- Mesurer les performances
- Prendre des screenshots full-page
- Exporter HAR files complets

## Correction Automatique d'Erreurs

Les scripts incluent:
- Retry automatique en cas d'échec (3 tentatives)
- Timeouts adaptatifs
- Screenshots d'erreur automatiques
- Logging détaillé pour debug
- Gestion gracieuse des éléments manquants

## Contact

Pour questions ou problèmes, consulter la documentation Puppeteer:
https://pptr.dev/
