import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Chip,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ExpandMore,
  Search as SearchIcon,
  ArrowBack,
  QuestionAnswer,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FAQ = () => {
  const { t } = useTranslation(['help', 'common']);
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expanded, setExpanded] = useState(false);

  // Données FAQ organisées par catégorie
  const faqData = [
    {
      category: 'general',
      categoryTitle: 'Général',
      questions: [
        {
          id: 'faq-1',
          question: 'Qu\'est-ce que le Centre de Santé Julianna (CSJ) ?',
          answer:
            'Le Centre de Santé Julianna (CSJ) est un système complet de gestion hospitalière intégré. Il vous permet de gérer les patients, consultations, laboratoire, pharmacie, factures et analyses dans une interface unique et intuitive.',
        },
        {
          id: 'faq-2',
          question: 'Comment créer un compte ?',
          answer:
            'Vous pouvez créer un compte en cliquant sur "S\'inscrire" sur la page d\'accueil. Remplissez le formulaire avec vos informations professionnelles. Vous recevrez un email de confirmation pour activer votre compte.',
        },
        {
          id: 'faq-3',
          question: 'Combien coûte le système CSJ ?',
          answer:
            'Le système CSJ propose plusieurs formules adaptées à vos besoins. Consultez notre page Tarifs pour voir les différentes options. Nous offrons également une période d\'essai gratuite pour tester la plateforme.',
        },
        {
          id: 'faq-4',
          question: 'Puis-je importer mes données existantes ?',
          answer:
            'Oui, le système CSJ propose plusieurs options d\'import : import Excel pour les données en masse, import de documents PDF via l\'IA, et une API pour des intégrations personnalisées. Notre équipe peut vous accompagner dans la migration de vos données.',
        },
      ],
    },
    {
      category: 'suppliers',
      categoryTitle: 'Fournisseurs',
      questions: [
        {
          id: 'faq-5',
          question: 'Comment ajouter un fournisseur ?',
          answer:
            'Allez dans le module Fournisseurs, cliquez sur "Nouveau fournisseur", remplissez les informations obligatoires (nom, email) et les informations complémentaires. Vous pouvez également créer un fournisseur rapidement lors de la création d\'un bon de commande.',
        },
        {
          id: 'faq-6',
          question: 'Peut-on gérer plusieurs contacts par fournisseur ?',
          answer:
            'Oui, vous pouvez ajouter autant de contacts que nécessaire pour chaque fournisseur. Dans la fiche fournisseur, section "Contacts", vous pouvez ajouter des personnes de contact avec leurs coordonnées et définir un contact principal.',
        },
        {
          id: 'faq-7',
          question: 'Comment désactiver un fournisseur ?',
          answer:
            'Ouvrez la fiche du fournisseur et cliquez sur "Désactiver". Le fournisseur reste dans votre base mais n\'apparaît plus dans les listes actives. Vous pouvez le réactiver à tout moment. La suppression définitive n\'est possible que si aucune transaction n\'existe.',
        },
      ],
    },
    {
      category: 'purchase-orders',
      categoryTitle: 'Bons de commande',
      questions: [
        {
          id: 'faq-8',
          question: 'Comment créer un bon de commande ?',
          answer:
            'Allez dans Bons de commande > Nouveau. Sélectionnez le fournisseur, ajoutez les produits depuis le catalogue ou créez-en de nouveaux, indiquez les quantités et validez. Le numéro de commande est généré automatiquement.',
        },
        {
          id: 'faq-9',
          question: 'Peut-on modifier un bon de commande après envoi ?',
          answer:
            'Un bon de commande envoyé ne peut pas être modifié directement. Vous devez l\'annuler et en créer un nouveau, ou créer un bon de commande complémentaire. Seuls les brouillons sont modifiables librement.',
        },
        {
          id: 'faq-10',
          question: 'Comment réceptionner une commande ?',
          answer:
            'Ouvrez le bon de commande et cliquez sur "Réceptionner". Vous pouvez faire une réception complète (toutes les quantités) ou partielle. Les stocks sont mis à jour automatiquement si la gestion de stock est activée pour les produits.',
        },
        {
          id: 'faq-11',
          question: 'Peut-on envoyer le bon de commande par email au fournisseur ?',
          answer:
            'Oui, lors de l\'enregistrement du bon de commande, vous pouvez choisir "Enregistrer et envoyer". Un email avec le PDF du bon de commande sera envoyé automatiquement au fournisseur.',
        },
      ],
    },
    {
      category: 'invoices',
      categoryTitle: 'Factures',
      questions: [
        {
          id: 'faq-12',
          question: 'Comment créer une facture ?',
          answer:
            'Vous pouvez créer une facture depuis un bon de commande reçu (méthode recommandée) ou manuellement depuis le module Factures. L\'assistant IA permet également d\'importer automatiquement des factures PDF.',
        },
        {
          id: 'faq-13',
          question: 'Comment importer des factures avec l\'IA ?',
          answer:
            'Allez dans l\'Assistant IA, glissez-déposez vos PDFs de factures. L\'IA extrait automatiquement toutes les informations (numéro, dates, fournisseur, lignes, montants). Vérifiez les données et validez pour créer les factures.',
        },
        {
          id: 'faq-14',
          question: 'Comment enregistrer un paiement ?',
          answer:
            'Ouvrez la facture, cliquez sur "Enregistrer un paiement", indiquez la date, le montant, le mode de paiement et la référence. Vous pouvez faire des paiements partiels. Le solde restant est calculé automatiquement.',
        },
        {
          id: 'faq-15',
          question: 'Peut-on gérer les relances de paiement ?',
          answer:
            'Oui, les factures en retard apparaissent en rouge dans la liste. Vous pouvez envoyer des emails de relance directement depuis la fiche facture. L\'historique des relances est conservé.',
        },
      ],
    },
    {
      category: 'products',
      categoryTitle: 'Produits',
      questions: [
        {
          id: 'faq-16',
          question: 'Comment ajouter un produit au catalogue ?',
          answer:
            'Module Produits > Nouveau produit. Remplissez les informations de base (nom, référence, prix), choisissez la catégorie, ajoutez une image et les fournisseurs. Vous pouvez activer la gestion de stock si c\'est un produit physique.',
        },
        {
          id: 'faq-17',
          question: 'Comment gérer les stocks ?',
          answer:
            'Activez la gestion de stock dans la fiche produit. Définissez un stock minimum pour recevoir des alertes. Les stocks se mettent à jour automatiquement lors des réceptions et ventes. Vous pouvez faire des ajustements manuels et des inventaires.',
        },
        {
          id: 'faq-18',
          question: 'Peut-on avoir plusieurs fournisseurs pour un même produit ?',
          answer:
            'Oui, dans la fiche produit, section "Fournisseurs", vous pouvez ajouter plusieurs fournisseurs avec un prix différent pour chacun. Cela vous permet de comparer et choisir le meilleur prix lors de la création d\'un bon de commande.',
        },
        {
          id: 'faq-19',
          question: 'Comment importer un catalogue de produits ?',
          answer:
            'Module Produits > Importer. Téléchargez le modèle Excel fourni, remplissez-le avec vos données (nom, référence, prix, catégorie, etc.) et importez le fichier. Le système vérifie les données avant import.',
        },
      ],
    },
    {
      category: 'settings',
      categoryTitle: 'Paramètres',
      questions: [
        {
          id: 'faq-20',
          question: 'Comment ajouter un utilisateur ?',
          answer:
            'Paramètres > Utilisateurs > Inviter un utilisateur. Entrez l\'email, le nom et choisissez le rôle (Administrateur, Manager, Utilisateur, Lecture seule). L\'utilisateur reçoit un email d\'invitation pour créer son compte.',
        },
        {
          id: 'faq-21',
          question: 'Quels sont les différents rôles ?',
          answer:
            'Administrateur : accès complet. Manager : gestion des données sans accès aux paramètres. Utilisateur : consultation et création limitée. Lecture seule : consultation uniquement. Vous pouvez aussi créer des rôles personnalisés.',
        },
        {
          id: 'faq-22',
          question: 'Comment personnaliser la numérotation ?',
          answer:
            'Paramètres > Entreprise > Numérotation. Définissez le format pour les factures, devis, bons de commande, etc. Utilisez les variables {YYYY}, {MM}, {N} pour créer votre format personnalisé (ex: FAC-2024-0001).',
        },
        {
          id: 'faq-23',
          question: 'Comment activer/désactiver un module ?',
          answer:
            'Paramètres > Modules. Activez ou désactivez les modules selon vos besoins (Fournisseurs, Clients, E-Sourcing, etc.). L\'activation dépend de votre formule d\'abonnement.',
        },
      ],
    },
    {
      category: 'technical',
      categoryTitle: 'Technique',
      questions: [
        {
          id: 'faq-24',
          question: 'Est-ce que mes données sont sécurisées ?',
          answer:
            'Oui, vos données sont hébergées sur des serveurs sécurisés avec chiffrement. Nous effectuons des sauvegardes quotidiennes automatiques. L\'accès est protégé par authentification forte et vous pouvez activer la 2FA.',
        },
        {
          id: 'faq-25',
          question: 'Puis-je exporter mes données ?',
          answer:
            'Oui, vous pouvez exporter vos données à tout moment en Excel ou CSV depuis chaque module. Les factures et bons de commande peuvent être exportés en PDF. Une exportation complète est disponible dans les paramètres.',
        },
        {
          id: 'faq-26',
          question: 'Y a-t-il une application mobile ?',
          answer:
            'Le système CSJ est une application web responsive qui fonctionne parfaitement sur mobile et tablette. Vous pouvez l\'installer comme application (PWA) sur votre téléphone pour un accès rapide.',
        },
        {
          id: 'faq-27',
          question: 'Puis-je intégrer le système CSJ avec d\'autres outils ?',
          answer:
            'Oui, le système CSJ propose une API REST pour des intégrations personnalisées. Nous proposons également des connecteurs pour les logiciels comptables populaires. Contactez le support pour plus d\'informations.',
        },
      ],
    },
  ];

  const categories = [
    { id: 'all', label: 'Toutes' },
    { id: 'general', label: 'Général' },
    { id: 'suppliers', label: 'Fournisseurs' },
    { id: 'purchase-orders', label: 'Bons de commande' },
    { id: 'invoices', label: 'Factures' },
    { id: 'products', label: 'Produits' },
    { id: 'settings', label: 'Paramètres' },
    { id: 'technical', label: 'Technique' },
  ];

  // Filtrer les questions
  const filteredFaq = faqData
    .map((categoryData) => {
      if (selectedCategory !== 'all' && categoryData.category !== selectedCategory) {
        return null;
      }

      const filteredQuestions = categoryData.questions.filter((q) => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
          q.question.toLowerCase().includes(search) ||
          q.answer.toLowerCase().includes(search)
        );
      });

      if (filteredQuestions.length === 0) return null;

      return {
        ...categoryData,
        questions: filteredQuestions,
      };
    })
    .filter(Boolean);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/help')}
          sx={{ mb: 2 }}
        >
          {t('help:faq.backToHelp', 'Retour à l\'aide')}
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <QuestionAnswer
            sx={{
              fontSize: 40,
              mr: 2,
              color: theme.palette.primary.main,
            }}
          />
          <Typography variant="h4" component="h1" fontWeight={700}>
            {t('help:faq.title', 'Questions fréquentes (FAQ)')}
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t(
            'help:faq.subtitle',
            'Trouvez rapidement des réponses aux questions les plus courantes'
          )}
        </Typography>

        {/* Barre de recherche */}
        <TextField
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('help:faq.searchPlaceholder', 'Rechercher une question...')}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {/* Filtres par catégorie */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.label}
              onClick={() => setSelectedCategory(cat.id)}
              color={selectedCategory === cat.id ? 'primary' : 'default'}
              variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Box>

      {/* Liste des questions */}
      {filteredFaq.length > 0 ? (
        filteredFaq.map((categoryData) => (
          <Box key={categoryData.category} sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{
                mb: 2,
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {categoryData.categoryTitle}
              <Chip
                label={categoryData.questions.length}
                size="small"
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              />
            </Typography>

            {categoryData.questions.map((question) => (
              <Accordion
                key={question.id}
                expanded={expanded === question.id}
                onChange={handleChange(question.id)}
                elevation={0}
                sx={{
                  mb: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '8px !important',
                  '&:before': {
                    display: 'none',
                  },
                  '&.Mui-expanded': {
                    borderColor: theme.palette.primary.main,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '&.Mui-expanded': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  <Typography fontWeight={500}>{question.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {question.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ))
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('help:faq.noResults', 'Aucune question trouvée')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('help:faq.tryDifferent', 'Essayez avec d\'autres mots-clés ou catégories')}
          </Typography>
        </Box>
      )}

      {/* Contact support */}
      <Box
        sx={{
          mt: 6,
          p: 4,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.05
          )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t('help:faq.stillNeedHelp', 'Vous n\'avez pas trouvé votre réponse ?')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('help:faq.contactUs', 'Notre équipe de support est là pour vous aider')}
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.open('mailto:support@procuregenius.com', '_blank')}
        >
          {t('help:faq.contactSupport', 'Contacter le support')}
        </Button>
      </Box>
    </Container>
  );
};

export default FAQ;
