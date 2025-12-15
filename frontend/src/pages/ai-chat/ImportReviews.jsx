import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Edit,
  Visibility,
  Assignment,
  Receipt,
  ShoppingCart,
  Business,
  Inventory,
  ArrowBack,
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { aiChatAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import ImportReviewModal from '../../components/ai/ImportReviewModal';

const ENTITY_TYPE_ICONS = {
  invoice: <Receipt />,
  purchase_order: <ShoppingCart />,
  supplier: <Business />,
  product: <Inventory />,
};

const ENTITY_TYPE_LABELS = {
  invoice: 'Facture',
  purchase_order: 'Bon de commande',
  supplier: 'Fournisseur',
  product: 'Produit',
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  modified: '#3b82f6',
};

function ImportReviews() {
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await aiChatAPI.getImportReviews(statusFilter);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      enqueueSnackbar('Erreur lors du chargement des imports', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId) => {
    try {
      const response = await aiChatAPI.approveImportReview(reviewId);
      if (response.data.success) {
        enqueueSnackbar(response.data.message || 'Import approuvé avec succès', { variant: 'success' });
        fetchReviews();
      }
    } catch (error) {
      console.error('Error approving review:', error);
      enqueueSnackbar('Erreur lors de l\'approbation', { variant: 'error' });
    }
  };

  const handleReject = async (reviewId) => {
    try {
      const response = await aiChatAPI.rejectImportReview(reviewId);
      if (response.data.success) {
        enqueueSnackbar('Import rejeté', { variant: 'info' });
        fetchReviews();
      }
    } catch (error) {
      console.error('Error rejecting review:', error);
      enqueueSnackbar('Erreur lors du rejet', { variant: 'error' });
    }
  };

  const handleOpenModal = (review) => {
    setSelectedReview(review);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedReview(null);
    fetchReviews();
  };

  const getPreviewText = (review) => {
    const data = review.modified_data || review.extracted_data;
    if (review.entity_type === 'invoice') {
      return `Facture ${data.invoice_number || 'N/A'} - ${data.client_name || 'Client inconnu'}`;
    } else if (review.entity_type === 'purchase_order') {
      return `BC ${data.po_number || 'N/A'} - ${data.supplier_name || 'Fournisseur inconnu'}`;
    } else if (review.entity_type === 'supplier') {
      return `${data.name || 'Fournisseur'} - ${data.email || ''}`;
    } else if (review.entity_type === 'product') {
      return `${data.name || 'Produit'} - ${data.sku || ''}`;
    }
    return 'Données extraites';
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/ai-chat')} size="small">
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Imports en attente de révision
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          label={`${reviews.length} import${reviews.length > 1 ? 's' : ''}`}
          color="primary"
          size="small"
        />
      </Box>

      {/* Status Filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {['pending', 'modified', 'approved', 'rejected'].map((status) => (
          <Chip
            key={status}
            label={status === 'pending' ? 'En attente' : status === 'modified' ? 'Modifié' : status === 'approved' ? 'Approuvé' : 'Rejeté'}
            onClick={() => setStatusFilter(status)}
            color={statusFilter === status ? 'primary' : 'default'}
            variant={statusFilter === status ? 'filled' : 'outlined'}
            sx={{ textTransform: 'capitalize' }}
          />
        ))}
      </Box>

      {/* Reviews List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Aucun import {statusFilter === 'pending' ? 'en attente' : `avec le statut "${statusFilter}"`}
        </Alert>
      ) : (
        <List sx={{ p: 0 }}>
          {reviews.map((review) => (
            <Card
              key={review.id}
              sx={{
                mb: 2,
                bgcolor: isDark ? alpha(theme.palette.common.white, 0.03) : '#f8fafc',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  {/* Icon */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                    }}
                  >
                    {ENTITY_TYPE_ICONS[review.entity_type] || <Assignment />}
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {ENTITY_TYPE_LABELS[review.entity_type] || review.entity_type}
                      </Typography>
                      <Chip
                        label={review.status === 'pending' ? 'En attente' : review.status === 'modified' ? 'Modifié' : review.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                        size="small"
                        sx={{
                          bgcolor: alpha(STATUS_COLORS[review.status] || '#64748b', 0.15),
                          color: STATUS_COLORS[review.status] || '#64748b',
                          fontWeight: 600,
                          height: 20,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {getPreviewText(review)}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {formatDateTime(review.created_at)}
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {review.status === 'pending' || review.status === 'modified' ? (
                      <>
                        <Tooltip title="Voir les détails">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenModal(review)}
                            sx={{ color: 'primary.main' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Approuver">
                          <IconButton
                            size="small"
                            onClick={() => handleApprove(review.id)}
                            sx={{ color: '#10b981' }}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rejeter">
                          <IconButton
                            size="small"
                            onClick={() => handleReject(review.id)}
                            sx={{ color: '#ef4444' }}
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip title="Voir les détails">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenModal(review)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      {/* Review Modal */}
      {selectedReview && (
        <ImportReviewModal
          open={modalOpen}
          onClose={handleCloseModal}
          review={selectedReview}
          onApprove={() => {
            handleApprove(selectedReview.id);
            handleCloseModal();
          }}
          onReject={() => {
            handleReject(selectedReview.id);
            handleCloseModal();
          }}
        />
      )}
    </Box>
  );
}

export default ImportReviews;

