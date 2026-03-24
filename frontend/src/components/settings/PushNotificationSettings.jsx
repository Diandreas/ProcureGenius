import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Switch, FormControlLabel, Button, Alert,
  Chip, Divider, CircularProgress, Stack, Card, CardContent,
} from '@mui/material';
import {
  NotificationsActive, NotificationsOff, PhoneAndroid,
  Warning, Info, CalendarMonth,
} from '@mui/icons-material';
import usePushNotifications from '../../hooks/usePushNotifications';
import { aiChatAPI } from '../../services/api';

const CATEGORIES = [
  {
    id: 'critique',
    label: '🔴 Critique',
    description: 'Non désactivables — ruptures de stock, quota atteint, factures très en retard',
    color: 'error',
    fields: [
      { key: 'push_stock_rupture', label: 'Rupture de stock' },
      { key: 'push_quota_atteint', label: 'Quota plan atteint (90%+)' },
      { key: 'push_facture_retard', label: 'Facture en retard de +7 jours' },
    ],
    locked: true,
  },
  {
    id: 'important',
    label: '🟠 Important',
    description: 'Activées par défaut, désactivables',
    color: 'warning',
    fields: [
      { key: 'push_stock_bas', label: 'Stock bas (seuil d\'alerte)' },
      { key: 'push_facture_brouillon', label: 'Facture brouillon depuis +24h' },
      { key: 'push_bc_retard', label: 'Bon de commande en retard' },
      { key: 'push_lot_expirant', label: 'Lot produit expirant sous 30 jours' },
      { key: 'push_insight_ia', label: 'Insight IA important (priorité ≥ 8)' },
    ],
    locked: false,
  },
  {
    id: 'resume',
    label: '📋 Résumé hebdo',
    description: 'Un seul push le lundi matin avec le résumé de la semaine',
    color: 'info',
    fields: [
      { key: 'push_resume_hebdo', label: 'Résumé hebdomadaire (lundi 8h)' },
    ],
    locked: false,
  },
];

export default function PushNotificationSettings() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    aiChatAPI.getPushPreferences()
      .then((r) => setPrefs(r.data))
      .catch(() => {});
  }, []);

  const handleToggle = async (key, value) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    try {
      await aiChatAPI.updatePushPreferences({ [key]: value });
      setSaveMsg({ type: 'success', text: 'Préférences sauvegardées' });
    } catch {
      setPrefs(prefs); // rollback
      setSaveMsg({ type: 'error', text: 'Erreur de sauvegarde' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 2500);
    }
  };

  const handleSubscribeToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      const ok = await subscribe();
      if (!ok && permission === 'denied') {
        setSaveMsg({ type: 'error', text: 'Notifications bloquées dans le navigateur. Modifiez les autorisations dans les paramètres du site.' });
      }
    }
  };

  if (!isSupported) {
    return (
      <Alert severity="warning" icon={<NotificationsOff />}>
        Votre navigateur ne supporte pas les notifications push. Essayez Chrome ou Firefox.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        Notifications push
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Recevez des alertes même quand Procura est fermé — directement sur votre appareil.
      </Typography>

      {/* Bouton activation principale */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: isSubscribed ? 'success.main' : 'divider',
          borderRadius: 3,
          mb: 3,
          bgcolor: isSubscribed ? 'success.50' : 'background.default',
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <PhoneAndroid color={isSubscribed ? 'success' : 'disabled'} />
            <Box>
              <Typography fontWeight={600}>
                {isSubscribed ? 'Notifications activées' : 'Notifications désactivées'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isSubscribed
                  ? 'Cet appareil reçoit les push notifications Procura.'
                  : 'Cliquez pour recevoir les notifications sur cet appareil.'}
              </Typography>
            </Box>
          </Box>
          <Button
            variant={isSubscribed ? 'outlined' : 'contained'}
            color={isSubscribed ? 'error' : 'primary'}
            startIcon={isSubscribed ? <NotificationsOff /> : <NotificationsActive />}
            onClick={handleSubscribeToggle}
            disabled={isLoading}
            size="small"
          >
            {isLoading
              ? <CircularProgress size={16} />
              : isSubscribed ? 'Désactiver' : 'Activer les notifications'}
          </Button>
        </CardContent>
      </Card>

      {saveMsg && (
        <Alert severity={saveMsg.type} sx={{ mb: 2 }}>
          {saveMsg.text}
        </Alert>
      )}

      {/* Permission navigateur */}
      {permission === 'denied' && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
          Les notifications sont bloquées dans votre navigateur. Cliquez sur l'icône cadenas dans la barre d'adresse pour les autoriser.
        </Alert>
      )}

      {/* Préférences par catégorie */}
      {isSubscribed && prefs && (
        <Stack spacing={2.5}>
          {CATEGORIES.map((cat) => (
            <Box key={cat.id}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography fontWeight={700} fontSize="0.9rem">{cat.label}</Typography>
                {cat.locked && (
                  <Chip label="Toujours actif" size="small" color="error" variant="outlined" />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                {cat.description}
              </Typography>
              <Stack spacing={0.5}>
                {cat.fields.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Switch
                        checked={cat.locked ? true : (prefs[key] ?? true)}
                        onChange={(e) => !cat.locked && handleToggle(key, e.target.checked)}
                        disabled={cat.locked || saving}
                        size="small"
                        color={cat.color}
                      />
                    }
                    label={<Typography variant="body2">{label}</Typography>}
                  />
                ))}
              </Stack>
              {cat.id !== 'resume' && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </Stack>
      )}

      {!isSubscribed && (
        <Alert severity="info" icon={<Info />}>
          Activez les notifications pour configurer vos préférences.
        </Alert>
      )}
    </Box>
  );
}
