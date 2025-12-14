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

const ListModal = ({ open, onClose, title, items, entityType }) => {
  const navigate = useNavigate();
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
      case 'client':
        return <Person />;
      case 'supplier':
        return <Business />;
      case 'invoice':
        return <Receipt />;
      case 'purchase_order':
        return <ShoppingCart />;
      case 'product':
        return <Inventory />;
      default:
        return <Person />;
    }
  };

  // Obtenir la couleur selon le type
  const getColor = () => {
    switch (entityType) {
      case 'client':
        return 'primary.main';
      case 'supplier':
        return 'info.main';
      case 'invoice':
        return 'success.main';
      case 'purchase_order':
        return 'warning.main';
      case 'product':
        return 'secondary.main';
      default:
        return 'grey.500';
    }
  };

  // Obtenir l'URL pour voir les détails
  const getDetailUrl = (item) => {
    switch (entityType) {
      case 'client':
        return `/clients/${item.id}`;
      case 'supplier':
        return `/suppliers/${item.id}`;
      case 'invoice':
        return `/invoices/${item.id}`;
      case 'purchase_order':
        return `/purchase-orders/${item.id}`;
      case 'product':
        return `/products/${item.id}`;
      default:
        return null;
    }
  };

  // Rendu des détails selon le type
  const renderItemDetails = (item) => {
    switch (entityType) {
      case 'client':
      case 'supplier':
        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {item.name}
            </Typography>
            {item.email && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
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
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {item.invoice_number}
              </Typography>
              {item.status && (
                <Chip
                  label={item.status}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    backgroundColor: item.status === 'paid' ? 'success.light' : item.status === 'pending' ? 'warning.light' : 'error.light',
                  }}
                />
              )}
            </Box>
            {item.client_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                Client: {item.client_name}
              </Typography>
            )}
            {item.total_amount && (
              <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'success.main', display: 'block' }}>
                {formatCurrency(item.total_amount)}
              </Typography>
            )}
            {item.due_date && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                Échéance: {formatDate(item.due_date)}
              </Typography>
            )}
          </Box>
        );

      case 'purchase_order':
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {item.po_number}
              </Typography>
              {item.status && (
                <Chip
                  label={item.status}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    backgroundColor: item.status === 'received' ? 'success.light' : item.status === 'pending' ? 'warning.light' : 'info.light',
                  }}
                />
              )}
            </Box>
            {item.supplier_name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                Fournisseur: {item.supplier_name}
              </Typography>
            )}
            {item.total_amount && (
              <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'primary.main', display: 'block' }}>
                {formatCurrency(item.total_amount)}
              </Typography>
            )}
            {item.delivery_date && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                Livraison: {formatDate(item.delivery_date)}
              </Typography>
            )}
          </Box>
        );

      case 'product':
        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {item.name}
            </Typography>
            {item.reference && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                Réf: {item.reference}
              </Typography>
            )}
            {item.price && (
              <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'success.main', display: 'block' }}>
                {formatCurrency(item.price)}
              </Typography>
            )}
            {item.stock_quantity !== undefined && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                Stock: {item.stock_quantity}
              </Typography>
            )}
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

  // Actions pour chaque élément
  const renderItemActions = (item) => {
    const detailUrl = getDetailUrl(item);
    if (!detailUrl) return null;

    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <IconButton
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(detailUrl);
            onClose();
          }}
          sx={{ p: 0.5 }}
        >
          <Visibility fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          color="secondary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`${detailUrl}/edit`);
            onClose();
          }}
          sx={{ p: 0.5 }}
        >
          <Edit fontSize="small" />
        </IconButton>
        {(entityType === 'invoice' || entityType === 'purchase_order') && (
          <IconButton
            size="small"
            color="success"
            onClick={(e) => {
              e.stopPropagation();
              const pdfUrl = entityType === 'invoice'
                ? `/api/invoices/${item.id}/pdf/`
                : `/api/purchase-orders/${item.id}/pdf/`;
              window.open(pdfUrl, '_blank');
            }}
            sx={{ p: 0.5 }}
          >
            <GetApp fontSize="small" />
          </IconButton>
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
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: getColor(), width: 40, height: 40 }}>
              {getIcon()}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {filteredItems.length} résultat{filteredItems.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {/* Barre de recherche */}
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>

        {/* Liste des éléments */}
        <List sx={{ p: 0 }}>
          {filteredItems.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Aucun résultat trouvé
              </Typography>
            </Box>
          ) : (
            filteredItems.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <ListItem
                  disablePadding
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
                      py: 1.5,
                      px: 2,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: getColor() + '20',
                          color: getColor(),
                          width: 44,
                          height: 44,
                        }}
                      >
                        {getIcon()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={renderItemDetails(item)}
                      sx={{ pr: 8 }}
                    />
                  </ListItemButton>
                </ListItem>
                {index < filteredItems.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))
          )}
        </List>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ListModal;
