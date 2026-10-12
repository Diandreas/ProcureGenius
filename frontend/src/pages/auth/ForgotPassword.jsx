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
import { useTranslation } from 'react-i18next';

const BG = '#e0e5ec';
const SHADOW_OUT = '12px 12px 30px #b8bec7, -12px -12px 30px #ffffff';
const SHADOW_IN = 'inset 4px 4px 10px #b8bec7, inset -4px -4px 10px #ffffff';
const ACCENT = '#2563eb';

export default function ForgotPassword() {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError(t('auth:forgotPassword.page.emailRequired')); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setDone(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        t('auth:forgotPassword.page.genericError')
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
          {t('auth:forgotPassword.page.title')}
        </Typography>
        <Typography sx={{ color: '#7b8499', mb: 3, fontSize: '0.9rem' }}>
          {t('auth:forgotPassword.page.intro')}
        </Typography>

        {done ? (
          <Alert severity="success" sx={{ borderRadius: '14px', mb: 2,
            background: BG, boxShadow: SHADOW_IN, border: 'none' }}>
            {t('auth:forgotPassword.page.sent')}
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
              fullWidth required type="email" label={t('auth:forgotPassword.page.email')} value={email}
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
              {loading ? <CircularProgress size={22} /> : t('auth:forgotPassword.page.sendLink')}
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link component={RouterLink} to="/login" sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            color: '#7b8499', textDecoration: 'none', fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            <ArrowBack sx={{ fontSize: 16 }} /> {t('auth:forgotPassword.page.backToLogin')}
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
