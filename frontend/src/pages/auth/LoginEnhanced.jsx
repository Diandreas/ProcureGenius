/**
 * Enhanced Login Component
 * Supports both email/password and Google OAuth authentication
 */
import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Divider,
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

function LoginEnhanced() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const { t } = useTranslation(['auth', 'common']);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login({
      username: formData.email,
      password: formData.password
    }));
    if (login.fulfilled.match(result)) {
      // Force full page reload to ensure all state is initialized properly
      // This ensures ModuleContext loads correct modules and menu updates
      const user = result.payload.user;
      const onboardingCompleted = user?.preferences?.onboarding_completed;

      if (onboardingCompleted === false) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const result = await dispatch(googleLogin(tokenResponse.access_token));
      if (googleLogin.fulfilled.match(result)) {
        const user = result.payload.user;
        const onboardingCompleted = user?.preferences?.onboarding_completed;

        if (onboardingCompleted === false) {
          window.location.href = '/onboarding';
        } else {
          window.location.href = '/dashboard';
        }
      }
    },
    onError: () => {
      console.error('Login Failed');
    },
  });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            position: 'relative',
            overflow: 'visible',
            borderRadius: 3,
          }}
        >
          {/* Mascotte animée */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Mascot
              pose={error ? 'error' : 'happy'}
              animation="float"
              size={100}
            />
          </Box>

          {/* Header */}
          <Typography component="h1" variant="h4" align="center" sx={{ mb: 1, fontWeight: 700 }}>
            {t('auth:login.welcomeBack')}
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            {t('auth:login.subtitle')}
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
              {error}
            </Alert>
          )}

          {/* Google Sign In Button */}
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{
              mb: 2,
              py: 1.5,
              borderColor: '#4285F4',
              color: '#4285F4',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              '&:hover': {
                borderColor: '#4285F4',
                backgroundColor: 'rgba(66, 133, 244, 0.04)',
              },
            }}
          >
            {t('auth:login.google')}
          </Button>

          {/* Divider */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {t('auth:login.or')}
            </Typography>
          </Divider>

          {/* Email/Password Form */}
          <Box component="form" onSubmit={handleSubmit}>
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
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
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
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={togglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                sx={{ textDecoration: 'none' }}
              >
                {t('auth:login.forgotPassword')}
              </Link>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('auth:login.signIn')}
            </Button>

            {/* Sign Up Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('auth:login.noAccount')}{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  sx={{ textDecoration: 'none', fontWeight: 600 }}
                >
                  {t('auth:login.signUp')}
                </Link>
              </Typography>
            </Box>

            {/* Pricing Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <Link
                  component={RouterLink}
                  to="/pricing"
                  sx={{ textDecoration: 'none' }}
                >
                  {t('auth:login.viewPricing')}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default LoginEnhanced;
