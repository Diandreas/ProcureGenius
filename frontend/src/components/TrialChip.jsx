// Petit chip "Essai Pro — N jours" affiche dans le header quand l'organisation
// est en periode d'essai. Cliquable vers la page d'abonnement. Discret : ne
// rend rien si pas d'essai en cours.

import React, { useEffect, useState } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Bolt } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import subscriptionAPI from '../services/subscriptionAPI';

export default function TrialChip() {
  const navigate = useNavigate();
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

  const label = trial.days > 0
    ? `Essai ${trial.plan} — ${trial.days} j`
    : `Essai ${trial.plan} expiré`;

  return (
    <Tooltip title="Gérer votre abonnement" arrow>
      <Chip
        icon={<Bolt sx={{ fontSize: 15 }} />}
        label={label}
        size="small"
        onClick={() => navigate('/subscription/plans')}
        sx={{
          height: 26, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
          bgcolor: trial.days > 0 ? '#fff7e6' : '#fde8e8',
          color: trial.days > 0 ? '#b45309' : '#b91c1c',
          border: '1px solid', borderColor: trial.days > 0 ? '#fcd34d' : '#fca5a5',
          '& .MuiChip-icon': { color: 'inherit' },
        }}
      />
    </Tooltip>
  );
}
