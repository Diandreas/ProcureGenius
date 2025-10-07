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
        mb: 1.5,
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderColor: 'primary.main',
          background: 'rgba(255, 255, 255, 0.95)'
        }
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'primary.main',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              {invoice.invoice_number}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
              {invoice.title}
            </Typography>
          </Box>
          <Chip
            label={getStatusLabel(invoice.status)}
            color={getStatusColor(invoice.status)}
            size="small"
            sx={{ fontSize: '0.7rem', height: 20, fontWeight: 500 }}
          />
        </Box>

        <Box display="flex" alignItems="center" mb={0.75}>
          <Business fontSize="small" sx={{ color: 'text.secondary', mr: 0.75, fontSize: '0.875rem' }} />
          <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
            {invoice.client_name || 'N/A'}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {invoice.total_amount} {invoice.currency}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
            Échéance: {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.25, opacity: 0.6 }} />

        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
          <IconButton
            size="small"
            onClick={() => navigate(`/invoices/${invoice.id}`)}
            sx={{
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              color: 'primary.main',
              width: 28,
              height: 28,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'white',
                transform: 'scale(1.1)',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
              }
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            sx={{
              bgcolor: 'rgba(66, 66, 66, 0.08)',
              color: 'text.secondary',
              width: 28,
              height: 28,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: 'secondary.main',
                color: 'white',
                transform: 'scale(1.1)',
                boxShadow: '0 2px 8px rgba(66, 66, 66, 0.3)'
              }
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
          {invoice.status === 'draft' && (
            <IconButton
              size="small"
              sx={{
                bgcolor: 'rgba(46, 125, 50, 0.08)',
                color: 'success.main',
                width: 28,
                height: 28,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'success.main',
                  color: 'white',
                  transform: 'scale(1.1)',
                  boxShadow: '0 2px 8px rgba(46, 125, 50, 0.3)'
                }
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
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
            fontWeight: 500,
            px: 3,
            py: 1.5,
            minHeight: 40,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
            }
          }}
        >
          {isMobile ? 'Nouvelle' : 'Nouvelle facture'}
        </Button>
      </Box>

      <Box mb={2.5}>
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
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: 2
                }
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: 2
                }
              }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
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
        <Card sx={{
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} sx={{
              borderRadius: 0,
              background: 'transparent',
              boxShadow: 'none'
            }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Numéro</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Titre</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Statut</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Montant total</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Date d'échéance</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      hover
                      sx={{
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                          transform: 'scale(1.001)'
                        }
                      }}
                    >
                      <TableCell sx={{ py: 1.25 }}>
                        <Link
                          component="button"
                          variant="body1"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          sx={{
                            textDecoration: 'none',
                            color: 'primary.main',
                            fontWeight: 'medium',
                            fontSize: '0.875rem',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {invoice.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell sx={{ py: 1.25, fontSize: '0.875rem' }}>{invoice.title}</TableCell>
                      <TableCell sx={{ py: 1.25 }}>
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
                              fontSize: '0.875rem',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            <Business fontSize="small" />
                            {invoice.client_name || invoice.client.name || 'N/A'}
                          </Link>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                            <Business fontSize="small" />
                            {invoice.client_name || 'N/A'}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Chip
                          label={getStatusLabel(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                          sx={{ fontSize: '0.75rem', height: 20 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 1.25, fontSize: '0.875rem' }}>{invoice.total_amount} {invoice.currency}</TableCell>
                      <TableCell sx={{ py: 1.25, fontSize: '0.875rem' }}>
                        {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Stack direction="row" spacing={0.75}>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1.5,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)'
                              }
                            }}
                          >
                            Voir
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Edit />}
                            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1.5,
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 2px 8px rgba(66, 66, 66, 0.2)'
                              }
                            }}
                          >
                            Modifier
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              size="small"
                              startIcon={<Send />}
                              color="success"
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1.5,
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: '0 2px 8px rgba(46, 125, 50, 0.2)'
                                }
                              }}
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