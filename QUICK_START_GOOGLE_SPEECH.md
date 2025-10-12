# 🚀 Démarrage rapide - Google Cloud Speech-to-Text

Guide rapide en 5 minutes pour configurer la transcription vocale.

## 📝 Étapes rapides

### 1️⃣ Créer le projet Google Cloud (2 minutes)

1. Allez sur https://console.cloud.google.com/
2. Créez un nouveau projet
3. Activez l'API "Speech-to-Text"

### 2️⃣ Obtenir les credentials (2 minutes)

1. IAM & Admin → Service Accounts → Create Service Account
2. Nom : `procuregenius-speech`
3. Rôle : `Cloud Speech-to-Text User`
4. Create Key → JSON → télécharger

### 3️⃣ Installer le fichier (30 secondes)

1. Renommez le fichier en `service-account.json`
2. Placez-le dans `google_credentials/service-account.json`

### 4️⃣ Installer les dépendances (30 secondes)

```bash
pip install google-cloud-speech
```

### 5️⃣ Tester (30 secondes)

```bash
python test_google_speech.py
```

## ✅ C'est tout !

L'API est maintenant accessible sur :
```
POST /ai/voice-transcription/
```

## 📖 Documentation complète

Pour plus de détails, consultez [GOOGLE_CLOUD_SPEECH_SETUP.md](GOOGLE_CLOUD_SPEECH_SETUP.md)

