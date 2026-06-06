import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Button, CircularProgress, Chip } from '@mui/material';
import { CheckCircle, Rocket } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import subscriptionAPI from '../services/subscriptionAPI';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let redirectTimer;
    const activate = async () => {
      try {
        // Activer l'abonnement de façon synchrone (sans dépendre du webhook)
        if (sessionId) {
          try { await subscriptionAPI.confirmStripeSession(sessionId); } catch { /* le webhook prendra le relais */ }
        }
        const data = await subscriptionAPI.getStatus();
        setStatus(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        // Redirection automatique vers le dashboard après un court instant
        redirectTimer = setTimeout(() => navigate('/dashboard'), 2500);
      }
    };
    activate();
    return () => clearTimeout(redirectTimer);
  }, [sessionId, navigate]);

  const planName = status?.subscription?.plan?.name || 'votre nouveau plan';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Box textAlign="center" sx={{ p: 6, bgcolor: 'white', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          {loading ? (
            <CircularProgress size={64} />
          ) : (
            <>
              <CheckCircle sx={{ fontSize: 80, color: '#10b981', mb: 2 }} />
              <Chip icon={<Rocket />} label="Abonnement activé !" color="success" sx={{ mb: 3, fontWeight: 700, fontSize: 14, px: 1 }} />
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Bienvenue sur {planName} !
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Votre abonnement est maintenant actif. Vous avez accès à toutes les fonctionnalités de votre plan.
              </Typography>
              {sessionId && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
                  Référence : {sessionId.slice(0, 20)}...
                </Typography>
              )}
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/dashboard')}
                sx={{ borderRadius: 2, fontWeight: 700, px: 5, py: 1.5, bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
              >
                Aller au tableau de bord
              </Button>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default SubscriptionSuccess;
