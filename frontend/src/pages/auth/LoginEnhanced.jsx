/**
 * Enhanced Login Component
 * Supports both email/password and Google OAuth authentication
 */
import React, { useState } from 'react';
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
import { login, clearError } from '../../store/slices/authSlice';
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
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to Django allauth Google OAuth endpoint
    // The user will be redirected back to /accounts/google/login/callback/
    // and allauth will handle the rest
    window.location.href = '/accounts/google/login/';
  };

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
            Bienvenue !
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Connectez-vous à votre compte ProcureGenius
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
            Se connecter avec Google
          </Button>

          {/* Divider */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OU
            </Typography>
          </Divider>

          {/* Email/Password Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Adresse email"
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
              label="Mot de passe"
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
                Mot de passe oublié ?
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
              {loading ? <CircularProgress size={24} /> : 'Se connecter'}
            </Button>

            {/* Sign Up Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Pas encore de compte ?{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  sx={{ textDecoration: 'none', fontWeight: 600 }}
                >
                  Créer un compte
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
                  Voir les plans tarifaires
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
