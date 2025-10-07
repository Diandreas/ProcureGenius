import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Link,
  IconButton,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Visibility, Edit, Send, Search, Business, MoreVert } from '@mui/icons-material';
import { invoicesAPI } from '../../services/api';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.list();
      const invoiceList = response.data.results || response.data;
      setInvoices(invoiceList);
      setFilteredInvoices(invoiceList);
    } catch (err) {
      setError('Erreur lors du chargement des factures');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchTerm) {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(invoice =>
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInvoices(filtered);
    }
  }, [searchTerm, invoices]);

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      overdue: 'error',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
      overdue: 'En retard',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  };

  const MobileInvoiceCard = ({ invoice }) => (
    <Card
      sx={{
        mb: 2,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'primary.main',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              {invoice.invoice_number}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              {invoice.title}
            </Typography>
          </Box>
          <Chip
            label={getStatusLabel(invoice.status)}
            color={getStatusColor(invoice.status)}
            size="small"
            sx={{ fontSize: '0.75rem', height: 24 }}
          />
        </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <Business fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {invoice.client_name || 'N/A'}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {invoice.total_amount} {invoice.currency}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            Échéance: {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <IconButton
            size="small"
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            sx={{
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
              width: 32,
              height: 32
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            sx={{
              bgcolor: 'secondary.light',
              color: 'secondary.contrastText',
              '&:hover': { bgcolor: 'secondary.main' },
              width: 32,
              height: 32
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
          {invoice.status === 'draft' && (
            <IconButton
              size="small"
              sx={{
                bgcolor: 'success.light',
                color: 'success.contrastText',
                '&:hover': { bgcolor: 'success.main' },
                width: 32,
                height: 32
              }}
            >
              <Send fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={isMobile ? 2 : 3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ 
          fontSize: { xs: '1.75rem', md: '2.25rem' }, 
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          color: 'text.primary'
        }}>
          Factures
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/invoices/new')}
          size={isMobile ? 'small' : 'medium'}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {isMobile ? 'Nouvelle' : 'Nouvelle facture'}
        </Button>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher par numéro, titre ou client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size={isMobile ? 'small' : 'medium'}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {isMobile ? (
        <Box>
          {filteredInvoices.map((invoice) => (
            <MobileInvoiceCard key={invoice.id} invoice={invoice} />
          ))}

          {filteredInvoices.length === 0 && invoices.length > 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                Aucune facture ne correspond à votre recherche
              </Typography>
            </Box>
          )}

          {invoices.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                Aucune facture trouvée
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/invoices/new')}
                sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Créer la première facture
              </Button>
            </Box>
          )}
        </Box>
      ) : (
        <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Numéro</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Titre</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Montant total</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date d'échéance</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Link
                          component="button"
                          variant="body1"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          sx={{
                            textDecoration: 'none',
                            color: 'primary.main',
                            fontWeight: 'medium',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {invoice.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.title}</TableCell>
                      <TableCell>
                        {invoice.client ? (
                          <Link
                            component="button"
                            variant="body1"
                            onClick={() => navigate(`/clients/${invoice.client.id || invoice.client}`)}
                            sx={{
                              textDecoration: 'none',
                              color: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            <Business fontSize="small" />
                            {invoice.client_name || invoice.client.name || 'N/A'}
                          </Link>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                            <Business fontSize="small" />
                            {invoice.client_name || 'N/A'}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{invoice.total_amount} {invoice.currency}</TableCell>
                      <TableCell>
                        {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            sx={{ textTransform: 'none' }}
                          >
                            Voir
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Edit />}
                            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            sx={{ textTransform: 'none' }}
                          >
                            Modifier
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              size="small"
                              startIcon={<Send />}
                              color="success"
                              sx={{ textTransform: 'none' }}
                            >
                              Envoyer
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredInvoices.length === 0 && invoices.length > 0 && (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="textSecondary">
                  Aucune facture ne correspond à votre recherche
                </Typography>
              </Box>
            )}

            {invoices.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="textSecondary">
                  Aucune facture trouvée
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/invoices/new')}
                  sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  Créer la première facture
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default Invoices;