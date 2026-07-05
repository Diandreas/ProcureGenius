// Bannière pleine largeur affichée quand le paiement de l'abonnement a
// échoué (statut Stripe `past_due`). Le webhook `invoice.payment_failed`
// notifie déjà par push, mais un utilisateur qui ne voit pas la notif reste
// sans indice que son accès va bientôt être coupé — cette bannière est le
// filet visible, impossible à manquer, avec un lien direct vers le portail
// de facturation Stripe pour mettre à jour le moyen de paiement.
// Ne rend rien si l'abonnement n'est pas en past_due (silencieux sinon).

import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, alpha, useTheme } from '@mui/material';
import { WarningAmber } from '@mui/icons-material';
import subscriptionAPI from '../services/subscriptionAPI';

export default function PastDueBanner() {
  const theme = useTheme();
  const [isPastDue, setIsPastDue] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await subscriptionAPI.getStatus();
        if (alive) setIsPastDue(data?.subscription?.status === 'past_due');
      } catch {
        /* silencieux : pas de bannière si offline/erreur */
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!isPastDue) return null;

  const handleManage = async () => {
    setOpening(true);
    try {
      await subscriptionAPI.openStripePortal();
    } catch {
      setOpening(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        px: 2,
        py: 1,
        bgcolor: alpha(theme.palette.error.main, 0.1),
        borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
      }}
    >
      <WarningAmber sx={{ fontSize: 18, color: 'error.main' }} />
      <Typography variant="body2" sx={{ color: 'error.dark', fontWeight: 600 }}>
        Le paiement de votre abonnement a échoué. Mettez à jour votre moyen de paiement pour conserver l'accès.
      </Typography>
      <Button
        size="small"
        variant="contained"
        color="error"
        disabled={opening}
        onClick={handleManage}
        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, whiteSpace: 'nowrap' }}
      >
        {opening ? 'Ouverture…' : 'Mettre à jour le paiement'}
      </Button>
    </Box>
  );
}
