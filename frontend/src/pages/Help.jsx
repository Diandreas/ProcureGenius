import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  alpha,
  Button,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Rocket,
  Business,
  ShoppingCart,
  Receipt,
  People,
  Inventory,
  Settings,
  Lightbulb,
  School,
  LiveHelp,
  Keyboard,
  Support,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SearchBar from '../components/help/SearchBar';
import ArticleView from '../components/help/ArticleView';
import {
  documentationCategories,
  getArticlesByCategory,
} from '../data/documentationLoader';
import { useTranslation } from 'react-i18next';

// Map des icônes
const iconMap = {
  Rocket: Rocket,
  Business: Business,
  ShoppingCart: ShoppingCart,
  Receipt: Receipt,
  People: People,
  Inventory: Inventory,
  Settings: Settings,
  Lightbulb: Lightbulb,
};

const Help = () => {
  const { t } = useTranslation(['help', 'common']);
  const navigate = useNavigate();
  const { articleId } = useParams();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Gérer le filtre par catégorie depuis l'URL
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  // Si un article est sélectionné, afficher l'ArticleView
  if (articleId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <ArticleView articleId={articleId} />
      </Container>
    );
  }

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const handleArticleClick = (articleId) => {
    navigate(`/help/${articleId}`);
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'tutorial':
        window.dispatchEvent(new CustomEvent('start-tutorial'));
        break;
      case 'faq':
        navigate('/help/faq');
        break;
      case 'shortcuts':
        navigate('/help/shortcuts');
        break;
      case 'support':
        window.open('mailto:support@procuregenius.com', '_blank');
        break;
      default:
        break;
    }
  };

  // Filtrer les articles par catégorie sélectionnée
  const displayedCategories = selectedCategory
    ? documentationCategories().filter((cat) => cat.id === selectedCategory)
    : documentationCategories();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* En-tête */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h3"
          component="h1"
          fontWeight={700}
          gutterBottom
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t('help:title', 'Centre d\'aide ProcureGenius')}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          {t('help:subtitle', 'Trouvez rapidement les réponses à vos questions')}
        </Typography>

        {/* Barre de recherche */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
          <SearchBar autoFocus={false} />
        </Box>

        {/* Actions rapides */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            flexWrap: 'wrap',
            mt: 3,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<School />}
            onClick={() => handleQuickAction('tutorial')}
            size="small"
          >
            {t('help:quickActions.tutorial', 'Tutoriel interactif')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<LiveHelp />}
            onClick={() => handleQuickAction('faq')}
            size="small"
          >
            {t('help:quickActions.faq', 'FAQ')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Keyboard />}
            onClick={() => handleQuickAction('shortcuts')}
            size="small"
          >
            {t('help:quickActions.shortcuts', 'Raccourcis clavier')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Support />}
            onClick={() => handleQuickAction('support')}
            size="small"
          >
            {t('help:quickActions.support', 'Contacter le support')}
          </Button>
        </Box>
      </Box>

      {/* Filtre de catégorie */}
      {selectedCategory && (
        <Box sx={{ mb: 3 }}>
          <Chip
            label={
              documentationCategories.find((c) => c.id === selectedCategory)?.title ||
              selectedCategory
            }
            onDelete={() => setSelectedCategory(null)}
            color="primary"
          />
        </Box>
      )}

      {/* Catégories et articles */}
      <Box>
        {displayedCategories.map((category) => {
          const IconComponent = iconMap[category.icon] || Lightbulb;
          const articles = getArticlesByCategory(category.id);

          return (
            <Box key={category.id} sx={{ mb: 4 }}>
              {/* En-tête de catégorie */}
              <Card
                elevation={0}
                sx={{
                  mb: 2,
                  border: 2,
                  borderColor: alpha(category.color, 0.3),
                  background: `linear-gradient(135deg, ${alpha(
                    category.color,
                    0.05
                  )} 0%, ${alpha(category.color, 0.02)} 100%)`,
                  cursor: selectedCategory ? 'default' : 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': selectedCategory
                    ? {}
                    : {
                        borderColor: category.color,
                        transform: 'translateY(-2px)',
                        boxShadow: 3,
                      },
                }}
                onClick={() => !selectedCategory && handleCategoryClick(category.id)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        backgroundColor: alpha(category.color, 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent sx={{ fontSize: 28, color: category.color }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} color={category.color}>
                        {category.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {category.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${articles.length} ${articles.length > 1 ? 'articles' : 'article'}`}
                      size="small"
                      sx={{
                        backgroundColor: alpha(category.color, 0.15),
                        color: category.color,
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Liste des articles (toujours affichée ou seulement si catégorie sélectionnée) */}
              <Grid container spacing={2}>
                {articles.map((article) => (
                  <Grid item xs={12} sm={6} md={4} key={article.id}>
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%',
                        border: 1,
                        borderColor: 'divider',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: category.color,
                          boxShadow: 2,
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <CardActionArea
                        onClick={() => handleArticleClick(article.id)}
                        sx={{ height: '100%', p: 2 }}
                      >
                        <CardContent sx={{ p: 0 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight={600}
                            gutterBottom
                            sx={{ color: category.color }}
                          >
                            {article.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.6,
                            }}
                          >
                            {article.content
                              .substring(0, 120)
                              .replace(/[#*\n]/g, '')
                              .trim()}
                            ...
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })}
      </Box>

      {/* Besoin d'aide supplémentaire */}
      <Card
        elevation={0}
        sx={{
          mt: 6,
          p: 4,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.05
          )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {t('help:needMoreHelp.title', 'Besoin d\'aide supplémentaire ?')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t(
            'help:needMoreHelp.description',
            'Notre équipe de support est là pour vous aider'
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Support />}
            onClick={() => window.open('mailto:support@procuregenius.com', '_blank')}
          >
            {t('help:needMoreHelp.contact', 'Contacter le support')}
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<School />}
            onClick={() => window.dispatchEvent(new CustomEvent('start-tutorial'))}
          >
            {t('help:needMoreHelp.startTutorial', 'Lancer le tutoriel')}
          </Button>
        </Box>
      </Card>
    </Container>
  );
};

export default Help;
