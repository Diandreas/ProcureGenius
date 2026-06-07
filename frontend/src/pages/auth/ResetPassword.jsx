// Page "Reinitialiser le mot de passe" : ouverte via le lien email
// /reset-password?token=...&email=... -> POST /auth/reset-password/.

import React, { useState } from 'react';
import { Link as RouterLink, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress,
  Link, InputAdornment, IconButton,
} from '@mui/material';
import { Lock as LockIcon, Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { authAPI } from '../../services/api';

const BG = '#e0e5ec';
const SHADOW_OUT = '12px 12px 30px #b8bec7, -12px -12px 30px #ffffff';
const SHADOW_IN = 'inset 4px 4px 10px #b8bec7, inset -4px -4px 10px #ffffff';
const ACCENT = '#2563eb';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const invalidLink = !token || !email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (pwd.length < 8) { setError('Le mot de passe doit contenir au moins 8 caracteres.'); return; }
    if (pwd !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, token, new_password: pwd });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Lien invalide ou expire.');
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
          Nouveau mot de passe
        </Typography>

        {invalidLink ? (
          <Alert severity="error" sx={{ borderRadius: '14px', mt: 2,
            background: BG, boxShadow: SHADOW_IN, border: 'none' }}>
            Lien invalide. Veuillez refaire une demande depuis "Mot de passe oublie".
          </Alert>
        ) : done ? (
          <Alert severity="success" sx={{ borderRadius: '14px', mt: 2,
            background: BG, boxShadow: SHADOW_IN, border: 'none' }}>
            Mot de passe modifie ! Redirection vers la connexion...
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Typography sx={{ color: '#7b8499', mb: 3, fontSize: '0.9rem' }}>
              Pour le compte <strong>{email}</strong>.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ borderRadius: '14px', mb: 2,
                background: BG, boxShadow: SHADOW_IN, border: 'none' }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth required type={show ? 'text' : 'password'}
              label="Nouveau mot de passe" value={pwd}
              onChange={(e) => setPwd(e.target.value)} autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: ACCENT, fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShow(!show)} edge="end" size="small">
                      {show ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth required type={show ? 'text' : 'password'}
              label="Confirmer le mot de passe" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: ACCENT, fontSize: 20 }} />
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
                textTransform: 'none', '&:active': { boxShadow: SHADOW_IN },
              }}
            >
              {loading ? <CircularProgress size={22} /> : 'Reinitialiser'}
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
