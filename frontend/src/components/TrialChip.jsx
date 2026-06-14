// Petit chip "Essai Pro — N jours" affiche dans le header quand l'organisation
// est en periode d'essai. Cliquable vers la page d'abonnement. Discret : ne
// rend rien si pas d'essai en cours.
// Sur mobile, il se contracte en "⚠ N j" (icone + nombre de jours) pour ne pas
// surcharger le header.

import React, { useEffect, useState } from 'react';
import { Chip, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { Bolt, WarningAmber } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import subscriptionAPI from '../services/subscriptionAPI';

export default function TrialChip() {
  const navigate = useNavigate();
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
          });
        }
      } catch { /* silencieux : pas de chip si erreur/offline */ }
    })();
    return () => { alive = false; };
  }, []);

  if (!trial) return null;

  const active = trial.days > 0;
  // Mobile : compact (icone + "N j"). Desktop : libelle complet.
  const label = isMobile
    ? (active ? `${trial.days} j` : 'Expiré')
    : (active ? `Essai ${trial.plan} — ${trial.days} j` : `Essai ${trial.plan} expiré`);

  return (
    <Tooltip title={active ? `Essai ${trial.plan} — ${trial.days} jour(s) restant(s)` : 'Essai expiré — gérer votre abonnement'} arrow>
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
