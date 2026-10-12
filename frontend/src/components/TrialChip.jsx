// Petit chip "Essai Pro — N jours" affiche dans le header quand l'organisation
// est en periode d'essai. Cliquable vers la page d'abonnement. Discret : ne
// rend rien si pas d'essai en cours.
// Sur mobile, il se contracte en "⚠ N j" (icone + nombre de jours) pour ne pas
// surcharger le header.

import React, { useEffect, useState } from 'react';
import { Chip, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { Bolt, WarningAmber } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import subscriptionAPI from '../services/subscriptionAPI';
import { nomPlan } from '../hooks/usePlansTarifs';

export default function TrialChip() {
  const navigate = useNavigate();
  const { t } = useTranslation(['subscription', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [trial, setTrial] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await subscriptionAPI.getStatus();
        const sub = data?.subscription;
        if (alive && sub?.is_trial) {
          setTrial({
            days: sub.trial_days_remaining ?? 0,
            plan: sub.plan?.name || 'Pro',
            code: sub.plan?.code || null,
          });
        }
      } catch { /* silencieux : pas de chip si erreur/offline */ }
    })();
    return () => { alive = false; };
  }, []);

  if (!trial) return null;

  const active = trial.days > 0;
  const plan = nomPlan(t, trial.code, trial.plan);
  // Mobile : compact (icone + "N j"). Desktop : libelle complet.
  const label = isMobile
    ? (active ? t('subscription:trialChip.mobileDays', { days: trial.days }) : t('subscription:trialChip.mobileExpired'))
    : (active ? t('subscription:trialChip.active', { plan, days: trial.days }) : t('subscription:trialChip.expired', { plan }));

  return (
    <Tooltip title={active ? t('subscription:trialChip.tooltipActive', { plan, count: trial.days }) : t('subscription:trialChip.tooltipExpired')} arrow>
      <Chip
        icon={isMobile ? <WarningAmber sx={{ fontSize: 14 }} /> : <Bolt sx={{ fontSize: 15 }} />}
        label={label}
        size="small"
        onClick={() => navigate('/subscription/plans')}
        sx={{
          height: isMobile ? 22 : 26,
          fontWeight: 700,
          fontSize: isMobile ? '0.68rem' : '0.72rem',
          cursor: 'pointer',
          bgcolor: active ? '#fff7e6' : '#fde8e8',
          color: active ? '#b45309' : '#b91c1c',
          border: '1px solid', borderColor: active ? '#fcd34d' : '#fca5a5',
          '& .MuiChip-label': { px: isMobile ? 0.75 : 1 },
          '& .MuiChip-icon': { color: 'inherit', ml: isMobile ? 0.5 : 0.75, mr: isMobile ? -0.25 : 0 },
        }}
      />
    </Tooltip>
  );
}
