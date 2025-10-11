# 🎙️ Configuration des Messages Vocaux - ProcureGenius

## 📋 Vue d'ensemble

Votre application ProcureGenius dispose maintenant d'une fonctionnalité de **messages vocaux** pour l'assistant IA ! Les utilisateurs peuvent enregistrer leur voix depuis l'application mobile et l'IA transcrit et répond automatiquement.

### ✨ Fonctionnalités
- 🎤 Enregistrement vocal depuis mobile
- 🗣️ Transcription automatique avec **Google Speech-to-Text**
- 💬 Envoi direct à l'assistant IA
- 🌍 Support multilingue (français par défaut)
- ✅ Ponctuation automatique
- 📊 Score de confiance de la transcription

---

## 🔧 Configuration Google Cloud Speech-to-Text

### Étape 1: Créer un Projet Google Cloud

1. Allez sur https://console.cloud.google.com/
2. Cliquez sur **"Create Project"** ou sélectionnez un projet existant
3. Donnez un nom à votre projet (ex: "ProcureGenius")

### Étape 2: Activer l'API Speech-to-Text

1. Dans la console Google Cloud, allez dans **"APIs & Services"** > **"Library"**
2. Recherchez **"Cloud Speech-to-Text API"**
3. Cliquez sur **"Enable"** pour activer l'API

### Étape 3: Créer un Compte de Service

1. Allez dans **"APIs & Services"** > **"Credentials"**
2. Cliquez sur **"Create Credentials"** > **"Service Account"**
3. Remplissez les informations :
   - **Name**: `procuregenius-speech`
   - **Description**: Service account for speech-to-text transcription
4. Cliquez sur **"Create and Continue"**
5. Accordez le rôle : **"Cloud Speech Client"** ou **"Cloud Speech Administrator"**
6. Cliquez sur **"Done"**

### Étape 4: Générer une Clé JSON

1. Dans la liste des comptes de service, trouvez celui que vous venez de créer
2. Cliquez sur l'icône **⋮** (trois points) > **"Manage keys"**
3. Cliquez sur **"Add Key"** > **"Create new key"**
4. Choisissez le format **JSON**
5. Cliquez sur **"Create"**
6. Le fichier JSON sera téléchargé automatiquement
7. **Renommez-le** en `google-credentials.json`

### Étape 5: Placer le Fichier de Credentials

Placez le fichier `google-credentials.json` dans votre projet :

```
ProcureGenius/
├── google-credentials.json  ← ICI
├── manage.py
├── apps/
└── ...
```

⚠️ **Important**: Ajoutez ce fichier à `.gitignore` pour ne pas le commiter !

```bash
echo "google-credentials.json" >> .gitignore
```

### Étape 6: Configurer Django Settings

Ajoutez dans votre `settings.py` ou `.env` :

```python
# Dans settings.py
import os

# Chemin vers le fichier de credentials Google Cloud
GOOGLE_APPLICATION_CREDENTIALS = os.path.join(BASE_DIR, 'google-credentials.json')

# Configurer la variable d'environnement pour Google Cloud
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = GOOGLE_APPLICATION_CREDENTIALS
```

**OU** dans votre fichier `.env` :

```env
GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/google-credentials.json
```

### Étape 7: Installer les Dépendances Python

```bash
pip install google-cloud-speech
```

Ou ajoutez dans `requirements.txt` :

```
google-cloud-speech==2.21.0
```

---

## 🧪 Test de Configuration

### Tester la Transcription

Créez un script de test `test_transcription.py` :

```python
from google.cloud import speech
import os

# Vérifier que les credentials sont chargés
print(f"Credentials: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")

# Tester la connexion
try:
    client = speech.SpeechClient()
    print("✅ Google Speech-to-Text connecté avec succès!")
except Exception as e:
    print(f"❌ Erreur: {e}")
```

Exécutez-le :

```bash
python test_transcription.py
```

---

## 💰 Tarification Google Speech-to-Text

### Prix (Janvier 2024)

| Type | Prix | Détails |
|------|------|---------|
| **0-60 minutes/mois** | **GRATUIT** | Idéal pour commencer |
| **60+ minutes** | $0.006/15 secondes | ~$0.024/minute |
| **Modèle amélioré** | $0.009/15 secondes | Meilleure qualité |

### Exemple de Coûts

- **1000 messages vocaux** de 30 secondes = 500 minutes
- **Coût** : ~$12/mois (après les 60 min gratuites)
- **Très abordable** pour un usage professionnel !

---

## 📱 Utilisation dans l'Application

### Sur Mobile

1. **Ouvrez l'application** sur votre téléphone (ou mode mobile du navigateur)
2. **Appuyez sur le bouton IA** au centre de la barre de navigation inférieure
3. **Appuyez sur le microphone** 🎤 (bouton flottant)
4. **Parlez votre message**
5. **Appuyez sur Stop** ⏹️
6. **Envoyez** ✉️ le message transcrit à l'IA

### Workflow Technique

```
[Utilisateur]
    ↓ Appuie sur 🎤
[Enregistrement Audio (WebM)]
    ↓ Stop
[Envoi au Backend]
    ↓
[Google Speech-to-Text API]
    ↓ Transcription
[Texte transcrit]
    ↓
[IA Mistral]
    ↓ Réponse
[Affichage dans le Chat]
```

---

## 🔧 Configuration Avancée

### Changer la Langue

Dans `views.py:590`, modifiez :

```python
language_code="en-US",  # Pour anglais
language_code="es-ES",  # Pour espagnol
language_code="de-DE",  # Pour allemand
```

### Utiliser le Modèle Amélioré

Dans `views.py:593`, modifiez :

```python
model="latest_long",  # Pour audio long (>5min)
model="phone_call",   # Pour appels téléphoniques
model="video",        # Pour vidéos
```

### Augmenter la Qualité

```python
config = speech.RecognitionConfig(
    encoding=encoding,
    sample_rate_hertz=48000,
    language_code="fr-FR",
    enable_automatic_punctuation=True,
    enable_word_time_offsets=True,  # Timestamps des mots
    enable_word_confidence=True,    # Confiance par mot
    model="latest_long",            # Modèle amélioré
    use_enhanced=True,              # Meilleure qualité
    profanity_filter=False,         # Filtre de grossièretés
)
```

---

## 🐛 Dépannage

### Erreur: "Credentials not configured"

✅ **Solution**: Vérifiez que `GOOGLE_APPLICATION_CREDENTIALS` est bien défini dans `settings.py`

```python
# Dans settings.py
print(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'))
```

### Erreur: "Permission denied"

✅ **Solution**: Vérifiez les permissions du compte de service dans Google Cloud Console

### Erreur: "API not enabled"

✅ **Solution**: Activez l'API Speech-to-Text dans Google Cloud Console

### Erreur: "Invalid audio encoding"

✅ **Solution**: Vérifiez que le format audio est supporté (WebM, WAV, MP3, OGG)

### Erreur: "Sample rate mismatch"

✅ **Solution**: Ajustez le `sample_rate_hertz` selon votre audio (généralement 16000, 44100, ou 48000)

---

## 📊 Monitoring & Logs

### Voir les Logs Django

```bash
tail -f logs/django.log | grep "transcription"
```

### Voir les Logs Google Cloud

1. Allez dans **Google Cloud Console**
2. **Logging** > **Logs Explorer**
3. Filtrez par : `resource.type="cloud_speech"`

---

## 🔒 Sécurité

### Bonnes Pratiques

1. ✅ **Ne JAMAIS** commiter `google-credentials.json`
2. ✅ Utiliser des variables d'environnement en production
3. ✅ Limiter les permissions du compte de service
4. ✅ Activer le chiffrement des audio en transit (HTTPS)
5. ✅ Implémenter des quotas utilisateur pour éviter les abus

### Exemple de Configuration Production

```python
# settings_prod.py
import os

# Utiliser des variables d'environnement
GOOGLE_APPLICATION_CREDENTIALS = os.getenv('GOOGLE_CREDS_PATH')

# Ou utiliser le contenu JSON directement
import json
GOOGLE_CREDENTIALS_JSON = json.loads(os.getenv('GOOGLE_CREDS_JSON'))
```

---

## 📁 Architecture des Fichiers

```
ProcureGenius/
├── google-credentials.json              ← Credentials Google Cloud
├── apps/
│   └── ai_assistant/
│       ├── views.py                     ← Endpoint de transcription
│       ├── api_urls.py                  ← Route /transcribe/
│       └── ...
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── VoiceRecorder.jsx        ← Composant d'enregistrement
│       │   └── MobileBottomNav.jsx      ← Barre de navigation mobile
│       └── pages/
│           └── ai-chat/
│               └── AIChat.jsx           ← Page de chat avec support vocal
├── settings.py                          ← Configuration Django
└── requirements.txt                     ← Dépendances Python
```

---

## 🚀 Déploiement en Production

### Sur Heroku

```bash
# Ajouter la variable d'environnement
heroku config:set GOOGLE_APPLICATION_CREDENTIALS=/app/google-credentials.json

# Uploader le fichier de credentials (via Heroku CLI ou dashboard)
```

### Sur AWS/Azure/GCP

Utilisez les services de secrets management :
- AWS: **Secrets Manager**
- Azure: **Key Vault**
- GCP: **Secret Manager**

---

## ✅ Checklist de Déploiement

- [ ] API Speech-to-Text activée dans Google Cloud
- [ ] Compte de service créé avec les bonnes permissions
- [ ] Fichier `google-credentials.json` téléchargé
- [ ] Variable `GOOGLE_APPLICATION_CREDENTIALS` configurée
- [ ] Dépendance `google-cloud-speech` installée
- [ ] Test de transcription réussi
- [ ] Bouton microphone visible sur mobile
- [ ] Enregistrement et transcription fonctionnels
- [ ] Messages vocaux intégrés au chat IA

---

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs Django
2. Consultez la [documentation Google Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
3. Vérifiez votre quota Google Cloud

---

**Status**: ✅ Fonctionnel avec Google Speech-to-Text
**Dernière mise à jour**: 2025-01-11
**Version**: 1.0.0
