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
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  {
    id: 'critique',
    labelKey: 'settings:push.categories.critique.label',
    descriptionKey: 'settings:push.categories.critique.description',
    color: 'error',
    fields: [
      { key: 'push_stock_rupture', labelKey: 'settings:push.fields.push_stock_rupture' },
      { key: 'push_quota_atteint', labelKey: 'settings:push.fields.push_quota_atteint' },
      { key: 'push_facture_retard', labelKey: 'settings:push.fields.push_facture_retard' },
    ],
    locked: true,
  },
  {
    id: 'important',
    labelKey: 'settings:push.categories.important.label',
    descriptionKey: 'settings:push.categories.important.description',
    color: 'warning',
    fields: [
      { key: 'push_stock_bas', labelKey: 'settings:push.fields.push_stock_bas' },
      { key: 'push_facture_brouillon', labelKey: 'settings:push.fields.push_facture_brouillon' },
      { key: 'push_bc_retard', labelKey: 'settings:push.fields.push_bc_retard' },
      { key: 'push_lot_expirant', labelKey: 'settings:push.fields.push_lot_expirant' },
      { key: 'push_insight_ia', labelKey: 'settings:push.fields.push_insight_ia' },
    ],
    locked: false,
  },
  {
    id: 'resume',
    labelKey: 'settings:push.categories.resume.label',
    descriptionKey: 'settings:push.categories.resume.description',
    color: 'info',
    fields: [
      { key: 'push_resume_hebdo', labelKey: 'settings:push.fields.push_resume_hebdo' },
    ],
    locked: false,
  },
];

export default function PushNotificationSettings() {
  const { t } = useTranslation(['settings', 'common']);
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
      setSaveMsg({ type: 'success', text: t('settings:push.saved') });
    } catch {
      setPrefs(prefs); // rollback
      setSaveMsg({ type: 'error', text: t('settings:push.saveError') });
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
        setSaveMsg({ type: 'error', text: t('settings:push.blockedInBrowser') });
      }
    }
  };

  if (!isSupported) {
    return (
      <Alert severity="warning" icon={<NotificationsOff />}>
        {t('settings:push.notSupported')}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        {t('settings:push.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {t('settings:push.subtitle')}
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
                {isSubscribed ? t('settings:push.enabled') : t('settings:push.disabled')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isSubscribed
                  ? t('settings:push.enabledHelper')
                  : t('settings:push.disabledHelper')}
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
              : isSubscribed ? t('settings:push.disable') : t('settings:push.enable')}
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
          {t('settings:push.deniedAlert')}
        </Alert>
      )}

      {/* Préférences par catégorie */}
      {isSubscribed && prefs && (
        <Stack spacing={2.5}>
          {CATEGORIES.map((cat) => (
            <Box key={cat.id}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography fontWeight={700} fontSize="0.9rem">{t(cat.labelKey)}</Typography>
                {cat.locked && (
                  <Chip label={t('settings:push.alwaysActive')} size="small" color="error" variant="outlined" />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                {t(cat.descriptionKey)}
              </Typography>
              <Stack spacing={0.5}>
                {cat.fields.map(({ key, labelKey }) => (
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
                    label={<Typography variant="body2">{t(labelKey)}</Typography>}
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
          {t('settings:push.enableToConfigure')}
        </Alert>
      )}
    </Box>
  );
}
