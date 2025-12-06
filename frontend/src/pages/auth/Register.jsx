/**
 * Register Component
 * Supports both email/password registration and Google OAuth
 */
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuthenticated } from '../../store/slices/authSlice';
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

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

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
    setFormData({
      ...formData,
      [name]: name === 'acceptTerms' ? checked : value,
    });
  };

  const validateForm = () => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Veuillez entrer une adresse email valide');
      return false;
    }

    // Password strength validation
    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    // Terms acceptance
    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions d\'utilisation');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Register via custom API
      const response = await api.post('/auth/register/', {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        organization_name: formData.organizationName,
      });

      // Auto-login: Save the token returned from registration
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        // Store user info if available
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        // Update Redux state to mark user as authenticated
        dispatch(setAuthenticated({
          token: response.data.token,
          user: response.data.user
        }));

        // Redirect to onboarding setup
        if (response.data.requires_onboarding) {
          navigate('/onboarding');
        } else {
          // Fallback: redirect to dashboard if onboarding already completed
          navigate('/dashboard');
        }
      } else {
        // Fallback: show success and redirect to login
        setSuccess(true);
        setTimeout(() => {
          navigate('/login?registered=true');
        }, 2000);
      }

    } catch (err) {
      console.error('Registration error:', err);

      if (err.response?.data) {
        // Handle validation errors from backend
        const errors = err.response.data;
        if (errors.email) {
          setError(Array.isArray(errors.email) ? errors.email[0] : errors.email);
        } else if (errors.password) {
          setError(Array.isArray(errors.password) ? errors.password[0] : errors.password);
        } else if (errors.error) {
          setError(errors.error);
        } else if (errors.non_field_errors) {
          setError(errors.non_field_errors[0]);
        } else {
          setError('Une erreur est survenue lors de l\'inscription');
        }
      } else {
        setError('Impossible de se connecter au serveur. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // Redirect to Django allauth Google OAuth endpoint
    window.location.href = '/accounts/google/login/?process=signup';
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (success) {
    return (
      <Container component="main" maxWidth="sm">
        <Box sx={{ marginTop: 8, textAlign: 'center' }}>
          <Paper elevation={3} sx={{ padding: 4, borderRadius: 3 }}>
            <Mascot pose="celebration" animation="bounce" size={120} />
            <Typography variant="h5" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
              Inscription réussie !
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Un email de confirmation a été envoyé à {formData.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Veuillez vérifier votre boîte de réception et cliquer sur le lien de confirmation.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ mt: 3 }}
            >
              Aller à la page de connexion
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 6,
          marginBottom: 6,
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
          {/* Mascotte */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Mascot pose="happy" animation="float" size={100} />
          </Box>

          {/* Header */}
          <Typography component="h1" variant="h4" align="center" sx={{ mb: 1, fontWeight: 700 }}>
            Créer un compte
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Commencez gratuitement avec ProcureGenius
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Google Sign Up Button */}
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignup}
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
            S'inscrire avec Google
          </Button>

          {/* Divider */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OU
            </Typography>
          </Divider>

          {/* Registration Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* First Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="firstName"
                  label="Prénom"
                  name="firstName"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Last Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label="Nom"
                  name="lastName"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </Grid>

              {/* Email */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Adresse email"
                  name="email"
                  autoComplete="email"
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
              </Grid>

              {/* Organization Name */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="organizationName"
                  label="Nom de l'organisation"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Password */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  helperText="Au moins 8 caractères"
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
              </Grid>

              {/* Confirm Password */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirmer le mot de passe"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={toggleConfirmPasswordVisibility}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Terms & Conditions */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      J'accepte les{' '}
                      <Link href="/terms" target="_blank" sx={{ textDecoration: 'none' }}>
                        conditions d'utilisation
                      </Link>{' '}
                      et la{' '}
                      <Link href="/privacy" target="_blank" sx={{ textDecoration: 'none' }}>
                        politique de confidentialité
                      </Link>
                    </Typography>
                  }
                />
              </Grid>
            </Grid>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Créer mon compte gratuit'}
            </Button>

            {/* Login Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Vous avez déjà un compte ?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  sx={{ textDecoration: 'none', fontWeight: 600 }}
                >
                  Se connecter
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Register;
