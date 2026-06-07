// Page pont pour la connexion Google depuis l'app mobile native.
//
// Ouverte dans le NAVIGATEUR SYSTEME (Chrome) par l'app via @capacitor/browser.
// Comme c'est un vrai navigateur, le flux Google web est autorise. On recupere
// l'access_token Google puis on redirige vers le deep link procura://auth?token=...
// que l'app capte pour finaliser la connexion.
//
// Cette page n'est utile QUE dans ce contexte (ouverte par l'app). En usage web
// normal elle se contente de proposer le bouton Google.

import React, { useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

const DEEP_LINK = 'procura://auth';

export default function MobileAuthBridge() {
  const [status, setStatus] = useState('idle'); // idle | working | done | error

  const redirectToApp = (params) => {
    const qs = new URLSearchParams(params).toString();
    // Renvoie vers l'app native via le deep link.
    window.location.href = `${DEEP_LINK}?${qs}`;
  };

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setStatus('done');
      redirectToApp({ token: tokenResponse.access_token });
    },
    onError: () => {
      setStatus('error');
      redirectToApp({ error: 'google_login_failed' });
    },
  });

  // Lance automatiquement le flux Google a l'ouverture de la page.
  useEffect(() => {
    setStatus('working');
    login();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: 4,
        background: '#e0e5ec',
      }}
    >
      {status === 'working' && <CircularProgress sx={{ color: '#4285F4' }} />}
      <Typography sx={{ color: '#5a6478', fontWeight: 600, textAlign: 'center' }}>
        {status === 'error'
          ? 'La connexion Google a echoue. Vous pouvez fermer cette fenetre.'
          : 'Connexion avec Google en cours...'}
      </Typography>
      {/* Repli si le lancement auto ne part pas (popup bloquee) */}
      <Button
        startIcon={<GoogleIcon sx={{ color: '#4285F4' }} />}
        onClick={() => { setStatus('working'); login(); }}
        sx={{ textTransform: 'none', color: '#4285F4', fontWeight: 700 }}
      >
        Continuer avec Google
      </Button>
    </Box>
  );
}
