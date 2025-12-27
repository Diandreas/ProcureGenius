import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Keyboard as KeyboardIcon,
  Navigation,
  Add,
  Search,
  ViewList,
  Edit,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const KeyboardShortcuts = () => {
  const { t } = useTranslation(['help', 'common']);
  const navigate = useNavigate();
  const theme = useTheme();

  // Raccourcis clavier RÉELLEMENT IMPLÉMENTÉS
  // Note : Seuls les raccourcis listés ci-dessous sont fonctionnels
  const shortcutsData = [
    {
      category: 'Navigation entre modules',
      icon: Navigation,
      color: theme.palette.primary.main,
      shortcuts: [
        {
          keys: ['Alt', '1'],
          macKeys: ['Option', '1'],
          description: 'Aller au tableau de bord',
        },
        {
          keys: ['Alt', '2'],
          macKeys: ['Option', '2'],
          description: 'Aller aux fournisseurs',
        },
        {
          keys: ['Alt', '3'],
          macKeys: ['Option', '3'],
          description: 'Aller aux bons de commande',
        },
        {
          keys: ['Alt', '4'],
          macKeys: ['Option', '4'],
          description: 'Aller aux factures',
        },
      ],
    },
    {
      category: 'Recherche et aide',
      icon: Search,
      color: theme.palette.info.main,
      shortcuts: [
        {
          keys: ['Ctrl', 'K'],
          macKeys: ['Cmd', 'K'],
          description: 'Ouvrir la recherche globale',
        },
        {
          keys: ['Ctrl', '/'],
          macKeys: ['Cmd', '/'],
          description: 'Ouvrir le centre d\'aide',
        },
      ],
    },
    {
      category: 'Actions dans les formulaires',
      icon: Edit,
      color: theme.palette.success.main,
      shortcuts: [
        {
          keys: ['Ctrl', 'S'],
          macKeys: ['Cmd', 'S'],
          description: 'Enregistrer le formulaire en cours',
        },
        {
          keys: ['Ctrl', 'N'],
          macKeys: ['Cmd', 'N'],
          description: 'Créer un nouveau document (contextuel)',
        },
      ],
    },
  ];

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const KeyChip = ({ keyName }) => (
    <Chip
      label={keyName}
      size="small"
      sx={{
        fontFamily: 'monospace',
        fontWeight: 600,
        backgroundColor: alpha(theme.palette.text.primary, 0.08),
        border: `1px solid ${alpha(theme.palette.text.primary, 0.2)}`,
        color: 'text.primary',
        height: 28,
        fontSize: '0.75rem',
        borderRadius: 1,
      }}
    />
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/help')}
          sx={{ mb: 2 }}
        >
          {t('help:shortcuts.backToHelp', 'Retour à l\'aide')}
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <KeyboardIcon
            sx={{
              fontSize: 40,
              mr: 2,
              color: theme.palette.primary.main,
            }}
          />
          <Typography variant="h4" component="h1" fontWeight={700}>
            {t('help:shortcuts.title', 'Raccourcis clavier')}
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            'help:shortcuts.subtitle',
            'Gagnez du temps en utilisant les raccourcis clavier'
          )}
        </Typography>

        {/* Indication plateforme */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
          }}
        >
          <Typography variant="body2" color="info.main" fontWeight={500}>
            {isMac
              ? t('help:shortcuts.macDetected', 'Raccourcis pour Mac détectés')
              : t('help:shortcuts.windowsDetected', 'Raccourcis pour Windows détectés')}
          </Typography>
        </Box>
      </Box>

      {/* Grille des raccourcis */}
      <Grid container spacing={3}>
        {shortcutsData.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <Grid item xs={12} md={6} key={index}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: 2,
                  borderColor: alpha(category.color, 0.3),
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: category.color,
                    boxShadow: `0 4px 20px ${alpha(category.color, 0.15)}`,
                  },
                }}
              >
                <CardContent>
                  {/* En-tête de catégorie */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        backgroundColor: alpha(category.color, 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                      }}
                    >
                      <IconComponent sx={{ color: category.color, fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} color={category.color}>
                      {category.category}
                    </Typography>
                  </Box>

                  {/* Liste des raccourcis */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {category.shortcuts.map((shortcut, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          pb: idx < category.shortcuts.length - 1 ? 2 : 0,
                          borderBottom:
                            idx < category.shortcuts.length - 1
                              ? `1px solid ${theme.palette.divider}`
                              : 'none',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ flex: 1, color: 'text.primary' }}
                        >
                          {shortcut.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {(isMac ? shortcut.macKeys : shortcut.keys).map((key, keyIdx) => (
                            <KeyChip key={keyIdx} keyName={key} />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Conseil */}
      <Box
        sx={{
          mt: 4,
          p: 3,
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
          {t('help:shortcuts.tipTitle', 'Conseil')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            'help:shortcuts.tipContent',
            'Utilisez Ctrl+/ (Cmd+/ sur Mac) à tout moment pour afficher l\'aide contextuelle et les raccourcis disponibles sur la page actuelle.'
          )}
        </Typography>
      </Box>

      {/* Imprimer */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="outlined"
          onClick={() => window.print()}
          sx={{ mr: 2 }}
        >
          {t('help:shortcuts.print', 'Imprimer cette page')}
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/help')}
        >
          {t('help:shortcuts.backToHelp', 'Retour à l\'aide')}
        </Button>
      </Box>
    </Container>
  );
};

export default KeyboardShortcuts;
