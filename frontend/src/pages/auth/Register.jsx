import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuthenticated, googleLogin, clearError } from '../../store/slices/authSlice';
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { isNativePlatform } from '../../utils/platform';
import { signInWithGoogleNative } from '../../services/mobileGoogleAuth';
import { getAnonId } from '../../services/tracking';

// Sur mobile natif, Google passe par le navigateur systeme (page pont + deep link).
const IS_NATIVE = isNativePlatform();
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Link,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import Mascot from '../../components/Mascot';
import api from '../../services/api';

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

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation(['auth', 'common']);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({ ...formData, [name]: name === 'acceptTerms' ? checked : value });
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    if (!formData.acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await api.post('/auth/register/', {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        organization_name: formData.organizationName,
        anon_id: getAnonId(), // relie la visite anonyme au compte (conversion)
      });
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        if (formData.organizationName) {
          localStorage.setItem('onboarding_company_name', formData.organizationName);
        }
        if (response.data.user) localStorage.setItem('user', JSON.stringify(response.data.user));
        dispatch(setAuthenticated({ token: response.data.token, user: response.data.user }));
        // Nouveau compte : on va DIRECTEMENT a l'onboarding (pas de rebond par
        // le dashboard qui re-verifie ensuite l'etat d'onboarding).
        window.location.replace('/onboarding');
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/login?registered=true'), 2000);
      }
    } catch (err) {
      const errors = err.response?.data;
      if (errors?.email) setError(Array.isArray(errors.email) ? errors.email[0] : errors.email);
      else if (errors?.password) setError(Array.isArray(errors.password) ? errors.password[0] : errors.password);
      else if (errors?.error) setError(errors.error);
      else if (errors?.non_field_errors) setError(errors.non_field_errors[0]);
      else setError("Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  // `arg` = access_token (web) ou { idToken, accessToken } (natif).
  const onGoogleToken = async (arg) => {
    setLoading(true);
    try {
      const payload = await dispatch(googleLogin(arg)).unwrap();
      // Rediriger selon l'etat d'onboarding. window.location (rechargement
      // complet) pour que le check onboarding de App.jsx se rejoue — sinon en
      // SPA on resterait bloque sur le dashboard sans voir l'onboarding.
      const completed = payload?.user?.preferences?.onboarding_completed === true;
      window.location.href = completed ? '/dashboard' : '/onboarding';
    } catch (err) {
      setError(err || t('auth:register.messages.error'));
      setLoading(false);
    }
  };

  const webGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => onGoogleToken(tokenResponse.access_token),
    onError: () => setError(t('auth:register.messages.serverError')),
  });

  // En natif : selecteur Google natif (plugin). En web : flux classique.
  const handleGoogleLogin = async () => {
    if (IS_NATIVE) {
      try {
        const tokens = await signInWithGoogleNative();
        await onGoogleToken(tokens);
      } catch (e) {
        setError(e?.message || t('auth:register.messages.serverError'));
      }
    } else {
      webGoogleLogin();
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Box sx={{ background: BG, borderRadius: '24px', boxShadow: SHADOW_OUT, p: 5, textAlign: 'center', maxWidth: 400 }}>
            <Mascot pose="celebration" animation="bounce" size={120} />
            <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 700, color: '#2d3a5a' }}>
              Inscription réussie !
            </Typography>
            <Typography variant="body1" sx={{ color: '#8a97b5' }}>
              Un email de confirmation a été envoyé à {formData.email}
            </Typography>
          </Box>
        </motion.div>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BG,
        py: 6,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Orbes décoratifs */}
      <Box sx={{
        position: 'absolute', top: '-100px', right: '-80px',
        width: 350, height: 350, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,110,247,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '-120px', left: '-80px',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(130,90,230,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 620, padding: '0 20px', zIndex: 1 }}
      >
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
            <Mascot pose="happy" animation="float" size={90} />
          </motion.div>

          {/* Titre */}
          <motion.div {...fadeUp(0.1)}>
            <Typography component="h1" variant="h5" align="center" sx={{ mb: 0.5, fontWeight: 700, color: '#2d3a5a' }}>
              {t('auth:register.title')}
            </Typography>
            <Typography variant="body2" align="center" sx={{ mb: 3, color: '#8a97b5' }}>
              {t('auth:register.welcome')}
            </Typography>
          </motion.div>

          {/* Erreur */}
          {error && (
            <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
              <Alert
                severity="error"
                onClose={() => setError(null)}
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
          <motion.div {...fadeUp(0.15)}>
            <Button
              fullWidth
              variant="outlined"
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
                '&:active': {
                  boxShadow: SHADOW_IN,
                  transform: 'translateY(0)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {t('auth:login.google')}
            </Button>
          </motion.div>

          {/* Divider */}
          <motion.div {...fadeUp(0.2)}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #c8cfd9)' }} />
              <Typography sx={{ px: 2, color: '#9aa3bb', fontSize: '0.75rem', fontWeight: 600 }}>
                {t('auth:login.or')}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #c8cfd9)' }} />
            </Box>
          </motion.div>

          {/* Formulaire */}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <motion.div {...fadeUp(0.25)}>
                  <TextField
                    required fullWidth
                    id="firstName"
                    label={t('auth:register.firstName')}
                    name="firstName"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ fontSize: 18, color: '#8a97b5' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={neuFieldSx}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6}>
                <motion.div {...fadeUp(0.28)}>
                  <TextField
                    required fullWidth
                    id="lastName"
                    label={t('auth:register.lastName')}
                    name="lastName"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ fontSize: 18, color: '#8a97b5' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={neuFieldSx}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12}>
                <motion.div {...fadeUp(0.31)}>
                  <TextField
                    required fullWidth
                    id="email"
                    label={t('auth:register.email')}
                    name="email"
                    autoComplete="email"
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
              </Grid>

              <Grid item xs={12}>
                <motion.div {...fadeUp(0.34)}>
                  <TextField
                    required fullWidth
                    id="organizationName"
                    label={t('auth:register.companyName')}
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon sx={{ fontSize: 18, color: '#8a97b5' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={neuFieldSx}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6}>
                <motion.div {...fadeUp(0.37)}>
                  <TextField
                    required fullWidth
                    name="password"
                    label={t('auth:register.password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    helperText={t('auth:login.validation.passwordMinLength')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ fontSize: 18, color: '#8a97b5' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPassword(!showPassword)} sx={{ color: '#8a97b5', '&:hover': { color: ACCENT } }}>
                            {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      ...neuFieldSx,
                      '& .MuiFormHelperText-root': { color: '#9aa3bb', fontSize: '0.72rem' },
                    }}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12} sm={6}>
                <motion.div {...fadeUp(0.4)}>
                  <TextField
                    required fullWidth
                    name="confirmPassword"
                    label={t('auth:register.confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ fontSize: 18, color: '#8a97b5' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowConfirmPassword(!showConfirmPassword)} sx={{ color: '#8a97b5', '&:hover': { color: ACCENT } }}>
                            {showConfirmPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={neuFieldSx}
                  />
                </motion.div>
              </Grid>

              <Grid item xs={12}>
                <motion.div {...fadeUp(0.43)}>
                  <Box
                    sx={{
                      background: BG,
                      borderRadius: '12px',
                      boxShadow: SHADOW_IN,
                      px: 2, py: 1.2,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="acceptTerms"
                          checked={formData.acceptTerms}
                          onChange={handleChange}
                          sx={{
                            color: '#b8bec7',
                            '&.Mui-checked': { color: ACCENT },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: '#6b7a99' }}>
                          {t('auth:register.termsAgree')}{' '}
                          <Link component={RouterLink} to="/terms" target="_blank" sx={{ color: ACCENT, textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                            {t('auth:register.termsLink')}
                          </Link>{' '}
                          {t('auth:register.and')}{' '}
                          <Link component={RouterLink} to="/privacy" target="_blank" sx={{ color: ACCENT, textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                            {t('auth:register.privacyLink')}
                          </Link>
                        </Typography>
                      }
                    />
                  </Box>
                </motion.div>
              </Grid>
            </Grid>

            {/* Bouton submit */}
            <motion.div {...fadeUp(0.48)}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 3, mb: 2.5,
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
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Créer mon compte gratuit'}
              </Button>
            </motion.div>

            {/* Lien login */}
            <motion.div {...fadeUp(0.52)}>
              <Typography variant="body2" align="center" sx={{ color: '#8a97b5' }}>
                Vous avez déjà un compte ?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{ color: ACCENT, textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
                >
                  {t('auth:register.signIn')}
                </Link>
              </Typography>
            </motion.div>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}

export default Register;
