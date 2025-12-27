# Module de Documentation ProcureGenius

Ce module fournit un centre d'aide et de documentation complet pour l'application ProcureGenius.

## Structure

### Composants

#### `SearchBar.jsx`
Barre de recherche intelligente avec auto-complétion.

**Fonctionnalités:**
- Recherche en temps réel dans la documentation
- Suggestions groupées par catégorie
- Navigation au clavier (flèches, Entrée, Échap)
- Recherches populaires
- Mise en évidence des résultats

**Props:**
- `autoFocus` (boolean): Focus automatique au montage
- `onResultClick` (function): Callback lors du clic sur un résultat

#### `ArticleView.jsx`
Affichage d'un article de documentation avec navigation.

**Fonctionnalités:**
- Rendu Markdown du contenu
- Breadcrumb de navigation
- Navigation précédent/suivant dans la catégorie
- Articles liés
- Feedback utilisateur (utile/pas utile)
- Bookmarks
- Partage et impression

**Props:**
- `articleId` (string): ID de l'article à afficher

### Pages

#### `Help.jsx`
Page principale du centre d'aide.

**Sections:**
- Barre de recherche
- Actions rapides (Tutoriel, FAQ, Raccourcis, Support)
- Liste des catégories avec articles
- Lien vers le support

**Routes:**
- `/help` - Page principale
- `/help/:articleId` - Article spécifique
- `/help?category=xxx` - Filtré par catégorie

#### `FAQ.jsx`
Page des questions fréquentes.

**Fonctionnalités:**
- Accordéons Material-UI
- Recherche dans les questions
- Filtrage par catégorie
- Questions groupées par thème

**Route:**
- `/help/faq`

#### `KeyboardShortcuts.jsx`
Guide des raccourcis clavier.

**Fonctionnalités:**
- Raccourcis groupés par contexte
- Détection automatique Mac/Windows
- Design en cards
- Impression

**Route:**
- `/help/shortcuts`

### Données

#### `documentation.js`
Structure de données centralisée.

**Contenu:**
- `documentationCategories` : Liste des catégories
- `documentationArticles` : Tous les articles
- `searchDocumentation(query)` : Fonction de recherche
- `getRelatedArticles(articleId)` : Articles liés
- `getArticlesByCategory(categoryId)` : Articles par catégorie

**Structure d'un article:**
```javascript
{
  id: 'article-id',
  category: 'category-id',
  title: 'Titre de l\'article',
  content: 'Contenu Markdown...',
  keywords: ['mot-clé1', 'mot-clé2'],
  relatedTopics: ['article-id-1', 'article-id-2']
}
```

**Structure d'une catégorie:**
```javascript
{
  id: 'category-id',
  title: 'Titre',
  description: 'Description',
  icon: 'IconName', // Nom de l'icône MUI
  color: '#hexcolor'
}
```

## Traductions

Fichier: `frontend/src/locales/fr/help.json`

**Structure:**
- `title`, `subtitle` : Titres principaux
- `quickActions.*` : Labels des actions rapides
- `search.*` : Labels de recherche
- `article.*` : Labels d'article
- `faq.*` : Labels FAQ
- `shortcuts.*` : Labels raccourcis
- `categories.*` : Noms et descriptions des catégories

## Intégration

### Dans App.jsx

```javascript
import Help from './pages/Help';
import FAQ from './pages/FAQ';
import KeyboardShortcuts from './pages/KeyboardShortcuts';

// Routes
<Route path="/help" element={<Help />} />
<Route path="/help/:articleId" element={<Help />} />
<Route path="/help/faq" element={<FAQ />} />
<Route path="/help/shortcuts" element={<KeyboardShortcuts />} />
```

### Dans TutorialButton.jsx

Le bouton d'aide intègre maintenant des liens vers:
- Documentation complète
- FAQ
- Raccourcis clavier
- Support

## Utilisation

### Ajouter un nouvel article

1. Ouvrir `frontend/src/data/documentation.js`
2. Ajouter l'article dans `documentationArticles`:

```javascript
{
  id: 'unique-id',
  category: 'category-id',
  title: 'Titre de l\'article',
  content: `
# Titre

Contenu en Markdown...

## Section

- Point 1
- Point 2
  `,
  keywords: ['mot-clé1', 'mot-clé2'],
  relatedTopics: ['autre-article-id']
}
```

### Ajouter une nouvelle catégorie

1. Ouvrir `frontend/src/data/documentation.js`
2. Ajouter dans `documentationCategories`:

```javascript
{
  id: 'ma-categorie',
  title: 'Ma Catégorie',
  description: 'Description',
  icon: 'IconName', // Importer l'icône dans Help.jsx
  color: '#2563eb'
}
```

3. Ajouter l'icône dans `Help.jsx` dans `iconMap`:

```javascript
import { MonIcon } from '@mui/icons-material';

const iconMap = {
  // ...
  MonIcon: MonIcon,
};
```

### Ajouter une question FAQ

1. Ouvrir `frontend/src/pages/FAQ.jsx`
2. Ajouter dans le tableau `faqData`:

```javascript
{
  category: 'category-id',
  categoryTitle: 'Titre de la catégorie',
  questions: [
    {
      id: 'faq-xx',
      question: 'Ma question ?',
      answer: 'Ma réponse détaillée...'
    }
  ]
}
```

### Ajouter un raccourci clavier

1. Ouvrir `frontend/src/pages/KeyboardShortcuts.jsx`
2. Ajouter dans `shortcutsData`:

```javascript
{
  category: 'Nom de la catégorie',
  icon: IconComponent,
  color: theme.palette.primary.main,
  shortcuts: [
    {
      keys: ['Ctrl', 'X'],
      macKeys: ['Cmd', 'X'],
      description: 'Description du raccourci'
    }
  ]
}
```

## Fonctionnalités futures

### Suggestions d'amélioration

- [ ] Vidéos tutorielles intégrées
- [ ] Système de commentaires sur les articles
- [ ] Articles en plusieurs langues
- [ ] Export PDF des articles
- [ ] Historique des articles consultés
- [ ] Suggestions d'articles basées sur l'usage
- [ ] Analytics des articles les plus consultés
- [ ] Chatbot IA pour assistance
- [ ] Recherche avancée avec filtres
- [ ] Mode hors ligne (PWA)

## Dépendances

- `react-markdown` : Rendu du contenu Markdown
- `@mui/material` : Composants UI
- `react-router-dom` : Routing
- `react-i18next` : Internationalisation

## Support

Pour toute question ou suggestion concernant ce module, contactez support@procuregenius.com.
