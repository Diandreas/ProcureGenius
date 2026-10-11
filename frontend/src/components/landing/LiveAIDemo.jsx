import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Avatar, Box, Button, Chip, Dialog, DialogContent, IconButton, InputBase, Stack, Typography, useTheme,
} from '@mui/material';
import { ArrowForward, CheckCircle, Close, Send, SmartToy } from '@mui/icons-material';
import api from '../../services/api';
import { getAnonId, trackVisit } from '../../services/tracking';
import { saveDemoInvoice } from '../../utils/demoInvoiceDraft';
import DemoInvoiceCard from './DemoInvoiceCard';

/**
 * Démo interactive de l'assistant, sans compte : le visiteur interroge l'IA sur
 * les données d'une entreprise fictive (voir apps/ai_assistant/public_demo.py).
 * Quelques questions par jour ; ensuite, invitation à créer un compte.
 */
export default function LiveAIDemo({ variant = 'section' }) {
  const enHaut = variant === 'hero'; // en haut de la page d'accueil
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [messages, setMessages] = useState([]);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [restant, setRestant] = useState(null);
  const [bloque, setBloque] = useState(false);
  const [suites, setSuites] = useState([]);
  const [facture, setFacture] = useState(null); // dernière facture préparée
  const [porte, setPorte] = useState(null); // action demandée -> fenêtre « créez votre compte »
  const fil = useRef(null);
  const premiereQuestion = useRef(true);

  const suggestions = t('liveDemo.suggestions', { returnObjects: true });
  const listeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  useEffect(() => {
    if (fil.current) fil.current.scrollTop = fil.current.scrollHeight;
  }, [messages, enCours]);

  const poser = async (texte) => {
    const question = (texte || '').trim();
    if (!question || enCours || bloque) return;
    if (premiereQuestion.current) {
      premiereQuestion.current = false;
      trackVisit('/demo-ia'); // mesure : combien de visiteurs essaient l'IA
    }
    const historique = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setSaisie('');
    setSuites([]);
    setEnCours(true);
    try {
      const { data } = await api.post('/ai/public-demo/', {
        message: question, anon_id: getAnonId(), history: historique,
      });
      setMessages((m) => [...m, { role: 'assistant', text: data.reply, invoice: data.invoice_preview || null }]);
      if (data.invoice_preview) {
        setFacture(data.invoice_preview);
        saveDemoInvoice(data.invoice_preview); // retrouvée dans le compte après l'inscription
        trackVisit('/demo-ia/facture');
      }
      setSuites(Array.isArray(data.suggested_followups) ? data.suggested_followups : []);
      if (typeof data.remaining === 'number') {
        setRestant(data.remaining);
        if (data.remaining <= 0) setBloque(true);
      }
    } catch (err) {
      const limite = err?.response?.status === 429;
      if (limite) setBloque(true);
      setMessages((m) => [...m, {
        role: 'info',
        text: limite ? t('liveDemo.limit') : t('liveDemo.error'),
      }]);
    } finally {
      setEnCours(false);
    }
  };

  const bulle = (role) => ({
    p: 1.5,
    borderRadius: role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    bgcolor: role === 'user' ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
    border: role === 'user' ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
    color: role === 'user' ? '#fff' : (isDark ? '#fff' : '#0f172a'),
    fontSize: '0.85rem',
    lineHeight: 1.55,
    '& p': { m: 0 },
    '& p + p, & ul, & ol, & table': { mt: 1 },
    '& ul, & ol': { pl: 2.5, mb: 0 },
    '& table': { borderCollapse: 'collapse', fontSize: '0.78rem', display: 'block', overflowX: 'auto' },
    '& th, & td': { border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`, px: 0.75, py: 0.25 },
  });

  const aRepondu = messages.some((m) => m.role === 'assistant');

  const ouvrirPorte = (action) => {
    setPorte(action);
    trackVisit(`/demo-ia/facture/${action}`);
  };
  const versCompte = (chemin) => {
    if (facture) saveDemoInvoice(facture);
    navigate(`${chemin}?from=demo-invoice`);
  };
  const montantTotal = facture
    ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(facture.total))} ${['XAF', 'XOF'].includes(facture.currency) ? 'FCFA' : facture.currency}`
    : '';

  return (
    <Box sx={{
      bgcolor: isDark ? '#16223b' : '#ffffff',
      borderRadius: 4, p: { xs: 2, sm: 2.5 }, maxWidth: enHaut ? 580 : 520, mx: 'auto',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      boxShadow: isDark ? '0 30px 60px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* En-tête */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1.5, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#2563eb' }}>
          <SmartToy sx={{ fontSize: 16 }} />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: isDark ? '#fff' : '#0f172a', fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
            {t('liveDemo.title')}
          </Typography>
          <Typography sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: '0.7rem' }}>
            {t('liveDemo.company')}
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
          <Typography sx={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 600 }}>{t('liveDemo.live')}</Typography>
        </Box>
      </Box>

      {/* Fil de la conversation */}
      <Box ref={fil} sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minHeight: enHaut ? 240 : 220, maxHeight: facture ? 560 : (enHaut ? 400 : 360), overflowY: 'auto', pr: 0.5 }}>
        <Box sx={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
          <Box sx={bulle('assistant')}>{t('liveDemo.intro')}</Box>
        </Box>

        {messages.map((m, i) => (
          <Box key={i} sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: m.invoice ? '100%' : '90%', width: m.invoice ? '100%' : 'auto' }}>
            {m.role === 'assistant' ? (
              <>
                <Box sx={bulle('assistant')}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </Box>
                {m.invoice && (
                  <Box sx={{ mt: 1 }}>
                    <DemoInvoiceCard invoice={m.invoice} onLocked={ouvrirPorte} />
                  </Box>
                )}
              </>
            ) : m.role === 'info' ? (
              <Box sx={{ ...bulle('assistant'), borderLeft: '3px solid #f59e0b' }}>{m.text}</Box>
            ) : (
              <Box sx={bulle('user')}>{m.text}</Box>
            )}
          </Box>
        ))}

        {enCours && (
          <Box sx={{ display: 'flex', gap: '4px', pl: 1, py: 1 }} aria-label={t('liveDemo.thinking')}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{
                width: 6, height: 6, borderRadius: '50%', bgcolor: '#2563eb',
                animation: 'liveDemoBlink 1.4s infinite', animationDelay: `${i * 0.2}s`,
                '@keyframes liveDemoBlink': { '0%,80%,100%': { opacity: 0.2 }, '40%': { opacity: 1 } },
              }} />
            ))}
          </Box>
        )}
      </Box>

      {/* Questions suggérées (au départ) ou de relance (après une réponse) */}
      {!bloque && !enCours && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
          {(aRepondu && suites.length ? suites : (aRepondu ? [] : listeSuggestions)).map((s, i) => {
            // Au départ, la première suggestion (faire une facture) est mise en avant
            const vedette = !aRepondu && i === 0;
            return (
              <Chip
                key={s} label={s} size="small" clickable onClick={() => poser(s)}
                sx={{
                  fontSize: vedette ? '0.8rem' : '0.75rem', height: 'auto', py: vedette ? 0.75 : 0.5,
                  fontWeight: vedette ? 700 : 400, width: vedette ? '100%' : 'auto',
                  '& .MuiChip-label': { whiteSpace: 'normal' },
                  ...(vedette
                    ? { bgcolor: '#2563eb', color: '#fff', border: '1px solid #2563eb', '&:hover': { bgcolor: '#1d4ed8 !important' } }
                    : {
                      bgcolor: isDark ? 'rgba(37,99,235,0.18)' : 'rgba(37,99,235,0.07)',
                      color: isDark ? '#93c5fd' : '#1d4ed8',
                      border: `1px solid ${isDark ? 'rgba(37,99,235,0.35)' : 'rgba(37,99,235,0.2)'}`,
                    }),
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Après une réponse (ou une fois les essais épuisés) : passer à ses propres données */}
      {(aRepondu || bloque) && (
        <Button
          fullWidth variant="contained" disableElevation endIcon={<ArrowForward />}
          onClick={() => (facture ? ouvrirPorte('cta') : navigate('/register'))}
          sx={{
            mt: 1.5, textTransform: 'none', fontWeight: 700, borderRadius: 2,
            bgcolor: '#f59e0b', color: '#0f172a', '&:hover': { bgcolor: '#d97706' },
          }}
        >
          {facture ? t('liveDemo.ctaInvoice') : t('liveDemo.cta')}
        </Button>
      )}

      {/* Saisie libre */}
      {!bloque && (
        <Box
          component="form"
          onSubmit={(e) => { e.preventDefault(); poser(saisie); }}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, pl: 1.5, pr: 0.5, py: 0.25,
            borderRadius: 3, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
          }}
        >
          <InputBase
            value={saisie}
            onChange={(e) => setSaisie(e.target.value.slice(0, 300))}
            placeholder={t('liveDemo.placeholder')}
            disabled={enCours}
            sx={{ flex: 1, fontSize: '0.85rem', color: isDark ? '#fff' : '#0f172a' }}
            inputProps={{ 'aria-label': t('liveDemo.placeholder'), maxLength: 300 }}
          />
          <IconButton type="submit" size="small" disabled={enCours || !saisie.trim()} sx={{ color: '#2563eb' }} aria-label={t('liveDemo.send')}>
            <Send fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Typography sx={{ mt: 1, fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', textAlign: 'center' }}>
        {restant !== null && !bloque
          ? t('liveDemo.remaining', { count: restant })
          : t('liveDemo.disclaimer')}
      </Typography>

      {/* Fenêtre « votre facture est prête » : créer son compte pour la récupérer */}
      <Dialog open={Boolean(porte)} onClose={() => setPorte(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, m: 2 } }}>
        <DialogContent sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative' }}>
          <IconButton onClick={() => setPorte(null)} size="small" sx={{ position: 'absolute', top: 8, right: 8 }} aria-label={t('liveDemo.gate.close')}>
            <Close fontSize="small" />
          </IconButton>
          <Typography sx={{ fontWeight: 900, fontSize: '1.25rem', pr: 3, mb: 0.5 }}>
            {t(`liveDemo.gate.title_${porte === 'whatsapp' ? 'whatsapp' : porte === 'pdf' ? 'pdf' : 'save'}`)}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', mb: 2 }}>
            {t('liveDemo.gate.subtitle', { client: facture?.client?.name || '', total: montantTotal })}
          </Typography>
          <Stack spacing={1} mb={2.5}>
            {(t('liveDemo.gate.points', { returnObjects: true }) || []).map((p) => (
              <Stack key={p} direction="row" spacing={1} alignItems="flex-start">
                <CheckCircle sx={{ fontSize: 18, color: '#10b981', mt: '2px' }} />
                <Typography sx={{ fontSize: '0.88rem' }}>{p}</Typography>
              </Stack>
            ))}
          </Stack>
          <Button fullWidth size="large" variant="contained" disableElevation endIcon={<ArrowForward />}
            onClick={() => versCompte('/register')}
            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2, py: 1.3, bgcolor: '#f59e0b', color: '#0f172a', '&:hover': { bgcolor: '#d97706' } }}>
            {t('liveDemo.gate.primary')}
          </Button>
          <Typography sx={{ textAlign: 'center', fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
            {t('liveDemo.gate.reassure')}
          </Typography>
          <Button fullWidth onClick={() => versCompte('/login')} sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}>
            {t('liveDemo.gate.login')}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
