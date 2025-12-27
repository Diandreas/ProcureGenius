import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  Divider,
  Chip,
  Button,
  IconButton,
  Card,
  CardContent,
  CardActionArea,
  alpha,
  useTheme,
} from '@mui/material';
import {
  NavigateNext,
  ArrowBack,
  ArrowForward,
  ThumbUp,
  ThumbDown,
  Print,
  Share,
  Bookmark,
  BookmarkBorder,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  documentationArticles,
  documentationCategories,
  getRelatedArticles,
  getArticlesByCategory,
} from '../../data/documentation';
import { useTranslation } from 'react-i18next';

const ArticleView = ({ articleId }) => {
  const { t } = useTranslation(['help', 'common']);
  const navigate = useNavigate();
  const theme = useTheme();
  const [helpful, setHelpful] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);

  // Trouver l'article
  const article = documentationArticles.find((a) => a.id === articleId);

  if (!article) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          {t('help:article.notFound', 'Article non trouvé')}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/help')}
          sx={{ mt: 2 }}
        >
          {t('help:article.backToHelp', 'Retour à l\'aide')}
        </Button>
      </Box>
    );
  }

  // Informations de catégorie
  const category = documentationCategories.find((c) => c.id === article.category);

  // Articles liés
  const relatedArticles = getRelatedArticles(articleId);

  // Navigation précédent/suivant
  const categoryArticles = getArticlesByCategory(article.category);
  const currentIndex = categoryArticles.findIndex((a) => a.id === articleId);
  const previousArticle = currentIndex > 0 ? categoryArticles[currentIndex - 1] : null;
  const nextArticle =
    currentIndex < categoryArticles.length - 1 ? categoryArticles[currentIndex + 1] : null;

  const handleHelpful = (isHelpful) => {
    setHelpful(isHelpful);
    // Ici vous pourriez envoyer un feedback au backend
    console.log(`Article ${articleId} marked as ${isHelpful ? 'helpful' : 'not helpful'}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copier dans le presse-papier
      navigator.clipboard.writeText(url);
      // Vous pourriez afficher un snackbar ici
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    // Sauvegarder dans localStorage ou backend
    const bookmarks = JSON.parse(localStorage.getItem('help_bookmarks') || '[]');
    if (!bookmarked) {
      bookmarks.push(articleId);
    } else {
      const index = bookmarks.indexOf(articleId);
      if (index > -1) bookmarks.splice(index, 1);
    }
    localStorage.setItem('help_bookmarks', JSON.stringify(bookmarks));
  };

  // Charger les bookmarks au montage
  React.useEffect(() => {
    const bookmarks = JSON.parse(localStorage.getItem('help_bookmarks') || '[]');
    setBookmarked(bookmarks.includes(articleId));
  }, [articleId]);

  return (
    <Box>
      {/* Breadcrumb */}
      <Breadcrumbs
        separator={<NavigateNext fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/help')}
          sx={{
            cursor: 'pointer',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {t('help:breadcrumb.help', 'Aide')}
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate(`/help?category=${article.category}`)}
          sx={{
            cursor: 'pointer',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {category?.title}
        </Link>
        <Typography variant="body2" color="text.primary">
          {article.title}
        </Typography>
      </Breadcrumbs>

      {/* Contenu de l'article */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          border: 1,
          borderColor: 'divider',
        }}
      >
        {/* En-tête */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" component="h1" fontWeight={600}>
              {article.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" onClick={handleBookmark} color={bookmarked ? 'primary' : 'default'}>
                {bookmarked ? <Bookmark /> : <BookmarkBorder />}
              </IconButton>
              <IconButton size="small" onClick={handleShare}>
                <Share />
              </IconButton>
              <IconButton size="small" onClick={handlePrint}>
                <Print />
              </IconButton>
            </Box>
          </Box>

          {/* Catégorie */}
          <Chip
            label={category?.title}
            size="small"
            sx={{
              backgroundColor: alpha(category?.color || theme.palette.primary.main, 0.1),
              color: category?.color || theme.palette.primary.main,
              fontWeight: 500,
            }}
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Contenu Markdown */}
        <Box
          sx={{
            '& h1': { fontSize: '1.75rem', fontWeight: 600, mt: 3, mb: 2 },
            '& h2': { fontSize: '1.5rem', fontWeight: 600, mt: 3, mb: 2 },
            '& h3': { fontSize: '1.25rem', fontWeight: 600, mt: 2, mb: 1.5 },
            '& h4': { fontSize: '1.1rem', fontWeight: 600, mt: 2, mb: 1 },
            '& p': { mb: 2, lineHeight: 1.7 },
            '& ul, & ol': { mb: 2, pl: 3 },
            '& li': { mb: 0.5 },
            '& code': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              padding: '2px 6px',
              borderRadius: 1,
              fontSize: '0.875em',
              fontFamily: 'monospace',
            },
            '& pre': {
              backgroundColor: alpha(theme.palette.grey[500], 0.1),
              padding: 2,
              borderRadius: 1,
              overflow: 'auto',
              mb: 2,
            },
            '& blockquote': {
              borderLeft: `4px solid ${theme.palette.primary.main}`,
              pl: 2,
              ml: 0,
              color: 'text.secondary',
              fontStyle: 'italic',
            },
          }}
        >
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Feedback */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={500}>
            {t('help:article.wasHelpful', 'Cet article vous a-t-il été utile ?')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            <Button
              variant={helpful === true ? 'contained' : 'outlined'}
              startIcon={<ThumbUp />}
              onClick={() => handleHelpful(true)}
              color="success"
            >
              {t('common:labels.yes', 'Oui')}
            </Button>
            <Button
              variant={helpful === false ? 'contained' : 'outlined'}
              startIcon={<ThumbDown />}
              onClick={() => handleHelpful(false)}
              color="error"
            >
              {t('common:labels.no', 'Non')}
            </Button>
          </Box>
          {helpful !== null && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {helpful
                ? t('help:article.thanksFeedback', 'Merci pour votre retour !')
                : t('help:article.sorryNotHelpful', 'Nous sommes désolés. Contactez le support pour plus d\'aide.')}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Navigation précédent/suivant */}
      {(previousArticle || nextArticle) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            mb: 3,
          }}
        >
          {previousArticle ? (
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/help/${previousArticle.id}`)}
              sx={{ flex: 1 }}
            >
              <Box sx={{ textAlign: 'left', overflow: 'hidden' }}>
                <Typography variant="caption" display="block" color="text.secondary">
                  {t('help:article.previous', 'Précédent')}
                </Typography>
                <Typography variant="body2" noWrap>
                  {previousArticle.title}
                </Typography>
              </Box>
            </Button>
          ) : (
            <Box sx={{ flex: 1 }} />
          )}

          {nextArticle ? (
            <Button
              variant="outlined"
              endIcon={<ArrowForward />}
              onClick={() => navigate(`/help/${nextArticle.id}`)}
              sx={{ flex: 1 }}
            >
              <Box sx={{ textAlign: 'right', overflow: 'hidden' }}>
                <Typography variant="caption" display="block" color="text.secondary">
                  {t('help:article.next', 'Suivant')}
                </Typography>
                <Typography variant="body2" noWrap>
                  {nextArticle.title}
                </Typography>
              </Box>
            </Button>
          ) : (
            <Box sx={{ flex: 1 }} />
          )}
        </Box>
      )}

      {/* Articles liés */}
      {relatedArticles.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
            {t('help:article.relatedTopics', 'Articles liés')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {relatedArticles.map((relatedArticle) => {
              const relatedCategory = documentationCategories.find(
                (c) => c.id === relatedArticle.category
              );
              return (
                <Card
                  key={relatedArticle.id}
                  elevation={0}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 2,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(`/help/${relatedArticle.id}`)}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Chip
                        label={relatedCategory?.title}
                        size="small"
                        sx={{
                          mb: 1,
                          backgroundColor: alpha(
                            relatedCategory?.color || theme.palette.primary.main,
                            0.1
                          ),
                          color: relatedCategory?.color || theme.palette.primary.main,
                          fontSize: '0.7rem',
                        }}
                      />
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        {relatedArticle.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                        {relatedArticle.content
                          .substring(0, 80)
                          .replace(/[#*\n]/g, '')
                          .trim()}
                        ...
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ArticleView;
