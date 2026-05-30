import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Grid,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  WhatsApp,
  Email,
  Help,
  MenuBook,
  Keyboard,
  School,
  AccessTime,
  PhoneIphone,
  Payments,
  Gavel,
  Percent,
  NotificationsActive,
  CheckCircle,
  ArrowForward,
  Public,
  SupportAgent,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WHATSAPP_NUMBER = '+237693427913';
const SUPPORT_EMAIL = 'report.makeitreal@gmail.com';

function Support() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation(['help', 'common']);

  const quickActions = [
    {
      title: 'FAQ',
      description: 'Questions fréquemment posées',
      icon: <Help />,
      color: '#2563eb',
      onClick: () => navigate('/faq'),
    },
    {
      title: 'Documentation',
      description: 'Guide complet de l\'application',
      icon: <MenuBook />,
      color: '#10b981',
      onClick: () => navigate('/help'),
    },
    {
      title: 'Raccourcis clavier',
      description: 'Liste des raccourcis disponibles',
      icon: <Keyboard />,
      color: '#f59e0b',
      onClick: () => navigate('/keyboard-shortcuts'),
    },
    {
      title: 'Tutoriel interactif',
      description: 'Découvrez l\'application étape par étape',
      icon: <School />,
      color: '#8b5cf6',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('start-tutorial'));
        navigate('/dashboard');
      },
    },
  ];

  const africaRecommendations = [
    {
      icon: <PhoneIphone />,
      color: '#10b981',
      title: 'Optimisé mobile',
      desc: 'Installez Procura comme application sur votre téléphone (PWA). Fonctionne sur Android et iOS sans passer par un store.',
    },
    {
      icon: <Payments />,
      color: '#3b82f6',
      title: 'Devises africaines',
      desc: 'Configurez vos factures en FCFA (XAF/XOF), Franc congolais (CDF), Dirham marocain (MAD) ou toute autre devise locale.',
    },
    {
      icon: <Gavel />,
      color: '#8b5cf6',
      title: 'Droit OHADA',
      desc: 'Générez des contrats en français conformes aux pratiques commerciales de l\'espace OHADA grâce à l\'IA intégrée.',
    },
    {
      icon: <Percent />,
      color: '#f59e0b',
      title: 'Taxes locales',
      desc: 'Paramétrez la TVA selon votre pays : Cameroun (19,25%), Sénégal (18%), Côte d\'Ivoire (18%), Maroc (20%).',
    },
    {
      icon: <NotificationsActive />,
      color: '#ef4444',
      title: 'Relances automatiques',
      desc: 'Activez les notifications push pour relancer vos clients automatiquement avant et après les échéances de paiement.',
    },
    {
      icon: <Public />,
      color: '#06b6d4',
      title: 'Multi-pays',
      desc: 'Gérez des clients et fournisseurs dans plusieurs pays depuis une seule interface. Idéal pour le commerce transfrontalier.',
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 }, pb: isMobile ? 12 : 4 }}>
      <Container maxWidth="lg">

        {/* Hero */}
        <Box sx={{ mb: { xs: 3, md: 5 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
            <SupportAgent sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700}>
              Support & Aide
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary">
            Notre équipe est disponible pour vous accompagner. Réponse garantie sous 2h en heures ouvrables.
          </Typography>
        </Box>

        {/* ── Contact Cards ── */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'text.disabled' }}>
          Nous contacter
        </Typography>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          {/* WhatsApp */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: alpha('#25D366', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <WhatsApp sx={{ fontSize: 30, color: '#25D366' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={700}>WhatsApp</Typography>
                      <Chip label="Recommandé" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha('#25D366', 0.12), color: '#16a34a' }} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Réponse rapide, envoi de captures d'écran possible
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#25D366', mb: 1.5 }}>
                      {WHATSAPP_NUMBER}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
                      <AccessTime sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">Lun – Sam · 8h00 – 20h00 (WAT)</Typography>
                    </Stack>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<WhatsApp />}
                      onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}`, '_blank')}
                      sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#20BA5A' }, borderRadius: 2, fontWeight: 600 }}
                    >
                      Ouvrir WhatsApp
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Email */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: alpha('#2563eb', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Email sx={{ fontSize: 30, color: '#2563eb' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Email</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Pour les demandes détaillées, bugs ou suggestions
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#2563eb', mb: 1.5, wordBreak: 'break-all' }}>
                      {SUPPORT_EMAIL}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
                      <AccessTime sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">Réponse sous 24h en jours ouvrables</Typography>
                    </Stack>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Email />}
                      onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank')}
                      sx={{ borderRadius: 2, fontWeight: 600, borderColor: '#2563eb', color: '#2563eb', '&:hover': { borderColor: '#1d4ed8', bgcolor: alpha('#2563eb', 0.04) } }}
                    >
                      Envoyer un email
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Section Afrique ── */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'text.disabled' }}>
                Procura en Afrique
              </Typography>
            </Stack>
            <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} sx={{ mb: 0.5 }}>
              Conseils pour votre marché
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Procura est conçu pour s'adapter aux réalités du marché africain. Voici comment en tirer le meilleur parti.
            </Typography>
          </Box>

          <Grid container spacing={1.5}>
            {africaRecommendations.map((rec, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%', borderLeft: `3px solid ${rec.color}` }}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(rec.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {React.cloneElement(rec.icon, { sx: { fontSize: 18, color: rec.color } })}
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{rec.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, display: 'block' }}>{rec.desc}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Tip banner */}
          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.15), display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <CheckCircle sx={{ fontSize: 18, color: 'primary.main', mt: 0.15, flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary">
              <strong>Astuce :</strong> Procura fonctionne sans connexion stable grâce à la mise en cache PWA. Installez-le sur votre écran d'accueil pour un accès instantané, même avec une connexion 3G limitée.
            </Typography>
          </Box>
        </Box>

        {/* ── Quick Actions ── */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'text.disabled' }}>
          Ressources utiles
        </Typography>
        <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <List disablePadding>
            {quickActions.map((action, index) => (
              <React.Fragment key={action.title}>
                {index > 0 && <Divider />}
                <ListItem
                  button
                  onClick={action.onClick}
                  sx={{ px: 2.5, py: 1.75, '&:hover': { bgcolor: alpha(action.color, 0.05) } }}
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: alpha(action.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color }}>
                      {React.cloneElement(action.icon, { sx: { fontSize: 20 } })}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={action.title}
                    secondary={action.description}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                    secondaryTypographyProps={{ fontSize: '0.8rem' }}
                  />
                  <ArrowForward sx={{ fontSize: 16, color: 'text.disabled' }} />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {/* Footer note */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.disabled">
            Procura · Support basé à Yaoundé, Cameroun · Disponible dans toute l'Afrique et à l'international
          </Typography>
        </Box>

      </Container>
    </Box>
  );
}

export default Support;
