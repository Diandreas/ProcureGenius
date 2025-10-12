# 🎤 Configuration Google Cloud Speech-to-Text

Guide complet pour configurer la transcription vocale avec Google Cloud Speech-to-Text dans ProcureGenius.

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Configuration Google Cloud](#configuration-google-cloud)
4. [Installation des dépendances](#installation-des-dépendances)
5. [Configuration de l'application](#configuration-de-lapplication)
6. [Test de la configuration](#test-de-la-configuration)
7. [Utilisation de l'API](#utilisation-de-lapi)
8. [Intégration Frontend](#intégration-frontend)
9. [Tarification](#tarification)
10. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

Google Cloud Speech-to-Text permet de transcrire automatiquement les messages vocaux en texte dans l'assistant IA. Cette fonctionnalité améliore l'expérience utilisateur en permettant l'interaction vocale avec l'application.

**Fonctionnalités :**
- ✅ Transcription en temps réel
- ✅ Support multilingue (français, anglais, etc.)
- ✅ Ponctuation automatique
- ✅ Haute précision avec modèle amélioré
- ✅ Formats audio multiples (WebM, WAV, MP3, OGG)

---

## 🔧 Prérequis

- Compte Google Cloud Platform (gratuit)
- Python 3.8 ou supérieur
- Django 5.0+
- Carte bancaire (pour activer Google Cloud, mais 60 minutes gratuites/mois)

---

## ☁️ Configuration Google Cloud

### Étape 1 : Créer un projet Google Cloud

1. Accédez à [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur **Select a project** → **New Project**
3. Nommez votre projet (ex: `procuregenius-speech`)
4. Cliquez sur **Create**

### Étape 2 : Activer l'API Speech-to-Text

1. Dans le menu de navigation (☰), allez dans **APIs & Services** → **Library**
2. Recherchez `Speech-to-Text API`
3. Cliquez sur **Cloud Speech-to-Text API**
4. Cliquez sur **Enable** (Activer)

### Étape 3 : Créer un compte de service

1. Menu Navigation → **IAM & Admin** → **Service Accounts**
2. Cliquez sur **+ CREATE SERVICE ACCOUNT**
3. Remplissez les informations :
   - **Service account name:** `procuregenius-speech-service`
   - **Service account ID:** (généré automatiquement)
   - **Description:** `Service account for speech-to-text transcription`
4. Cliquez sur **CREATE AND CONTINUE**

### Étape 4 : Attribuer les permissions

1. Dans **Grant this service account access to project**
2. Sélectionnez le rôle : **Cloud Speech-to-Text User** (ou `roles/speech.client`)
3. Cliquez sur **CONTINUE**
4. Cliquez sur **DONE**

### Étape 5 : Créer et télécharger la clé JSON

1. Dans la liste des comptes de service, trouvez celui que vous venez de créer
2. Cliquez sur les trois points (⋮) → **Manage keys**
3. Cliquez sur **ADD KEY** → **Create new key**
4. Sélectionnez **JSON**
5. Cliquez sur **CREATE**
6. Le fichier JSON sera téléchargé automatiquement sur votre ordinateur

---

## 📦 Installation des dépendances

### 1. Installer la bibliothèque Google Cloud Speech

```bash
pip install google-cloud-speech
```

Ou installer toutes les dépendances du projet :

```bash
pip install -r requirements.txt
```

### 2. Vérifier l'installation

```bash
python -c "from google.cloud import speech; print('✅ Google Cloud Speech installé')"
```

---

## ⚙️ Configuration de l'application

### Étape 1 : Placer le fichier de credentials

1. Renommez le fichier JSON téléchargé en `service-account.json`
2. Placez-le dans le dossier `google_credentials/` à la racine du projet

```
ProcureGenius/
├── google_credentials/
│   ├── service-account.json  ← Votre fichier de credentials
│   └── README.md
├── manage.py
└── ...
```

⚠️ **IMPORTANT :** Ne commitez JAMAIS ce fichier dans Git ! Il est automatiquement ignoré par `.gitignore`.

### Étape 2 : Configurer les variables d'environnement (optionnel)

Créez ou modifiez le fichier `.env` à la racine du projet :

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=votre-project-id
GOOGLE_APPLICATION_CREDENTIALS=google_credentials/service-account.json
```

Pour trouver votre **Project ID** :
1. Ouvrez [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Le Project ID s'affiche en haut de la page

### Étape 3 : Vérifier la configuration dans settings.py

Le fichier `saas_procurement/settings.py` contient déjà la configuration :

```python
# Google Cloud Speech-to-Text configuration
GOOGLE_CLOUD_PROJECT = os.getenv('GOOGLE_CLOUD_PROJECT', '')
GOOGLE_APPLICATION_CREDENTIALS = os.getenv(
    'GOOGLE_APPLICATION_CREDENTIALS',
    str(BASE_DIR / 'google_credentials' / 'service-account.json')
)

GOOGLE_SPEECH_CONFIG = {
    'language_code': 'fr-FR',
    'alternative_language_codes': ['en-US', 'en-CA'],
    'sample_rate_hertz': 48000,
    'enable_automatic_punctuation': True,
    'model': 'default',
    'use_enhanced': True,
}
```

---

## 🧪 Test de la configuration

### Exécuter le script de test

```bash
python test_google_speech.py
```

Ce script vérifie :
- ✅ Présence du fichier de credentials
- ✅ Configuration des variables d'environnement
- ✅ Connexion au client Google Speech
- ✅ Disponibilité de l'endpoint API

### Résultat attendu

```
🔍 VÉRIFICATION DE LA CONFIGURATION GOOGLE CLOUD SPEECH-TO-TEXT
====================================================================

✅ Fichier de credentials trouvé
✅ Variable d'environnement définie
✅ Client Speech-to-Text initialisé avec succès
✅ VoiceTranscriptionView importée avec succès

🎉 CONFIGURATION COMPLÈTE ET FONCTIONNELLE !
```

---

## 🌐 Utilisation de l'API

### Endpoint de transcription

```
POST /ai/voice-transcription/
```

### Paramètres

- **audio** (file, required) : Fichier audio à transcrire
- **Content-Type** : `multipart/form-data`
- **Authorization** : `Token <votre_token>`

### Formats audio supportés

- `audio/webm` (recommandé pour le web)
- `audio/wav`
- `audio/mp3` ou `audio/mpeg`
- `audio/ogg`

### Limites

- Taille maximale : **10 MB**
- Durée recommandée : < 1 minute pour une réponse rapide

### Exemple de requête avec curl

```bash
curl -X POST http://localhost:8000/ai/voice-transcription/ \
  -H "Authorization: Token YOUR_AUTH_TOKEN" \
  -F "audio=@message_vocal.mp3"
```

### Exemple de réponse

```json
{
  "success": true,
  "text": "Bonjour, je voudrais créer une nouvelle facture pour le client ABC Corporation d'un montant de 5000 euros.",
  "language": "fr-FR",
  "confidence": 0.95,
  "duration": 5.2
}
```

### Exemple d'erreur

```json
{
  "error": "No audio file provided"
}
```

---

## 💻 Intégration Frontend

### Exemple avec JavaScript (Fetch API)

```javascript
async function transcribeVoiceMessage(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice_message.webm');

  try {
    const response = await fetch('/ai/voice-transcription/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${authToken}`,
      },
      body: formData
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('Transcription:', data.text);
      return data.text;
    } else {
      console.error('Erreur:', data.error);
    }
  } catch (error) {
    console.error('Erreur réseau:', error);
  }
}
```

### Exemple avec React

```jsx
import React, { useState } from 'react';

function VoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      await transcribeAudio(blob);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.stop();
    setRecording(false);
  };

  const transcribeAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await fetch('/ai/voice-transcription/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${localStorage.getItem('token')}`,
      },
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      console.log('Texte transcrit:', data.text);
      // Envoyer le texte à l'assistant IA
    }
  };

  return (
    <div>
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? '🔴 Arrêter' : '🎤 Enregistrer'}
      </button>
    </div>
  );
}
```

---

## 💰 Tarification

### Gratuit

- **60 minutes par mois** de transcription standard
- Inclus dans l'offre gratuite de Google Cloud

### Après le forfait gratuit

| Modèle | Prix (par 15 secondes) |
|--------|------------------------|
| Standard | $0.006 |
| Enhanced | $0.009 |
| Medical | $0.024 |
| Video | $0.012 |

### Calcul des coûts

- **1 minute** = 4 × $0.006 = **$0.024**
- **1 heure** = 240 × $0.006 = **$1.44**
- **100 heures/mois** = 100 × $1.44 = **$144/mois**

📊 **Estimation pour ProcureGenius :**
- Moyenne de 30 secondes par message vocal
- 100 messages/jour = 50 minutes/jour
- **Coût mensuel estimé : ~$36** (après les 60 minutes gratuites)

Plus d'informations : [Tarification Google Speech-to-Text](https://cloud.google.com/speech-to-text/pricing)

---

## 🔧 Dépannage

### Erreur : "No module named 'google.cloud.speech'"

**Solution :**
```bash
pip install google-cloud-speech
```

### Erreur : "Could not automatically determine credentials"

**Causes possibles :**
1. Le fichier `service-account.json` n'existe pas
2. Le chemin dans `GOOGLE_APPLICATION_CREDENTIALS` est incorrect
3. Le fichier JSON est corrompu

**Solution :**
1. Vérifiez que le fichier existe : `ls google_credentials/service-account.json`
2. Vérifiez la variable d'environnement : `echo $GOOGLE_APPLICATION_CREDENTIALS`
3. Retéléchargez les credentials depuis Google Cloud Console

### Erreur : "API Speech-to-Text is not enabled"

**Solution :**
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Library
3. Recherchez "Speech-to-Text API"
4. Cliquez sur "Enable"

### Erreur : "Permission denied"

**Solution :**
Vérifiez que le compte de service a le rôle **Cloud Speech-to-Text User** :
1. IAM & Admin → IAM
2. Trouvez votre compte de service
3. Ajoutez le rôle `roles/speech.client`

### Erreur : "Audio file too large"

**Solution :**
- Limite actuelle : 10 MB
- Compressez l'audio ou réduisez la qualité
- Utilisez le format WebM avec codec Opus (meilleure compression)

### Erreur : "No speech detected"

**Causes possibles :**
1. L'audio est vide ou corrompu
2. Le niveau sonore est trop faible
3. Format audio non compatible

**Solution :**
1. Testez l'audio localement
2. Vérifiez le format et le codec
3. Augmentez le volume d'enregistrement

### Les transcriptions sont imprécises

**Solutions :**
1. Utilisez le modèle `enhanced` dans la configuration
2. Spécifiez la bonne langue dans `language_code`
3. Assurez-vous que l'audio est de bonne qualité (peu de bruit de fond)
4. Utilisez un microphone de meilleure qualité

---

## 📚 Ressources supplémentaires

### Documentation officielle

- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text)
- [Guide de démarrage rapide](https://cloud.google.com/speech-to-text/docs/quickstart-client-libraries)
- [API Reference](https://cloud.google.com/speech-to-text/docs/reference/rest)
- [Meilleures pratiques](https://cloud.google.com/speech-to-text/docs/best-practices)

### Langues supportées

Consultez la [liste complète des langues](https://cloud.google.com/speech-to-text/docs/languages) supportées.

### Exemples de code

- [Exemples Python](https://github.com/googleapis/python-speech)
- [Exemples officiels Google](https://cloud.google.com/speech-to-text/docs/samples)

---

## ✅ Checklist de configuration

- [ ] Projet Google Cloud créé
- [ ] API Speech-to-Text activée
- [ ] Compte de service créé avec les bonnes permissions
- [ ] Fichier JSON téléchargé et placé dans `google_credentials/`
- [ ] Dépendance `google-cloud-speech` installée
- [ ] Variables d'environnement configurées (optionnel)
- [ ] Script de test exécuté avec succès
- [ ] Endpoint API testé avec un fichier audio
- [ ] Intégration frontend complétée

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. Exécutez le script de diagnostic : `python test_google_speech.py`
2. Consultez les logs Django : `logs/django.log`
3. Vérifiez la [documentation Google Cloud](https://cloud.google.com/speech-to-text/docs)
4. Contactez l'équipe de développement

---

## 🎉 Félicitations !

Vous avez maintenant configuré la transcription vocale avec Google Cloud Speech-to-Text dans ProcureGenius. Les utilisateurs peuvent désormais interagir vocalement avec l'assistant IA ! 🚀

