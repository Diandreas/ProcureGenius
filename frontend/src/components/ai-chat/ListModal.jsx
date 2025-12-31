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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Zoom ref={ref} {...props} />;
});

const ListModal = ({ open, onClose, title, items, entityType }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filtrer les éléments selon la recherche
  const filteredItems = items?.filter(item => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.email?.toLowerCase().includes(searchLower) ||
      item.invoice_number?.toLowerCase().includes(searchLower) ||
      item.po_number?.toLowerCase().includes(searchLower) ||
      item.reference?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Obtenir l'icône selon le type d'entité
  const getIcon = () => {
    switch (entityType) {
      case 'client': return <Person />;
      case 'supplier': return <Business />;
      case 'invoice': return <Receipt />;
      case 'purchase_order': return <ShoppingCart />;
      case 'product': return <Inventory />;
      default: return <Person />;
    }
  };

  // Obtenir la couleur selon le type
  const getColor = () => {
    switch (entityType) {
      case 'client': return theme.palette.primary.main;
      case 'supplier': return theme.palette.info.main;
      case 'invoice': return theme.palette.success.main;
      case 'purchase_order': return theme.palette.warning.main;
      case 'product': return theme.palette.secondary.main;
      default: return theme.palette.grey[500];
    }
  };

  // Obtenir l'URL pour voir les détails
  // (même logique qu'avant)
  const getDetailUrl = (item) => {
    switch (entityType) {
      case 'client': return `/clients/${item.id}`;
      case 'supplier': return `/suppliers/${item.id}`;
      case 'invoice': return `/invoices/${item.id}`;
      case 'purchase_order': return `/purchase-orders/${item.id}`;
      case 'product': return `/products/${item.id}`;
      default: return null;
    }
  };

  // Rendu des détails et actions (fonctions existantes)...
  // Je vais réutiliser les fonctions existantes `renderItemDetails` et `renderItemActions` si possible
  // Mais je dois m'assurer qu'elles sont dans la portée ou copiées.
  // Pour éviter de tout re-écrire, je vais copier le corps des fonctions helper mais dans le nouveau style si nécessaire.
  // Ici je remplace tout le composant pour bien structurer.

  const renderItemDetails = (item) => {
    switch (entityType) {
      case 'client':
      case 'supplier':
        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>
              {item.name}
            </Typography>
            {item.email && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {item.email}
              </Typography>
            )}
            {item.phone && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                📞 {item.phone}
              </Typography>
            )}
          </Box>
        );

      case 'invoice':
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {item.invoice_number}
              </Typography>
              {item.status && (
                <Chip
                  label={item.status}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor: item.status === 'paid' ? alpha(theme.palette.success.main, 0.1) : item.status === 'pending' ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                    color: item.status === 'paid' ? 'success.dark' : item.status === 'pending' ? 'warning.dark' : 'error.dark',
                    border: '1px solid',
                    borderColor: item.status === 'paid' ? alpha(theme.palette.success.main, 0.2) : item.status === 'pending' ? alpha(theme.palette.warning.main, 0.2) : alpha(theme.palette.error.main, 0.2),
                  }}
                />
              )}
            </Box>
            {item.client_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                Client: {item.client_name}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 0.5 }}>
              {item.total_amount && (
                <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'success.main' }}>
                  {formatCurrency(item.total_amount)}
                </Typography>
              )}
              {item.due_date && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Échéance: {formatDate(item.due_date)}
                </Typography>
              )}
            </Box>
          </Box>
        );

      case 'purchase_order':
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {item.po_number}
              </Typography>
              {item.status && (
                <Chip
                  label={item.status}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor: item.status === 'received' ? alpha(theme.palette.success.main, 0.1) : item.status === 'pending' ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.info.main, 0.1),
                    color: item.status === 'received' ? 'success.dark' : item.status === 'pending' ? 'warning.dark' : 'info.dark',
                    border: '1px solid',
                    borderColor: 'transparent'
                  }}
                />
              )}
            </Box>
            {item.supplier_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                Fournisseur: {item.supplier_name}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 0.5 }}>
              {item.total_amount && (
                <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'primary.main', display: 'block' }}>
                  {formatCurrency(item.total_amount)}
                </Typography>
              )}
              {item.delivery_date && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                  Livraison: {formatDate(item.delivery_date)}
                </Typography>
              )}
            </Box>
          </Box>
        );

      case 'product':
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {item.name}
              </Typography>
              {item.score !== undefined && (
                <Chip
                  label={`${item.score}%`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    backgroundColor: item.score >= 80 ? alpha(theme.palette.success.main, 0.1) : item.score >= 50 ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                    color: item.score >= 80 ? 'success.dark' : item.score >= 50 ? 'warning.dark' : 'error.dark',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: item.score >= 80 ? alpha(theme.palette.success.main, 0.3) : item.score >= 50 ? alpha(theme.palette.warning.main, 0.3) : alpha(theme.palette.error.main, 0.3),
                  }}
                />
              )}
            </Box>
            {item.reference && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                Réf: {item.reference}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              {item.price && (
                <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'success.main' }}>
                  {formatCurrency(item.price)}
                </Typography>
              )}
              {item.stock_quantity !== undefined && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Stock: {item.stock_quantity}
                </Typography>
              )}
            </Box>
          </Box>
        );

      default:
        return (
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {item.name || item.title || 'Sans nom'}
          </Typography>
        );
    }
  };

  const renderItemActions = (item) => {
    const detailUrl = getDetailUrl(item);
    if (!detailUrl) return null;

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(detailUrl);
            onClose();
          }}
          sx={{
            p: 0.8,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            color: 'primary.main',
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
          }}
        >
          <Visibility fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`${detailUrl}/edit`);
            onClose();
          }}
          sx={{
            p: 0.8,
            bgcolor: alpha(theme.palette.secondary.main, 0.05),
            color: 'secondary.main',
            '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.15) }
          }}
        >
          <Edit fontSize="small" />
        </IconButton>
        {(entityType === 'invoice' || entityType === 'purchase_order') && (
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
              p: 0.8,
              bgcolor: alpha(theme.palette.success.main, 0.05),
              color: 'success.main',
              '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.15) }
            }}
          >
            <GetApp fontSize="small" />
          </IconButton>
        )}
      </Box>
    );
  };

  const entityColor = getColor();

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
          borderRadius: 3,
          maxHeight: '85vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          background: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
        },
      }}
      BackdropProps={{
        sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }
      }}
    >
      <Box sx={{
        background: `linear-gradient(135deg, ${alpha(entityColor, 0.1)} 0%, ${alpha(entityColor, 0.02)} 100%)`,
        pb: 1
      }}>
        <DialogTitle sx={{ pb: 1, pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{
                bgcolor: entityColor,
                boxShadow: `0 8px 16px ${alpha(entityColor, 0.3)}`,
                width: 48,
                height: 48
              }}>
                {getIcon()}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {filteredItems.length} résultat{filteredItems.length !== 1 ? 's' : ''} trouvé{filteredItems.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{
              bgcolor: 'rgba(0,0,0,0.05)', '&:hover': { bgcolor: 'rgba(0,0,0,0.1)', color: 'error.main' }
            }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Barre de recherche */}
        <Box sx={{ px: 3, pb: 2, mt: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher dans la liste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
              sx: {
                bgcolor: theme.palette.background.paper,
                borderRadius: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' },
                '&:hover fieldset': { borderColor: alpha(entityColor, 0.5) },
                '&.Mui-focused fieldset': { borderColor: entityColor }
              }
            }}
          />
        </Box>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <DialogContent sx={{ p: 0, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#f8fafc' }}>
        {/* Liste des éléments */}
        <List sx={{ p: 1.5 }}>
          {filteredItems.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', opacity: 0.6 }}>
              <Box sx={{
                width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.04)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2
              }}>
                <Search sx={{ fontSize: 32, color: 'text.secondary' }} />
              </Box>
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Aucun résultat ne correspond à votre recherche
              </Typography>
            </Box>
          ) : (
            filteredItems.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <ListItem
                  disablePadding
                  sx={{ mb: 1 }}
                  secondaryAction={renderItemActions(item)}
                >
                  <ListItemButton
                    onClick={() => {
                      const url = getDetailUrl(item);
                      if (url) {
                        navigate(url);
                        onClose();
                      }
                    }}
                    sx={{
                      py: 2,
                      px: 2.5,
                      borderRadius: 2.5,
                      bgcolor: theme.palette.background.paper,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.03)',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: theme.palette.background.paper,
                        boxShadow: `0 8px 20px rgba(0,0,0,0.06), 0 0 0 1px ${alpha(entityColor, 0.3)}`,
                        transform: 'translateY(-2px)'
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 56 }}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(entityColor, 0.1),
                          color: entityColor,
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          fontWeight: 700
                        }}
                      >
                        {item.name ? item.name.substring(0, 1).toUpperCase() : getIcon()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={renderItemDetails(item)}
                      sx={{ pr: 12, my: 0 }}
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))
          )}
        </List>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: 2,
            px: 3,
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.secondary'
          }}
        >
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ListModal;
