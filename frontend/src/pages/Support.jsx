import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  WhatsApp,
  Email,
  OndemandVideo,
  Help,
  MenuBook,
  Keyboard,
  School,
  LaunchOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Support() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation(['help', 'common']);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Numéro WhatsApp et email de support
  const WHATSAPP_NUMBER = '+237693427913';
  const SUPPORT_EMAIL = 'report.makeitreal@gmail.com';

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}`, '_blank');
  };

  const handleEmailClick = () => {
    window.open(`mailto:${SUPPORT_EMAIL}`, '_blank');
  };

  const handleYoutubeLoad = () => {
    if (youtubeUrl) {
      // Extraire l'ID de la vidéo YouTube
      let videoId = '';
      const urlObj = new URL(youtubeUrl);
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v');
      }

      if (videoId) {
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
      }
    }
  };

  const quickActions = [
    {
      title: 'FAQ',
      description: 'Questions fréquemment posées',
      icon: <Help sx={{ fontSize: 24 }} />,
      color: '#2563eb',
      onClick: () => navigate('/faq'),
    },
    {
      title: 'Documentation',
      description: 'Guide complet de l\'application',
      icon: <MenuBook sx={{ fontSize: 24 }} />,
      color: '#10b981',
      onClick: () => navigate('/help'),
    },
    {
      title: 'Raccourcis clavier',
      description: 'Liste des raccourcis disponibles',
      icon: <Keyboard sx={{ fontSize: 24 }} />,
      color: '#f59e0b',
      onClick: () => navigate('/keyboard-shortcuts'),
    },
    {
      title: 'Tutoriel interactif',
      description: 'Découvrez l\'application étape par étape',
      icon: <School sx={{ fontSize: 24 }} />,
      color: '#8b5cf6',
      onClick: () => {
        // Déclencher le tutoriel
        window.dispatchEvent(new CustomEvent('start-tutorial'));
        navigate('/dashboard');
      },
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Besoin d'aide ?
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto', fontWeight: 400 }}
          >
            Nous sommes là pour vous accompagner
          </Typography>
        </Box>

        {/* Contact Cards */}
        <Stack spacing={3} sx={{ mb: 6 }}>
          {/* WhatsApp Card */}
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: theme.shadows[8],
                transform: 'translateY(-4px)',
              },
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    bgcolor: alpha('#25D366', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WhatsApp sx={{ fontSize: 48, color: '#25D366' }} />
                </Box>
                <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    WhatsApp Support
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    Contactez-nous directement sur WhatsApp pour une assistance rapide
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: '#25D366', fontWeight: 600 }}
                  >
                    {WHATSAPP_NUMBER}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<LaunchOutlined />}
                  onClick={handleWhatsAppClick}
                  sx={{
                    bgcolor: '#25D366',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#20BA5A',
                    },
                  }}
                >
                  Ouvrir WhatsApp
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Email Card */}
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: theme.shadows[8],
                transform: 'translateY(-4px)',
              },
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 3,
                    bgcolor: alpha('#2563eb', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Email sx={{ fontSize: 48, color: '#2563eb' }} />
                </Box>
                <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Email Support
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    Envoyez-nous un email et nous vous répondrons dans les plus brefs délais
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: '#2563eb', fontWeight: 600 }}
                  >
                    {SUPPORT_EMAIL}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<LaunchOutlined />}
                  onClick={handleEmailClick}
                  sx={{
                    bgcolor: '#2563eb',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: '#1d4ed8',
                    },
                  }}
                >
                  Envoyer un email
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* YouTube Tutorial Card */}
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      bgcolor: alpha('#FF0000', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <OndemandVideo sx={{ fontSize: 36, color: '#FF0000' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Tutoriels vidéo
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Apprenez à utiliser le système CSJ avec nos tutoriels vidéo
                    </Typography>
                  </Box>
                </Stack>

                <Divider />

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Collez l'URL de votre vidéo tutoriel YouTube ci-dessous :
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleYoutubeLoad}
                      disabled={!youtubeUrl}
                      sx={{
                        borderRadius: 2,
                        minWidth: 120,
                        fontWeight: 600,
                      }}
                    >
                      Ouvrir
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Note: Cette fonctionnalité permet d'ouvrir directement la vidéo YouTube de votre choix
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        {/* Quick Actions */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
            Actions rapides
          </Typography>
          <List disablePadding>
            {quickActions.map((action, index) => (
              <React.Fragment key={action.title}>
                {index > 0 && <Divider sx={{ my: 1 }} />}
                <ListItem
                  button
                  onClick={action.onClick}
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                    '&:hover': {
                      bgcolor: alpha(action.color, 0.08),
                    },
                  }}
                >
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: alpha(action.color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: action.color,
                      }}
                    >
                      {action.icon}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={action.title}
                    secondary={action.description}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      fontSize: '1rem',
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.875rem',
                    }}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  );
}

export default Support;
