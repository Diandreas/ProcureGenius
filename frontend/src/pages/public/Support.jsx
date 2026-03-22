import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Container, Typography, Paper, Grid, useTheme, Button, alpha,
  TextField, Alert, CircularProgress, Divider,
} from '@mui/material';
import { Email, WhatsApp, YouTube, SupportAgent, Send, CheckCircle } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ReCAPTCHA from 'react-google-recaptcha';
import api from '../../services/api';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

export default function PublicSupport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t } = useTranslation(['public']);
  const recaptchaRef = useRef(null);

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    document.title = `${t('public:support.title')} | Procura`;
  }, [t]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      setFormError(t('public:support.form.recaptchaRequired'));
      return;
    }

    setSending(true);
    try {
      await api.post('/contact/', {
        ...form,
        recaptcha_token: recaptchaToken,
      });
      setSuccess(true);
      setForm({ name: '', email: '', subject: '', message: '' });
      recaptchaRef.current?.reset();
    } catch (err) {
      const msg = err.response?.data?.error || t('public:support.form.errorTitle');
      setFormError(msg);
      recaptchaRef.current?.reset();
    } finally {
      setSending(false);
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
    },
  };

  return (
    <Box sx={{ width: '100%', py: { xs: 8, md: 12 }, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Box sx={{ textAlign: 'center', mb: 8, maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 'full', bgcolor: alpha('#2563eb', 0.1), color: '#2563eb', mb: 3 }}>
              <SupportAgent fontSize="small" />
              <Typography variant="body2" fontWeight="bold">{t('public:support.badge')}</Typography>
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 800, mb: 3, fontSize: { xs: '2.5rem', md: '3.5rem' }, letterSpacing: '-0.02em' }}>
              {t('public:support.title')}
            </Typography>
            <Typography sx={{ fontSize: '1.2rem', color: isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
              {t('public:support.intro')}
            </Typography>
          </Box>
        </motion.div>

        <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: 1000, mx: 'auto' }}>
          {/* Email */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <Paper sx={{ p: { xs: 4, md: 5 }, height: '100%', borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, boxShadow: isDark ? 'none' : '0 20px 40px rgba(0,0,0,0.04)', '&:hover': { borderColor: '#2563eb', transform: 'translateY(-4px)' }, transition: 'all 0.3s ease' }}>
                <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: alpha('#2563eb', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <Email sx={{ fontSize: 32, color: '#2563eb' }} />
                </Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>{t('public:support.email.title')}</Typography>
                <Typography color="text.secondary" sx={{ mb: 4, minHeight: 48, fontSize: '1rem', lineHeight: 1.6 }}>
                  {t('public:support.email.desc')}
                </Typography>
                <Button href="mailto:report.makeitreal@gmail.com" variant="outlined" fullWidth size="large"
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', color: isDark ? '#fff' : 'text.primary', '&:hover': { borderColor: '#2563eb', bgcolor: alpha('#2563eb', 0.05) } }}>
                  report.makeitreal@gmail.com
                </Button>
              </Paper>
            </motion.div>
          </Grid>

          {/* WhatsApp */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Paper sx={{ p: { xs: 4, md: 5 }, height: '100%', borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, boxShadow: isDark ? 'none' : '0 20px 40px rgba(0,0,0,0.04)', '&:hover': { borderColor: '#10b981', transform: 'translateY(-4px)' }, transition: 'all 0.3s ease' }}>
                <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: alpha('#10b981', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                  <WhatsApp sx={{ fontSize: 32, color: '#10b981' }} />
                </Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>{t('public:support.whatsapp.title')}</Typography>
                <Typography color="text.secondary" sx={{ mb: 4, minHeight: 48, fontSize: '1rem', lineHeight: 1.6 }}>
                  {t('public:support.whatsapp.desc')}
                </Typography>
                <Button href="https://wa.me/237693427913" target="_blank" variant="contained" fullWidth size="large"
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#10b981', color: '#fff', '&:hover': { bgcolor: '#059669' }, boxShadow: '0 8px 16px rgba(16,185,129,0.2)' }}>
                  Discuter: +237 693 427 913
                </Button>
              </Paper>
            </motion.div>
          </Grid>

          {/* Contact Form */}
          <Grid item xs={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              <Paper sx={{ p: { xs: 4, md: 6 }, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, boxShadow: isDark ? 'none' : '0 20px 40px rgba(0,0,0,0.04)' }}>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>{t('public:support.form.title')}</Typography>
                  <Typography color="text.secondary">{t('public:support.form.subtitle')}</Typography>
                </Box>

                {success ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <CheckCircle sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>{t('public:support.form.successTitle')}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 4 }}>{t('public:support.form.successDesc')}</Typography>
                    <Button variant="outlined" onClick={() => setSuccess(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
                      Envoyer un autre message
                    </Button>
                  </Box>
                ) : (
                  <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label={t('public:support.form.name')}
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          fullWidth
                          sx={inputSx}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label={t('public:support.form.email')}
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                          fullWidth
                          sx={inputSx}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label={t('public:support.form.subject')}
                          name="subject"
                          value={form.subject}
                          onChange={handleChange}
                          required
                          fullWidth
                          sx={inputSx}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label={t('public:support.form.message')}
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          required
                          fullWidth
                          multiline
                          rows={5}
                          placeholder={t('public:support.form.messagePlaceholder')}
                          sx={inputSx}
                        />
                      </Grid>

                      {/* reCAPTCHA */}
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={RECAPTCHA_SITE_KEY}
                            theme={isDark ? 'dark' : 'light'}
                          />
                        </Box>
                      </Grid>

                      {formError && (
                        <Grid item xs={12}>
                          <Alert severity="error" sx={{ borderRadius: 2 }}>{formError}</Alert>
                        </Grid>
                      )}

                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={sending}
                          startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send />}
                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, boxShadow: '0 8px 16px rgba(37,99,235,0.25)', px: 4 }}
                        >
                          {sending ? t('public:support.form.sending') : t('public:support.form.submit')}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Paper>
            </motion.div>
          </Grid>

          {/* YouTube */}
          <Grid item xs={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <Paper sx={{ p: { xs: 4, md: 5 }, borderRadius: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 4, bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: alpha('#ef4444', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <YouTube sx={{ fontSize: 40, color: '#ef4444' }} />
                </Box>
                <Box sx={{ flexGrow: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>{t('public:support.youtube.title')}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: '1rem', lineHeight: 1.6 }}>
                    {t('public:support.youtube.desc')}
                    <Box component="span" sx={{ fontWeight: 'bold', color: 'text.primary', ml: 1 }}>{t('public:support.youtube.comingSoon')}</Box>
                  </Typography>
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
