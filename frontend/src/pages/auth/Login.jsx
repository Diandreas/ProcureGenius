import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { login, clearError } from '../../store/slices/authSlice';
import Mascot from '../../components/Mascot';
import { useTranslation } from 'react-i18next';

const BG = '#e0e5ec';
const SHADOW_OUT = '8px 8px 20px #b8bec7, -8px -8px 20px #ffffff';
const SHADOW_IN = 'inset 4px 4px 10px #b8bec7, inset -4px -4px 10px #ffffff';
const ACCENT = '#2563eb';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] },
});

const neuFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: BG,
    boxShadow: SHADOW_IN,
    color: '#3d4a6b',
    '& fieldset': { border: 'none' },
    '&:hover fieldset': { border: 'none' },
    '&.Mui-focused fieldset': { border: 'none' },
    '&.Mui-focused': {
      boxShadow: `inset 3px 3px 8px #b8bec7, inset -3px -3px 8px #ffffff, 0 0 0 2px ${ACCENT}40`,
    },
  },
  '& .MuiInputLabel-root': { color: '#8a97b5', fontWeight: 500 },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
};

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const { t } = useTranslation(['auth', 'common']);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(formData));
    if (login.fulfilled.match(result)) navigate('/dashboard');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BG,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Orbes décoratifs doux */}
      <Box sx={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,110,247,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '-150px', left: '-100px',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(130,90,230,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 420, padding: '0 20px', zIndex: 1 }}
      >
        {/* Card neumorphique */}
        <Box
          sx={{
            background: BG,
            borderRadius: '24px',
            boxShadow: '16px 16px 40px #b8bec7, -16px -16px 40px #ffffff',
            p: { xs: 3.5, sm: 5 },
            position: 'relative',
          }}
        >
          {/* Badge supérieur */}
          <Box sx={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: `linear-gradient(135deg, ${ACCENT}, #7c5cbf)`,
            borderRadius: '20px',
            px: 3, py: 0.6,
            boxShadow: `0 4px 16px ${ACCENT}40`,
          }}>
            <Typography sx={{ color: 'white', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              ProcureGenius
            </Typography>
          </Box>

          {/* Mascotte */}
          <motion.div {...fadeUp(0.05)} style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 8 }}>
            <Mascot pose={error ? 'error' : 'happy'} animation="float" size={90} />
          </motion.div>

          {/* Titre */}
          <motion.div {...fadeUp(0.15)}>
            <Typography variant="h5" align="center" fontWeight={700} sx={{ color: '#2d3a5a', mb: 0.5 }}>
              {t('auth:login.title', 'Bon retour !')}
            </Typography>
            <Typography variant="body2" align="center" sx={{ color: '#8a97b5', mb: 3 }}>
              Connectez-vous à votre compte
            </Typography>
          </motion.div>

          {/* Erreur */}
          {error && (
            <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
              <Alert
                severity="error"
                onClose={() => dispatch(clearError())}
                sx={{
                  mb: 2, borderRadius: 2,
                  background: '#fde8e8',
                  boxShadow: 'inset 2px 2px 6px #e8c5c5, inset -2px -2px 6px #fff',
                  border: 'none', color: '#c0392b',
                  '& .MuiAlert-icon': { color: '#e74c3c' },
                }}
              >
                {error}
              </Alert>
            </motion.div>
          )}

          {/* Formulaire */}
          <Box component="form" onSubmit={handleSubmit}>
            <motion.div {...fadeUp(0.25)}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label={t('auth:login.username', 'Identifiant')}
                name="username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ fontSize: 18, color: '#8a97b5' }} />
                    </InputAdornment>
                  ),
                }}
                sx={neuFieldSx}
              />
            </motion.div>

            <motion.div {...fadeUp(0.35)}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label={t('auth:login.password', 'Mot de passe')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ fontSize: 18, color: '#8a97b5' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ color: '#8a97b5', '&:hover': { color: ACCENT } }}
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={neuFieldSx}
              />
            </motion.div>

            {/* Mot de passe oublié */}
            <motion.div {...fadeUp(0.4)}>
              <Box sx={{ textAlign: 'right', mt: 0.5, mb: 1 }}>
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  sx={{ color: ACCENT, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Mot de passe oublié ?
                </Link>
              </Box>
            </motion.div>

            {/* Bouton connexion neumorphique */}
            <motion.div {...fadeUp(0.45)}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 1.5, mb: 2.5,
                  py: 1.5,
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  background: `linear-gradient(135deg, ${ACCENT} 0%, #7c5cbf 100%)`,
                  boxShadow: `6px 6px 16px #b8bec7, -4px -4px 12px #ffffff, 0 4px 20px ${ACCENT}35`,
                  border: 'none',
                  color: 'white',
                  '&:hover': {
                    background: `linear-gradient(135deg, #3d5ce0 0%, #6a4baa 100%)`,
                    boxShadow: `8px 8px 20px #b0b7c3, -4px -4px 12px #ffffff, 0 6px 24px ${ACCENT}45`,
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: `inset 3px 3px 8px rgba(0,0,0,0.15), 0 2px 8px ${ACCENT}30`,
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('auth:login.loginButton', 'Se connecter')}
              </Button>
            </motion.div>

            {/* Divider neumorphique */}
            <motion.div {...fadeUp(0.5)}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #c8cfd9)' }} />
                <Typography sx={{ px: 2, color: '#9aa3bb', fontSize: '0.75rem', fontWeight: 600 }}>OU</Typography>
                <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #c8cfd9)' }} />
              </Box>
            </motion.div>

            {/* Lien inscription */}
            <motion.div {...fadeUp(0.55)}>
              <Typography variant="body2" align="center" sx={{ color: '#8a97b5' }}>
                Pas encore de compte ?{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  sx={{ color: ACCENT, fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Créer un compte
                </Link>
              </Typography>
            </motion.div>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}

export default Login;
