// Page "Mot de passe oublie" : saisie de l'email -> le backend envoie un lien
// de reinitialisation (POST /auth/forgot-password/). Pour des raisons de
// securite, le backend repond toujours pareil que l'email existe ou non.

import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress,
  Link, InputAdornment,
} from '@mui/material';
import { Email as EmailIcon, ArrowBack } from '@mui/icons-material';
import { authAPI } from '../../services/api';

const BG = '#e0e5ec';
const SHADOW_OUT = '12px 12px 30px #b8bec7, -12px -12px 30px #ffffff';
const SHADOW_IN = 'inset 4px 4px 10px #b8bec7, inset -4px -4px 10px #ffffff';
const ACCENT = '#2563eb';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Veuillez saisir votre email.'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setDone(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        "Une erreur est survenue. Veuillez reessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: BG, p: 3,
    }}>
      <Box sx={{
        width: '100%', maxWidth: 420, p: 4, borderRadius: '24px',
        background: BG, boxShadow: SHADOW_OUT,
      }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#2c3344', mb: 1 }}>
          Mot de passe oublie
        </Typography>
        <Typography sx={{ color: '#7b8499', mb: 3, fontSize: '0.9rem' }}>
          Saisissez votre email : nous vous enverrons un lien pour reinitialiser
          votre mot de passe.
        </Typography>

        {done ? (
          <Alert severity="success" sx={{ borderRadius: '14px', mb: 2,
            background: BG, boxShadow: SHADOW_IN, border: 'none' }}>
            Si un compte existe avec cet email, un lien de reinitialisation vient
            d'etre envoye. Pensez a verifier vos spams.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: '14px', mb: 2,
                background: BG, boxShadow: SHADOW_IN, border: 'none' }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth required type="email" label="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: ACCENT, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit" fullWidth size="large" disabled={loading}
              sx={{
                py: 1.4, borderRadius: '14px', background: BG,
                boxShadow: SHADOW_OUT, color: ACCENT, fontWeight: 700,
                textTransform: 'none',
                '&:active': { boxShadow: SHADOW_IN },
              }}
            >
              {loading ? <CircularProgress size={22} /> : 'Envoyer le lien'}
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link component={RouterLink} to="/login" sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            color: '#7b8499', textDecoration: 'none', fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            <ArrowBack sx={{ fontSize: 16 }} /> Retour a la connexion
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
