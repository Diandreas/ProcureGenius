import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { aiChatAPI } from '../../services/api';

// Context definitions per route
const PAGE_CONTEXTS = {
  '/dashboard': {
    label: 'Tableau de bord',
    color: '#6366f1',
    greeting: 'Voici un aperçu de votre activité. Je peux analyser vos indicateurs ou faire une prévision de trésorerie.',
    actions: [
      { label: 'Analyser la période', prompt: 'Analyse mes indicateurs financiers du tableau de bord et donne-moi les points clés.' },
      { label: 'Prévision trésorerie', prompt: 'Fais une prévision de trésorerie basée sur mes données actuelles.' },
      { label: 'Alertes prioritaires', prompt: 'Quelles sont les alertes les plus importantes à traiter aujourd\'hui ?' },
    ],
  },
  '/invoices': {
    label: 'Factures',
    color: '#10b981',
    greeting: 'Je peux vous aider à gérer vos factures, analyser les impayés ou rédiger des relances.',
    actions: [
      { label: 'Analyser les impayés', prompt: 'Analyse mes factures impayées et propose un plan de relance.' },
      { label: 'Relancer un client', prompt: 'Rédige un email de relance professionnel et courtois pour un client en retard de paiement.' },
      { label: 'Optimiser les délais', prompt: 'Comment puis-je améliorer mon taux de recouvrement et réduire les délais de paiement ?' },
    ],
  },
  '/contracts': {
    label: 'Contrats',
    color: '#8b5cf6',
    greeting: 'Je peux générer des sections de contrat, analyser les risques ou vous guider dans la rédaction.',
    actions: [
      { label: 'Générer une clause', prompt: 'Génère une clause de confidentialité professionnelle en français, adaptée au droit OHADA.' },
      { label: 'Analyser les risques', prompt: 'Quels sont les risques contractuels courants à surveiller dans mes contrats actifs ?' },
      { label: 'Modèle de contrat', prompt: 'Quel type de contrat me recommandes-tu pour une prestation de service récurrente ?' },
    ],
  },
  '/purchase-orders': {
    label: 'Bons de commande',
    color: '#f59e0b',
    greeting: 'Je peux vous aider à rédiger des bons de commande, comparer des fournisseurs ou optimiser vos achats.',
    actions: [
      { label: 'Comparer fournisseurs', prompt: 'Comment évaluer et comparer efficacement mes fournisseurs pour obtenir le meilleur rapport qualité-prix ?' },
      { label: 'Optimiser les achats', prompt: 'Quelles stratégies puis-je adopter pour réduire mes coûts d\'achats ?' },
      { label: 'Termes de paiement', prompt: 'Quels sont les termes de paiement standards dans un bon de commande B2B ?' },
    ],
  },
  '/products': {
    label: 'Produits',
    color: '#ef4444',
    greeting: 'Je peux analyser votre stock, suggérer des réapprovisionnements ou optimiser votre catalogue.',
    actions: [
      { label: 'Analyser le stock', prompt: 'Analyse mon niveau de stock et identifie les produits en rupture ou en surstock.' },
      { label: 'Réapprovisionnement', prompt: 'Quels produits devrais-je réapprovisionner en priorité et en quelle quantité ?' },
      { label: 'Optimiser le catalogue', prompt: 'Comment puis-je optimiser mon catalogue produits pour améliorer mes marges ?' },
    ],
  },
  '/clients': {
    label: 'Clients',
    color: '#06b6d4',
    greeting: 'Je peux analyser votre portefeuille clients, identifier les plus rentables ou vous aider à fidéliser.',
    actions: [
      { label: 'Top clients', prompt: 'Qui sont mes clients les plus rentables et comment les fidéliser ?' },
      { label: 'Clients à risque', prompt: 'Quels clients présentent un risque d\'impayé ou d\'inactivité ?' },
      { label: 'Stratégie fidélisation', prompt: 'Propose-moi une stratégie de fidélisation adaptée à mes clients actuels.' },
    ],
  },
  '/suppliers': {
    label: 'Fournisseurs',
    color: '#f97316',
    greeting: 'Je peux vous aider à évaluer vos fournisseurs, négocier de meilleures conditions ou diversifier vos sources.',
    actions: [
      { label: 'Évaluer un fournisseur', prompt: 'Quels critères utiliser pour évaluer la fiabilité d\'un fournisseur ?' },
      { label: 'Négocier les prix', prompt: 'Donne-moi des stratégies pour négocier de meilleures conditions avec mes fournisseurs.' },
      { label: 'Réduire les risques', prompt: 'Comment réduire ma dépendance à un seul fournisseur et diversifier mes sources ?' },
    ],
  },
};

const DEFAULT_CONTEXT = {
  label: 'Procura',
  color: '#6366f1',
  greeting: 'Bonjour ! Je suis votre assistant Procura. Posez-moi n\'importe quelle question sur votre activité.',
  actions: [
    { label: 'Créer une facture', prompt: 'Guide-moi pour créer une facture professionnelle.' },
    { label: 'Résumé d\'activité', prompt: 'Donne-moi un résumé de mon activité récente et des points d\'attention.' },
    { label: 'Conseil du jour', prompt: 'Donne-moi un conseil pratique pour améliorer ma gestion d\'entreprise.' },
  ],
};

function getContext(pathname) {
  const match = Object.keys(PAGE_CONTEXTS).find(key => pathname.startsWith(key));
  return match ? PAGE_CONTEXTS[match] : DEFAULT_CONTEXT;
}

export default function ContextualAIPanel() {
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
      const reply = data.reply || data.ai_response || 'Réponse reçue.';
      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: reply, chart: data.chart || null },
      ]);
      // Confirmation structurée par token (création/suppression sensible).
      if (data.needs_confirmation) {
        setPendingConfirmation(data.needs_confirmation);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Désolé, une erreur est survenue. Réessayez ou ouvrez le chat complet.' }]);
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
                  Assistant IA
                </Typography>
                <Typography variant="caption" sx={{ color: ctx.color, fontWeight: 600 }}>
                  {ctx.label}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={() => { setOpen(false); navigate('/ai-chat'); }} title="Ouvrir le chat complet">
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
              {ctx.greeting}
            </Typography>
          </Box>
        </Box>

        {/* Quick actions */}
        {messages.length === 0 && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1 }}>
              Actions rapides
            </Typography>
            <Stack spacing={0.75}>
              {ctx.actions.map((action, i) => (
                <Box
                  key={i}
                  onClick={() => sendMessage(action.prompt)}
                  sx={{
                    px: 1.5, py: 1, borderRadius: 1.5,
                    border: '1px solid', borderColor: 'divider',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                    color: 'text.secondary',
                    '&:hover': { bgcolor: alpha(ctx.color, 0.06), borderColor: alpha(ctx.color, 0.3), color: 'text.primary' },
                    transition: 'all 0.15s',
                  }}
                >
                  {action.label}
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
                <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </Typography>
                {msg.chart && (
                  <Typography
                    variant="caption"
                    onClick={() => { setOpen(false); navigate('/ai-chat'); }}
                    sx={{ display: 'block', mt: 0.75, color: ctx.color, cursor: 'pointer', fontWeight: 600, fontSize: '0.72rem', '&:hover': { textDecoration: 'underline' } }}
                  >
                     Graphique disponible — ouvrir le chat complet
                  </Typography>
                )}
              </Box>
            </Box>
          ))}

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
              placeholder="Posez une question..."
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
              Ouvrir le chat complet →
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
