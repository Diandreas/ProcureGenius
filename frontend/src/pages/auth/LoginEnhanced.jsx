import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
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
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { login, googleLogin, clearError } from '../../store/slices/authSlice';
import Mascot from '../../components/Mascot';
import { useTranslation } from 'react-i18next';
import { isNativePlatform } from '../../utils/platform';
import { signInWithGoogleNative } from '../../services/mobileGoogleAuth';

// Sur mobile natif, Google passe par le navigateur systeme (page pont
// /mobile-auth + deep link), car la webview embarquee est bloquee par Google.
const IS_NATIVE = isNativePlatform();

const BG = '#e0e5ec';
const SHADOW_OUT = '12px 12px 30px #b8bec7, -12px -12px 30px #ffffff';
const SHADOW_IN = 'inset 4px 4px 10px #b8bec7, inset -4px -4px 10px #ffffff';
const ACCENT = '#2563eb';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.4, 0, 0.2, 1] },
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

function LoginEnhanced() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const { t } = useTranslation(['auth', 'common']);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login({ username: formData.email, password: formData.password }));
    if (login.fulfilled.match(result)) {
      const user = result.payload.user;
      if (user?.preferences?.onboarding_completed === false) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const checkIfOnboardingNeeded = (userData) => {
    if (userData.preferences?.onboarding_completed === true) return false;
    const organization = userData.organization;
    if (!organization) return true;
    if (!organization.name || organization.name.startsWith('Organization ')) return true;
    if (!userData.first_name || !userData.last_name ||
      userData.first_name === 'User' || userData.last_name === 'User') return true;
    return false;
  };

  // `arg` = access_token (web) ou { idToken, accessToken } (natif).
  const onGoogleToken = async (arg) => {
    const result = await dispatch(googleLogin(arg));
    if (googleLogin.fulfilled.match(result)) {
      const user = result.payload.user;
      if (checkIfOnboardingNeeded(user)) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  // Flux web (navigateur) : popup/redirect Google standard.
  const webGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => onGoogleToken(tokenResponse.access_token),
    onError: () => console.error('Login Failed'),
  });

  // En natif : selecteur Google natif (plugin). En web : flux classique.
  const handleGoogleLogin = async () => {
    if (IS_NATIVE) {
      try {
        const tokens = await signInWithGoogleNative();
        await onGoogleToken(tokens);
      } catch (e) {
        console.error('Google natif:', e?.message || e);
      }
    } else {
      webGoogleLogin();
    }
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
      {/* Orbes décoratifs */}
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
        style={{ width: '100%', maxWidth: 440, padding: '0 20px', zIndex: 1 }}
      >
        {/* Card neumorphique */}
        <Box
          sx={{
            background: BG,
            borderRadius: '24px',
            boxShadow: '20px 20px 50px #b8bec7, -20px -20px 50px #ffffff',
            p: { xs: 3.5, sm: 5 },
            position: 'relative',
          }}
        >
          {/* Badge supérieur */}
          <Box sx={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: ACCENT,
            borderRadius: '20px',
            px: 3, py: 0.6,
            boxShadow: `0 4px 16px ${ACCENT}40`,
            whiteSpace: 'nowrap',
          }}>
            <Typography sx={{ color: 'white', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              ProcureGenius
            </Typography>
          </Box>

          {/* Mascotte */}
          <motion.div {...fadeUp(0.05)} style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 8 }}>
            <Mascot pose={error ? 'error' : 'happy'} animation="float" size={95} />
          </motion.div>

          {/* Titre */}
          <motion.div {...fadeUp(0.12)}>
            <Typography component="h1" variant="h5" align="center" fontWeight={700} sx={{ color: '#2d3a5a', mb: 0.5 }}>
              {t('auth:login.welcomeBack')}
            </Typography>
            <Typography variant="body2" align="center" sx={{ color: '#8a97b5', mb: 3 }}>
              {t('auth:login.subtitle')}
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

          {/* Bouton Google neumorphique */}
          <motion.div {...fadeUp(0.18)}>
            <Button
              fullWidth
              size="large"
              startIcon={<GoogleIcon sx={{ color: '#4285F4' }} />}
              onClick={handleGoogleLogin}
              sx={{
                mb: 3, py: 1.4,
                borderRadius: '14px',
                background: BG,
                boxShadow: SHADOW_OUT,
                border: 'none',
                color: '#4285F4',
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.95rem',
                '&:hover': {
                  background: BG,
                  boxShadow: '10px 10px 26px #b0b7c3, -10px -10px 26px #ffffff',
                  transform: 'translateY(-2px)',
                  border: 'none',
                },
                '&:active': { boxShadow: SHADOW_IN, transform: 'translateY(0)' },
                transition: 'all 0.2s ease',
              }}
            >
              {t('auth:login.google')}
            </Button>
          </motion.div>

          {/* Divider */}
          <motion.div {...fadeUp(0.24)}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #c8cfd9)' }} />
              <Typography sx={{ px: 2, color: '#9aa3bb', fontSize: '0.75rem', fontWeight: 600 }}>
                {t('auth:login.or')}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #c8cfd9)' }} />
            </Box>
          </motion.div>

          {/* Formulaire */}
          <Box component="form" onSubmit={handleSubmit}>
            <motion.div {...fadeUp(0.3)}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label={t('auth:login.email')}
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
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

            <motion.div {...fadeUp(0.36)}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label={t('auth:login.password')}
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
                  {t('auth:login.forgotPassword')}
                </Link>
              </Box>
            </motion.div>

            {/* Bouton connexion */}
            <motion.div {...fadeUp(0.45)}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 1.5, mb: 2.5,
                  py: 1.5,
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  background: ACCENT,
                  boxShadow: `6px 6px 16px #b8bec7, -4px -4px 12px #ffffff, 0 4px 20px ${ACCENT}35`,
                  border: 'none',
                  color: 'white',
                  '&:hover': {
                    background: '#1d4ed8',
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
                {loading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('auth:login.signIn')}
              </Button>
            </motion.div>

            {/* Liens bas */}
            <motion.div {...fadeUp(0.5)}>
              <Typography variant="body2" align="center" sx={{ color: '#8a97b5' }}>
                {t('auth:login.noAccount')}{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  sx={{ color: ACCENT, fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {t('auth:login.signUp')}
                </Link>
              </Typography>
            </motion.div>

            <motion.div {...fadeUp(0.54)}>
              <Typography variant="body2" align="center" sx={{ mt: 1.5, color: '#b0b8cc', fontSize: '0.78rem' }}>
                <Link
                  component={RouterLink}
                  to="/pricing"
                  sx={{ color: '#b0b8cc', textDecoration: 'none', '&:hover': { color: ACCENT } }}
                >
                  {t('auth:login.viewPricing')}
                </Link>
              </Typography>
            </motion.div>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}

export default LoginEnhanced;
