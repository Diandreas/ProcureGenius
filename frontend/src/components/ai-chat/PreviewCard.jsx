import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Avatar,
  Divider,
  Grid,
  Button,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Receipt,
  Person,
  Business,
  ShoppingCart,
  Inventory,
  Edit,
  CheckCircle,
  Cancel,
  Email,
  Phone,
  Euro,
  CalendarToday,
  Description,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleIn } from '../../animations/variants/scroll-reveal';
import { buttonPress } from '../../animations/variants/micro-interactions';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';

/**
 * Card de preview élégante pour les entités avant confirmation
 * Affiche un résumé visuel et permet confirmation rapide ou modification
 */
const PreviewCard = ({
  entityType,
  draftData,
  onQuickConfirm,
  onModify,
  onCancel,
  isNested = false,
  nestedMessage = '',
}) => {
  // Configuration par type d'entité
  const entityConfig = {
    invoice: {
      icon: <Receipt />,
      color: '#10b981',
      bgColor: '#f0fdf4',
      title: 'Facture',
      getPreviewTitle: (data) => `Facture pour ${data.client_name || 'Client'}`,
      getPreviewSubtitle: (data) => {
        const total = data.total_amount || (data.items || []).reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        return `Montant: ${formatCurrency(total)} • Échéance: ${data.due_date || 'N/A'}`;
      },
      fields: [
        { label: 'Client', value: 'client_name', icon: <Person /> },
        { label: 'Email', value: 'client_email', icon: <Email /> },
        { label: 'Téléphone', value: 'client_phone', icon: <Phone /> },
        { label: "Date d'échéance", value: 'due_date', icon: <CalendarToday /> },
        { label: 'Description', value: 'description', icon: <Description />, fullWidth: true },
      ],
      hasItems: true,
    },
    client: {
      icon: <Person />,
      color: '#2563eb',
      bgColor: '#eff6ff',
      title: 'Client',
      getPreviewTitle: (data) => data.name || 'Nouveau Client',
      getPreviewSubtitle: (data) => {
        const parts = [];
        if (data.email) parts.push(data.email);
        if (data.phone) parts.push(data.phone);
        return parts.join(' • ') || 'Aucun contact';
      },
      fields: [
        { label: 'Nom', value: 'name', icon: <Person /> },
        { label: 'Email', value: 'email', icon: <Email /> },
        { label: 'Téléphone', value: 'phone', icon: <Phone /> },
        { label: 'Personne de contact', value: 'contact_person', icon: <Person /> },
        { label: 'Adresse', value: 'address', icon: <Description />, fullWidth: true },
        { label: 'Conditions de paiement', value: 'payment_terms', icon: <Euro /> },
      ],
    },
    supplier: {
      icon: <Business />,
      color: '#06b6d4',
      bgColor: '#ecfeff',
      title: 'Fournisseur',
      getPreviewTitle: (data) => data.name || 'Nouveau Fournisseur',
      getPreviewSubtitle: (data) => {
        const parts = [];
        if (data.contact_person) parts.push(`Contact: ${data.contact_person}`);
        if (data.email) parts.push(data.email);
        return parts.join(' • ') || 'Aucun contact';
      },
      fields: [
        { label: 'Nom', value: 'name', icon: <Business /> },
        { label: 'Personne de contact', value: 'contact_person', icon: <Person /> },
        { label: 'Email', value: 'email', icon: <Email /> },
        { label: 'Téléphone', value: 'phone', icon: <Phone /> },
        { label: 'Ville', value: 'city', icon: <Description /> },
        { label: 'Adresse', value: 'address', icon: <Description />, fullWidth: true },
      ],
    },
    purchase_order: {
      icon: <ShoppingCart />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      title: 'Bon de Commande',
      getPreviewTitle: (data) => `BC pour ${data.supplier_name || 'Fournisseur'}`,
      getPreviewSubtitle: (data) => {
        const total = data.total_amount || (data.items || []).reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        return `Montant: ${formatCurrency(total)} • Livraison: ${data.expected_delivery_date || 'N/A'}`;
      },
      fields: [
        { label: 'Fournisseur', value: 'supplier_name', icon: <Business /> },
        { label: 'Date de livraison', value: 'expected_delivery_date', icon: <CalendarToday /> },
        { label: 'Description', value: 'description', icon: <Description />, fullWidth: true },
      ],
      hasItems: true,
    },
    product: {
      icon: <Inventory />,
      color: '#a855f7',
      bgColor: '#faf5ff',
      title: 'Produit',
      getPreviewTitle: (data) => data.name || 'Nouveau Produit',
      getPreviewSubtitle: (data) =>
        `Réf: ${data.reference || 'N/A'} • Prix: ${formatCurrency(data.price)}`,
      fields: [
        { label: 'Nom', value: 'name', icon: <Inventory /> },
        { label: 'Référence', value: 'reference', icon: <Description /> },
        { label: 'Prix', value: 'price', icon: <Euro />, format: 'currency' },
        { label: 'Description', value: 'description', icon: <Description />, fullWidth: true },
      ],
    },
  };

  const config = entityConfig[entityType] || entityConfig.invoice;

  // Formatage des valeurs
  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatValue = (value, format) => {
    if (!value) return 'N/A';
    if (format === 'currency') return formatCurrency(value);
    return value;
  };

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = theme.breakpoints.down('sm');

  // Adapt bgColor for dark mode
  const getBgColor = (lightColor) => {
    if (isDark) {
      return alpha(config.color, 0.1);
    }
    return lightColor;
  };

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          mb: 2,
          border: `2px solid ${config.color}`,
          bgcolor: 'background.paper',
          boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'medium'),
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft'),
            transform: 'translateY(-1px)',
          },
        }}
      >
          {/* Header coloré */}
          <Box
            sx={{
              bgcolor: getBgColor(config.bgColor),
              p: { xs: 1.5, sm: 2 },
              borderBottom: `2px solid ${config.color}`,
            }}
          >
            <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2 }}>
              <Avatar
                sx={{
                  bgcolor: config.color,
                  width: { xs: 48, sm: 56 },
                  height: { xs: 48, sm: 56 },
                }}
              >
                {config.icon}
              </Avatar>

              <Box flexGrow={1}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {config.getPreviewTitle(draftData)}
                  </Typography>
                  <Chip
                    label="À confirmer"
                    size="small"
                    sx={{
                      bgcolor: config.color,
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {config.getPreviewSubtitle(draftData)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Détails */}
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {config.fields.map((field) => {
                const value = draftData[field.value];
                if (!value) return null; // Skip empty fields

                return (
                  <Grid item xs={12} sm={field.fullWidth ? 12 : 6} key={field.value}>
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <Box sx={{ color: config.color, mt: 0.5 }}>{field.icon}</Box>
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', fontWeight: 600 }}
                        >
                          {field.label}
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {formatValue(value, field.format)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            {/* Articles/Items Section - Pour factures, purchase orders, etc. */}
            {config.hasItems && draftData.items && draftData.items.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: config.color, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  📋 Articles ({draftData.items.length})
                </Typography>
                <Box sx={{ bgcolor: getBgColor(config.bgColor), borderRadius: 1, p: { xs: 1, sm: 1.5 } }}>
                  {draftData.items.map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        borderBottom:
                          index < draftData.items.length - 1
                            ? `1px solid ${config.color}33`
                            : 'none',
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.name || item.product_name || 'Article'}
                        </Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right', ml: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: config.color }}>
                          {formatCurrency(item.quantity * item.unit_price)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  <Box
                    sx={{
                      mt: 1.5,
                      pt: 1.5,
                      borderTop: `2px solid ${config.color}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Total
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: config.color }}>
                      {formatCurrency(
                        draftData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
                      )}
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Box>

          <Divider />

          {/* Actions - Only show if not nested */}
          {!isNested && onQuickConfirm && onModify && onCancel && (
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                bgcolor: isDark ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.02),
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1,
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={onCancel}
                sx={{ textTransform: 'none', fontSize: { xs: '0.875rem', sm: '1rem' } }}
                fullWidth={{ xs: true, sm: false }}
              >
                Annuler
              </Button>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={onModify}
                sx={{
                  textTransform: 'none',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  borderColor: config.color,
                  color: config.color,
                  '&:hover': {
                    borderColor: config.color,
                    bgcolor: getBgColor(config.bgColor),
                  },
                }}
                fullWidth={{ xs: true, sm: false }}
              >
                Modifier
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={onQuickConfirm}
                sx={{
                  textTransform: 'none',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  bgcolor: config.color,
                  '&:hover': {
                    bgcolor: config.color,
                    opacity: 0.9,
                  },
                }}
                fullWidth={{ xs: true, sm: false }}
              >
                ✓ Confirmer
              </Button>
            </Box>
          )}

          {/* Nested mode - Show info badge instead of actions */}
          {isNested && (
            <Box
              sx={{
                p: 2,
                bgcolor: alpha(config.color, 0.05),
                borderTop: `2px solid ${config.color}`,
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                ℹ️ {nestedMessage || 'Cette entité sera créée automatiquement'}
              </Typography>
            </Box>
          )}
        </Paper>
    </motion.div>
  );
};

export default PreviewCard;
