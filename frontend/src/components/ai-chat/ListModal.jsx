import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
  IconButton,
  Divider,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Slide,
  Grid,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Search,
  Person,
  Business,
  Receipt,
  ShoppingCart,
  Inventory,
  Visibility,
  Edit,
  GetApp,
  Email,
  Phone,
  Euro,
  CalendarToday,
  Description,
  ChevronRight,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import { fadeInUp, scaleIn } from '../../animations/variants/scroll-reveal';
import { hoverLift, buttonPress } from '../../animations/variants/micro-interactions';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} />;
});

/**
 * ListModal amélioré - Style Premium "Procura"
 * Offre une expérience visuelle de haut calibre pour lister les résultats de recherche IA
 */
const ListModal = ({ open, onClose, title, items, entityType }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const isDark = theme.palette.mode === 'dark';

  // Filtrer les éléments selon la recherche
  const filteredItems = items?.filter(item => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.email?.toLowerCase().includes(searchLower) ||
      item.invoice_number?.toLowerCase().includes(searchLower) ||
      item.po_number?.toLowerCase().includes(searchLower) ||
      item.reference?.toLowerCase().includes(searchLower) ||
      item.company?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Configuration par type d'entité (aligné sur ConfirmationModal et PreviewCard)
  const entityConfig = {
    client: {
      icon: <Person />,
      color: theme.palette.primary.main,
      title: 'Client',
      urlPrefix: '/clients',
    },
    supplier: {
      icon: <Business />,
      color: theme.palette.info.main,
      title: 'Fournisseur',
      urlPrefix: '/suppliers',
    },
    invoice: {
      icon: <Receipt />,
      color: theme.palette.success.main,
      title: 'Facture',
      urlPrefix: '/invoices',
    },
    purchase_order: {
      icon: <ShoppingCart />,
      color: theme.palette.warning.main,
      title: 'Bon de Commande',
      urlPrefix: '/purchase-orders',
    },
    product: {
      icon: <Inventory />,
      color: theme.palette.secondary.main,
      title: 'Produit',
      urlPrefix: '/products',
    },
  };

  const config = entityConfig[entityType] || entityConfig.client;
  const entityColor = config.color;

  const renderItemDetails = (item) => {
    switch (entityType) {
      case 'client':
      case 'supplier':
        return (
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.5 }}>
              {item.name || item.company}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5 }}>
              {item.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Email sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {item.email}
                  </Typography>
                </Box>
              )}
              {item.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Phone sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {item.phone}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        );

      case 'invoice':
        return (
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {item.invoice_number}
              </Typography>
              <Chip
                label={item.status || 'Brouillon'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  bgcolor: alpha(entityColor, 0.1),
                  color: entityColor,
                  border: `1px solid ${alpha(entityColor, 0.2)}`,
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {item.client_name ? `Client: ${item.client_name}` : 'Client non spécifié'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: entityColor }}>
                {formatCurrency(item.total_amount || 0)}
              </Typography>
              {item.due_date && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarToday sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(item.due_date)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        );

      case 'purchase_order':
        return (
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {item.po_number}
              </Typography>
              <Chip
                label={item.status || 'En attente'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  bgcolor: alpha(entityColor, 0.1),
                  color: entityColor,
                  border: `1px solid ${alpha(entityColor, 0.2)}`,
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {item.supplier_name ? `Fournisseur: ${item.supplier_name}` : 'Fournisseur non spécifié'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: entityColor }}>
                {formatCurrency(item.total_amount || 0)}
              </Typography>
              {item.expected_delivery_date && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarToday sx={{ fontSize: 12, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(item.expected_delivery_date)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        );

      case 'product':
        return (
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {item.name}
              </Typography>
              {item.score !== undefined && (
                <Chip
                  label={`${item.score}% match`}
                  size="small"
                  color={item.score >= 80 ? "success" : item.score >= 50 ? "warning" : "error"}
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Réf: {item.reference || 'N/A'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main' }}>
                {formatCurrency(item.price || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ bgcolor: alpha(theme.palette.divider, 0.5), px: 1, borderRadius: 1 }}>
                Stock: {item.stock_quantity || 0}
              </Typography>
            </Box>
          </Box>
        );

      default:
        return (
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {item.name || item.title || 'Élément sans nom'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {item.id}
            </Typography>
          </Box>
        );
    }
  };

  const renderItemActions = (item) => {
    const detailUrl = `${config.urlPrefix}/${item.id}`;

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="Voir les détails">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(detailUrl);
              onClose();
            }}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: 'primary.main',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Modifier">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`${detailUrl}/edit`);
              onClose();
            }}
            sx={{
              bgcolor: alpha(theme.palette.secondary.main, 0.08),
              color: 'secondary.main',
              '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.15) }
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        {(entityType === 'invoice' || entityType === 'purchase_order') && (
          <Tooltip title="Télécharger PDF">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                const pdfUrl = entityType === 'invoice'
                  ? `/api/invoices/${item.id}/pdf/`
                  : `/api/purchase-orders/${item.id}/pdf/`;
                window.open(pdfUrl, '_blank');
              }}
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.08),
                color: 'success.main',
                '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.15) }
              }}
            >
              <GetApp fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: 4,
          maxHeight: '85vh',
          boxShadow: '0 24px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          background: isDark ? '#0f172a' : '#ffffff',
        },
      }}
      BackdropProps={{
        sx: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }
      }}
    >
      {/* Header Premium */}
      <Box sx={{
        background: isDark 
          ? `linear-gradient(135deg, ${alpha(entityColor, 0.15)} 0%, ${alpha('#000', 0.2)} 100%)`
          : `linear-gradient(135deg, ${alpha(entityColor, 0.08)} 0%, ${alpha(entityColor, 0.02)} 100%)`,
        position: 'relative',
        pt: 4,
        pb: 3,
        px: 4
      }}>
        {/* Décoration de fond */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(entityColor, 0.15)} 0%, transparent 70%)`,
          zIndex: 0
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <motion.div variants={scaleIn} initial="hidden" animate="visible">
              <Avatar sx={{
                bgcolor: entityColor,
                boxShadow: `0 12px 24px ${alpha(entityColor, 0.4)}`,
                width: 60,
                height: 60,
                border: '2px solid white'
              }}>
                {React.cloneElement(config.icon, { sx: { fontSize: 30 } })}
              </Avatar>
            </motion.div>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
                {title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={`${filteredItems.length} résultat${filteredItems.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ 
                    bgcolor: alpha(entityColor, 0.1), 
                    color: entityColor, 
                    fontWeight: 700,
                    height: 22,
                    fontSize: '0.7rem'
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  trouvé{filteredItems.length !== 1 ? 's' : ''} dans votre base de données
                </Typography>
              </Box>
            </Box>
          </Box>
          <IconButton 
            onClick={onClose} 
            sx={{ 
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' },
              transition: 'all 0.2s'
            }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Barre de recherche style Moderne */}
        <Box sx={{ mt: 3, position: 'relative', zIndex: 1 }}>
          <TextField
            fullWidth
            placeholder="Filtrer les résultats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: entityColor }} />
                </InputAdornment>
              ),
              sx: {
                bgcolor: isDark ? alpha('#fff', 0.05) : '#ffffff',
                borderRadius: 3,
                height: 50,
                boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.05)',
                '& fieldset': { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                transition: 'all 0.3s',
                '&.Mui-focused': {
                  boxShadow: `0 8px 24px ${alpha(entityColor, 0.15)}`,
                  transform: 'translateY(-2px)'
                }
              }
            }}
          />
        </Box>
      </Box>

      <DialogContent sx={{ 
        p: 3, 
        bgcolor: isDark ? '#0f172a' : '#f8fafc',
        '&::-webkit-scrollbar': { width: 8 },
        '&::-webkit-scrollbar-thumb': { bgcolor: alpha(entityColor, 0.2), borderRadius: 4 },
      }}>
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Avatar sx={{ 
                  width: 80, height: 80, mx: 'auto', mb: 3, 
                  bgcolor: alpha(theme.palette.divider, 0.1),
                  color: 'text.disabled'
                }}>
                  <Search sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h6" color="text.primary" fontWeight={700}>
                  Aucun résultat
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Nous n'avons rien trouvé correspondant à "{searchQuery}"
                </Typography>
                <Button 
                  onClick={() => setSearchQuery('')} 
                  sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }}
                >
                  Effacer la recherche
                </Button>
              </Box>
            </motion.div>
          ) : (
            <Grid container spacing={2}>
              {filteredItems.map((item, index) => (
                <Grid item xs={12} key={item.id || index}>
                  <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    layout
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 0,
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        bgcolor: theme.palette.background.paper,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft'),
                          borderColor: alpha(entityColor, 0.4),
                          transform: 'translateY(-4px)',
                          '& .arrow-icon': {
                            transform: 'translateX(4px)',
                            opacity: 1,
                            color: entityColor
                          }
                        },
                      }}
                    >
                      <ListItemButton
                        onClick={() => {
                          navigate(`${config.urlPrefix}/${item.id}`);
                          onClose();
                        }}
                        sx={{ p: 2.5, alignItems: 'flex-start' }}
                      >
                        <ListItemAvatar sx={{ minWidth: 64 }}>
                          <Avatar
                            sx={{
                              bgcolor: alpha(entityColor, 0.1),
                              color: entityColor,
                              width: 48,
                              height: 48,
                              borderRadius: 2.5,
                              fontWeight: 800,
                              fontSize: '1.25rem',
                              border: `1px solid ${alpha(entityColor, 0.2)}`
                            }}
                          >
                            {item.name ? item.name.substring(0, 1).toUpperCase() : config.icon}
                          </Avatar>
                        </ListItemAvatar>
                        
                        {renderItemDetails(item)}

                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, ml: 2 }}>
                          {renderItemActions(item)}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled', transition: 'all 0.2s' }} className="arrow-icon">
                            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Détails
                            </Typography>
                            <ArrowForward sx={{ fontSize: 14 }} />
                          </Box>
                        </Box>
                      </ListItemButton>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}
        </AnimatePresence>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        bgcolor: theme.palette.background.paper, 
        borderTop: `1px solid ${theme.palette.divider}`,
        justifyContent: 'space-between'
      }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
          Astuce: Cliquez sur une carte pour accéder directement à la fiche complète.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: 700,
              color: 'text.secondary',
              borderColor: theme.palette.divider
            }}
          >
            Fermer
          </Button>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              borderRadius: 2.5,
              px: 4,
              py: 1,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: entityColor,
              '&:hover': { bgcolor: alpha(entityColor, 0.9) },
              boxShadow: `0 8px 20px ${alpha(entityColor, 0.3)}`
            }}
          >
            Terminer
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ListModal;
