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
} from '@mui/material';
import { Add, Visibility, Edit, Send, Search, Business } from '@mui/icons-material';
import { invoicesAPI } from '../../services/api';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

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
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/invoices/new')}
        >
          Nouvelle facture
        </Button>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher par numéro, titre ou client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Numéro</TableCell>
                  <TableCell>Titre</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Montant total</TableCell>
                  <TableCell>Date d'échéance</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
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
                    <TableCell>{invoice.total_amount} {invoice.currency}</TableCell>
                    <TableCell>
                      {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        Voir
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                        sx={{ ml: 1 }}
                      >
                        Modifier
                      </Button>
                      {invoice.status === 'draft' && (
                        <Button
                          size="small"
                          startIcon={<Send />}
                          sx={{ ml: 1 }}
                          color="success"
                        >
                          Envoyer
                        </Button>
                      )}
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
                sx={{ mt: 2 }}
              >
                Créer la première facture
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Invoices;