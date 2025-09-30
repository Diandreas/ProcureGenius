# ⚡ Quick Start - Module IA ProcureGenius

## 🚀 Démarrage Rapide (30 minutes)

Ce guide vous permet de démarrer rapidement avec le module IA.

---

## 📋 Prérequis

```bash
# Python 3.8+
python --version

# Node.js 16+
node --version

# Django installé
django-admin --version
```

---

## 🔧 Installation Rapide

### Étape 1 : Dépendances Python (2 min)

```bash
cd d:/project/BFMa/ProcureGenius

# Installer les dépendances IA
pip install mistralai
pip install pillow  # Pour OCR
# pip install pytesseract  # Optionnel pour OCR réel
```

### Étape 2 : Configuration (2 min)

**Ajouter dans `.env` :**
```env
MISTRAL_API_KEY=votre_clé_api_ici
MISTRAL_MODEL=mistral-large-latest
```

**Ou dans `settings.py` :**
```python
# Configuration Mistral AI
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY', 'votre_clé_api_ici')
MISTRAL_MODEL = 'mistral-large-latest'
```

### Étape 3 : Migrations (1 min)

```bash
# Créer les migrations pour les nouveaux champs
py manage.py makemigrations ai_assistant

# Appliquer les migrations
py manage.py migrate ai_assistant
```

### Étape 4 : Dépendances Frontend (2 min)

```bash
cd frontend

# Installer react-markdown
npm install react-markdown
```

---

## 📝 Implémentation Minimale (20 minutes)

### Backend Minimal

**1. Modifier `services.py` (10 min)**

Copier le code depuis `IMPLEMENTATION_GUIDE.md` :
- Ajouter `self.tools = self._define_tools()` dans `__init__`
- Ajouter la méthode `_define_tools()`
- Remplacer la méthode `chat()`

**2. Mettre à jour `views.py` (5 min)**

Copier le code depuis `BACKEND_ENDPOINTS.md` :
- Mettre à jour `ChatView`
- Ajouter `QuickActionsView`

**3. Mettre à jour `api_urls.py` (2 min)**

```python
path('chat/', ChatView.as_view(), name='ai-chat'),
path('quick-actions/', QuickActionsView.as_view(), name='quick-actions'),
```

### Frontend Minimal

**4. Créer composant de base (3 min)**

```bash
cd frontend/src/components
mkdir AI
cd AI
```

Copier depuis `FRONTEND_IMPLEMENTATION.md` :
- `FloatingAIAssistant.jsx` (version simplifiée)
- `ChatMessage.jsx`
- `ThinkingAnimation.jsx`

---

## 🧪 Tests Rapides

### Test Backend

```bash
# Terminal 1 : Démarrer Django
py manage.py runserver
```

```bash
# Terminal 2 : Tester l'API
curl -X POST http://localhost:8000/api/v1/ai/chat/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Bonjour"}'
```

**Résultat attendu :**
```json
{
  "response": "Bonjour ! Comment puis-je vous aider...",
  "tool_calls": null,
  "success": true
}
```

### Test Function Calling

```bash
curl -X POST http://localhost:8000/api/v1/ai/chat/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Crée un fournisseur Test Corp"}'
```

**Résultat attendu :**
```json
{
  "response": "J'ai créé le fournisseur Test Corp",
  "tool_calls": [{
    "function": "create_supplier",
    "arguments": {"name": "Test Corp"}
  }],
  "action_result": {
    "success": true,
    "message": "Fournisseur 'Test Corp' créé avec succès"
  }
}
```

### Test Frontend

```bash
# Terminal 3 : Démarrer React
cd frontend
npm start
```

1. Ouvrir http://localhost:3000
2. Cliquer sur le bouton flottant IA
3. Taper "Bonjour"
4. Vérifier la réponse

---

## 🔍 Vérifications

### ✅ Checklist Minimale

- [ ] Mistral API Key configurée
- [ ] `services.py` modifié avec tools
- [ ] `ChatView` mis à jour
- [ ] Migrations appliquées
- [ ] Frontend démarre sans erreur
- [ ] Bouton flottant visible
- [ ] Chat répond aux messages simples
- [ ] Function calling fonctionne (création fournisseur)

---

## 🐛 Troubleshooting Rapide

### Erreur : "MISTRAL_API_KEY not configured"
```bash
# Vérifier la clé API
echo $MISTRAL_API_KEY

# Ou dans Python
python -c "import os; print(os.getenv('MISTRAL_API_KEY'))"
```

### Erreur : "Module mistralai not found"
```bash
pip install mistralai --upgrade
```

### Erreur : "tool_calls field does not exist"
```bash
py manage.py makemigrations
py manage.py migrate
```

### Erreur Frontend : "Cannot find module 'react-markdown'"
```bash
cd frontend
npm install react-markdown
```

### Function calls non exécutés
**Vérifier dans `services.py` :**
```python
response = self.client.chat.complete(
    model=self.model,
    messages=messages,
    tools=self.tools,  # ← IMPORTANT
    tool_choice="auto"  # ← IMPORTANT
)
```

---

## 📊 Commandes Utiles

### Backend

```bash
# Logs Django
py manage.py runserver --verbosity 3

# Shell Django pour tester
py manage.py shell
>>> from apps.ai_assistant.services import MistralService
>>> mistral = MistralService()
>>> print(len(mistral.tools))  # Doit afficher 7

# Tester une action
>>> from apps.ai_assistant.services import ActionExecutor
>>> import asyncio
>>> executor = ActionExecutor()
>>> asyncio.run(executor.create_supplier({'name': 'Test'}, None))
```

### Frontend

```bash
# Démarrer avec debug
npm start

# Build production
npm run build

# Vérifier imports
npm list react-markdown
```

### Database

```bash
# Voir les conversations
py manage.py shell
>>> from apps.ai_assistant.models import Conversation
>>> Conversation.objects.all()

# Supprimer toutes les conversations (dev)
>>> Conversation.objects.all().delete()
```

---

## 🎯 Prochaines Étapes

Après le Quick Start, consulter les guides détaillés :

1. **IMPLEMENTATION_GUIDE.md** - Backend complet
2. **FRONTEND_IMPLEMENTATION.md** - UI complète
3. **OCR_IMPLEMENTATION.md** - Analyse de documents
4. **BACKEND_ENDPOINTS.md** - Tous les endpoints
5. **MASTER_README.md** - Vue d'ensemble

---

## 📞 Support

### Ressources
- 📖 Guides complets dans `apps/ai_assistant/`
- 🌐 Mistral AI Docs : https://docs.mistral.ai/
- 🐛 Issues : Consulter les logs Django et React DevTools

### Logs Importants

```bash
# Logs Django
tail -f logs/django.log

# Logs Mistral (dans le code)
import logging
logger = logging.getLogger(__name__)
logger.debug("Debug info")
```

---

## ✨ Félicitations !

Vous avez maintenant un module IA fonctionnel avec :
- ✅ Chat conversationnel
- ✅ Function calling
- ✅ Interface utilisateur
- ✅ Gestion de contexte

**Temps total : ~30 minutes**

**Pour aller plus loin :** Consultez `MASTER_README.md`
