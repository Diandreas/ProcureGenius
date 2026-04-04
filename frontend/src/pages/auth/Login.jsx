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
import { alpha } from '@mui/material/styles';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { login, clearError } from '../../store/slices/authSlice';
import Mascot from '../../components/Mascot';
import { useTranslation } from 'react-i18next';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.4, 0, 0.2, 1] },
});

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
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      }}
    >
      {/* Orbs décoratifs animés */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute', bottom: '-15%', left: '-8%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.15, 0.08] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        style={{
          position: 'absolute', top: '40%', left: '30%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Card principale */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 420, padding: '0 16px', zIndex: 1 }}
      >
        <Box
          sx={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
            p: { xs: 3, sm: 4 },
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            },
          }}
        >
          {/* Mascotte */}
          <motion.div {...fadeUp(0.1)} style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <Mascot pose={error ? 'error' : 'happy'} animation="float" size={90} />
          </motion.div>

          {/* Titre */}
          <motion.div {...fadeUp(0.2)}>
            <Typography
              variant="h5"
              align="center"
              fontWeight={700}
              sx={{ color: 'white', mb: 0.5 }}
            >
              {t('auth:login.title', 'Bienvenue')}
            </Typography>
            <Typography variant="body2" align="center" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
              Connectez-vous à votre espace ProcureGenius
            </Typography>
          </motion.div>

          {/* Erreur */}
          {error && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
              <Alert
                severity="error"
                sx={{ mb: 2, borderRadius: 2, bgcolor: alpha('#ef4444', 0.15), color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', '& .MuiAlert-icon': { color: '#fca5a5' } }}
                onClose={() => dispatch(clearError())}
              >
                {error}
              </Alert>
            </motion.div>
          )}

          {/* Formulaire */}
          <Box component="form" onSubmit={handleSubmit}>
            <motion.div {...fadeUp(0.3)}>
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
                      <EmailIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }} />
                    </InputAdornment>
                  ),
                }}
                sx={fieldSx}
              />
            </motion.div>

            <motion.div {...fadeUp(0.4)}>
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
                      <LockIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'rgba(255,255,255,0.7)' } }}
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={fieldSx}
              />
            </motion.div>

            <motion.div {...fadeUp(0.5)}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 3, mb: 2,
                  py: 1.4,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                    boxShadow: '0 12px 32px rgba(59,130,246,0.5)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('auth:login.loginButton', 'Se connecter')}
              </Button>
            </motion.div>

            <motion.div {...fadeUp(0.6)}>
              <Typography variant="body2" align="center" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                Pas encore de compte ?{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  sx={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
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

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    color: 'white',
    bgcolor: 'rgba(255,255,255,0.06)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#60a5fa' },
};

export default Login;
