import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLocation, useNavigate } from 'react-router-dom';
import { normalizeMarkdown } from '../ai-chat/markdownUtils';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  TextField,
  Stack,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  alpha,
  useTheme,
} from '@mui/material';
import {
  AutoAwesome,
  Close,
  Send,
  OpenInFull,
  SmartToy,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { aiChatAPI } from '../../services/api';

// Context definitions per route
// `label` reste le libellé français envoyé au backend comme contexte ;
// les textes affichés (libellé, accueil, actions) sont traduits via aiChat:contextualPanel.contexts.<key>.
const PAGE_CONTEXTS = {
  '/dashboard': {
    key: 'dashboard',
    label: 'Tableau de bord',
    color: '#2563eb',
    actions: ['analyzePeriod', 'cashForecast', 'priorityAlerts'],
  },
  '/invoices': {
    key: 'invoices',
    label: 'Factures',
    color: '#10b981',
    actions: ['analyzeUnpaid', 'remindClient', 'optimizeTerms'],
  },
  '/contracts': {
    key: 'contracts',
    label: 'Contrats',
    color: '#8b5cf6',
    actions: ['generateClause', 'analyzeRisks', 'contractTemplate'],
  },
  '/purchase-orders': {
    key: 'purchaseOrders',
    label: 'Bons de commande',
    color: '#f59e0b',
    actions: ['compareSuppliers', 'optimizePurchases', 'paymentTerms'],
  },
  '/products': {
    key: 'products',
    label: 'Produits',
    color: '#ef4444',
    actions: ['analyzeStock', 'restock', 'optimizeCatalog'],
  },
  '/clients': {
    key: 'clients',
    label: 'Clients',
    color: '#06b6d4',
    actions: ['topClients', 'atRiskClients', 'loyaltyStrategy'],
  },
  '/suppliers': {
    key: 'suppliers',
    label: 'Fournisseurs',
    color: '#f97316',
    actions: ['evaluateSupplier', 'negotiatePrices', 'reduceRisks'],
  },
};

const DEFAULT_CONTEXT = {
  key: 'default',
  label: 'Procura',
  color: '#2563eb',
  actions: ['createInvoice', 'activitySummary', 'dailyTip'],
};

function getContext(pathname) {
  const match = Object.keys(PAGE_CONTEXTS).find(key => pathname.startsWith(key));
  return match ? PAGE_CONTEXTS[match] : DEFAULT_CONTEXT;
}

export default function ContextualAIPanel() {
  const { t } = useTranslation('aiChat');
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const messagesEndRef = useRef(null);

  const ctx = getContext(location.pathname);
  const ctxKey = `aiChat:contextualPanel.contexts.${ctx.key}`;

  // Masquer sur la page /ai-chat (le chat plein écran y est déjà présent).
  const hidden = location.pathname.startsWith('/ai-chat');

  // Reset la conversation quand on change de page
  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    setPendingConfirmation(null);
  }, [location.pathname]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (text, confirmationData = null) => {
    const userText = text || input.trim();
    if (!userText && !confirmationData) return;
    if (userText) {
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userText }]);
    }
    setPendingConfirmation(null);
    setLoading(true);
    try {
      const res = await aiChatAPI.sendMessage({
        message: userText || ' ',
        context: ctx.label,
        page: location.pathname,
        conversation_id: conversationId,
        ...(confirmationData ? { confirmation_data: confirmationData } : {}),
      });
      const data = res.data || {};
      // `reply` est la source de vérité du contrat backend unifié.
      const reply = data.reply || data.ai_response || t('aiChat:contextualPanel.replyReceived');
      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: reply,
          chart: data.chart || null,
          // Questions de suivi suggerees (meme contrat que le chat complet).
          followups: Array.isArray(data.suggested_followups) ? data.suggested_followups : [],
        },
      ]);
      // Confirmation structurée par token (création/suppression sensible).
      if (data.needs_confirmation) {
        setPendingConfirmation(data.needs_confirmation);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: t('aiChat:contextualPanel.error') }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationChoice = (option) => {
    if (!pendingConfirmation) return;
    sendMessage(null, { token: pendingConfirmation.token, choice: option.choice });
  };

  // Rendu conditionnel APRÈS tous les hooks (respect des Rules of Hooks).
  if (hidden) return null;

  return (
    <>
      {/* Floating button — desktop uniquement (cache sur mobile) */}
      <Fab
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          display: { xs: 'none', md: 'inline-flex' },
          bottom: 24,
          right: 20,
          zIndex: 1200,
          bgcolor: ctx.color,
          color: 'white',
          width: 52,
          height: 52,
          boxShadow: `0 4px 20px ${alpha(ctx.color, 0.45)}`,
          '&:hover': { bgcolor: ctx.color, filter: 'brightness(1.1)', transform: 'scale(1.05)' },
          transition: 'all 0.2s',
        }}
      >
        <AutoAwesome sx={{ fontSize: 22 }} />
      </Fab>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 360 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(ctx.color, 0.05) }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: ctx.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SmartToy sx={{ fontSize: 20, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {t('aiChat:title')}
                </Typography>
                <Typography variant="caption" sx={{ color: ctx.color, fontWeight: 600 }}>
                  {t(`${ctxKey}.label`)}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={() => { setOpen(false); navigate('/ai-chat'); }} title={t('aiChat:contextualPanel.openFullChat')}>
                <OpenInFull sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" onClick={() => setOpen(false)}>
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Context greeting */}
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(ctx.color, 0.06), border: '1px solid', borderColor: alpha(ctx.color, 0.15) }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.82rem' }}>
              {t(`${ctxKey}.greeting`)}
            </Typography>
          </Box>
        </Box>

        {/* Quick actions */}
        {messages.length === 0 && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
              {t('aiChat:quickActions.title')}
            </Typography>
            <Stack spacing={0.75}>
              {ctx.actions.map((action, i) => (
                <Box
                  key={i}
                  onClick={() => sendMessage(t(`${ctxKey}.actions.${action}.prompt`))}
                  sx={{
                    px: 1.5, py: 1, borderRadius: 1.5,
                    border: '1px solid', borderColor: 'divider',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                    color: 'text.secondary',
                    '&:hover': { bgcolor: alpha(ctx.color, 0.06), borderColor: alpha(ctx.color, 0.3), color: 'text.primary' },
                    transition: 'all 0.15s',
                  }}
                >
                  {t(`${ctxKey}.actions.${action}.label`)}
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <Divider />

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.map((msg, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 1 }}>
              {msg.role === 'assistant' && (
                <Avatar sx={{ width: 28, height: 28, bgcolor: ctx.color, flexShrink: 0, mt: 0.25 }}>
                  <SmartToy sx={{ fontSize: 16 }} />
                </Avatar>
              )}
              <Box
                sx={{
                  maxWidth: '82%',
                  px: 1.5, py: 1,
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  bgcolor: msg.role === 'user' ? ctx.color : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.05),
                  color: msg.role === 'user' ? 'white' : 'text.primary',
                }}
              >
                {msg.role === 'assistant' ? (
                  // Rendu Markdown compact, aligne sur le chat complet (gras,
                  // listes, tableaux) au lieu du texte brut avec ** visibles.
                  <Box
                    sx={{
                      fontSize: '0.82rem',
                      lineHeight: 1.55,
                      '& p': { m: 0, mb: 0.75 },
                      '& p:last-child': { mb: 0 },
                      '& ul, & ol': { m: 0, mb: 0.75, pl: 2.25 },
                      '& li': { mb: 0.25 },
                      '& strong': { fontWeight: 700 },
                      '& h1, & h2, & h3, & h4': { fontSize: '0.9rem', fontWeight: 700, m: 0, mb: 0.5 },
                      '& code': {
                        px: 0.5, borderRadius: 0.5, fontSize: '0.78rem',
                        bgcolor: alpha(theme.palette.text.primary, 0.08),
                      },
                      '& table': { borderCollapse: 'collapse', fontSize: '0.78rem', mb: 0.75 },
                      '& th, & td': { border: '1px solid', borderColor: 'divider', px: 0.75, py: 0.25 },
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {normalizeMarkdown(msg.text)}
                    </ReactMarkdown>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </Typography>
                )}
                {msg.chart && (
                  <Typography
                    variant="caption"
                    onClick={() => { setOpen(false); navigate('/ai-chat'); }}
                    sx={{ display: 'block', mt: 0.75, color: ctx.color, cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', '&:hover': { textDecoration: 'underline' } }}
                  >
                     {t('aiChat:contextualPanel.chartAvailable')}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}

          {/* Questions de suivi suggérées (même comportement que le chat complet) */}
          {!loading && !pendingConfirmation && messages.length > 0 && (() => {
            const last = messages[messages.length - 1];
            if (last.role !== 'assistant' || !last.followups?.length) return null;
            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, pl: 4.5 }}>
                {last.followups.map((question, qi) => (
                  <Box
                    key={qi}
                    onClick={() => sendMessage(question)}
                    sx={{
                      px: 1.25, py: 0.5, borderRadius: 4, cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 500,
                      border: '1px solid', borderColor: 'divider', color: 'text.secondary',
                      '&:hover': { borderColor: ctx.color, color: ctx.color, bgcolor: alpha(ctx.color, 0.04) },
                      transition: 'all 0.15s',
                    }}
                  >
                    {question}
                  </Box>
                ))}
              </Box>
            );
          })()}

          {/* Confirmation structurée (création/suppression sensible) */}
          {pendingConfirmation && !loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, pl: 4.5 }}>
              {(pendingConfirmation.options || []).map((opt, i) => (
                <Box
                  key={i}
                  onClick={() => handleConfirmationChoice(opt)}
                  sx={{
                    px: 1.5, py: 0.85, borderRadius: 1.5, cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600, textAlign: 'center',
                    border: '1px solid',
                    borderColor: opt.variant === 'danger' ? 'error.main' : alpha(ctx.color, 0.4),
                    color: opt.variant === 'danger' ? 'error.main' : (opt.variant === 'primary' ? 'white' : ctx.color),
                    bgcolor: opt.variant === 'primary' ? ctx.color : 'transparent',
                    '&:hover': { filter: 'brightness(1.05)', bgcolor: opt.variant === 'primary' ? ctx.color : alpha(ctx.color, 0.08) },
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </Box>
              ))}
            </Box>
          )}

          {loading && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: ctx.color }}>
                <SmartToy sx={{ fontSize: 16 }} />
              </Avatar>
              <Box sx={{ px: 1.5, py: 1, borderRadius: '12px 12px 12px 2px', bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                <CircularProgress size={14} sx={{ color: ctx.color }} />
              </Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={3}
              size="small"
              placeholder={t('aiChat:contextualPanel.placeholder')}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' },
              }}
            />
            <IconButton
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              sx={{ bgcolor: ctx.color, color: 'white', width: 36, height: 36, flexShrink: 0, '&:hover': { bgcolor: ctx.color, filter: 'brightness(1.1)' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}
            >
              <Send sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography
              variant="caption"
              onClick={() => { setOpen(false); navigate('/ai-chat'); }}
              sx={{ color: ctx.color, cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', '&:hover': { textDecoration: 'underline' } }}
            >
              {t('aiChat:contextualPanel.openFullChatLink')}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
