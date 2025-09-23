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
  Avatar,
  Grid,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Email,
  Phone,
  Person,
  Visibility,
  Search,
  FilterList,
  AttachMoney,
  Business,
  CreditCard,
} from '@mui/icons-material';
import { clientsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentTermsFilter, setPaymentTermsFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.list();
      setClients(response.data.results || response.data);
    } catch (err) {
      setError('Erreur lors du chargement des clients');
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'success' : 'error';
  };

  const getStatusLabel = (isActive) => {
    return isActive ? 'Actif' : 'Inactif';
  };

  const getRiskBadge = (score) => {
    if (score <= 0.3) return { label: 'Faible risque', color: 'success' };
    if (score <= 0.6) return { label: 'Risque modéré', color: 'warning' };
    return { label: 'Risque élevé', color: 'error' };
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && client.is_active) ||
      (statusFilter === 'inactive' && !client.is_active);

    const matchesPaymentTerms = !paymentTermsFilter || client.payment_terms === paymentTermsFilter;

    return matchesSearch && matchesStatus && matchesPaymentTerms;
  });

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
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Clients ({filteredClients.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/clients/new')}
        >
          Nouveau client
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher par nom, contact ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="active">Actif</MenuItem>
                  <MenuItem value="inactive">Inactif</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Conditions de paiement</InputLabel>
                <Select
                  value={paymentTermsFilter}
                  onChange={(e) => setPaymentTermsFilter(e.target.value)}
                  label="Conditions de paiement"
                >
                  <MenuItem value="">Toutes</MenuItem>
                  <MenuItem value="NET 15">NET 15</MenuItem>
                  <MenuItem value="NET 30">NET 30</MenuItem>
                  <MenuItem value="NET 45">NET 45</MenuItem>
                  <MenuItem value="NET 60">NET 60</MenuItem>
                  <MenuItem value="CASH">CASH</MenuItem>
                  <MenuItem value="2/10 NET 30">2/10 NET 30</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPaymentTermsFilter('');
                }}
              >
                Effacer
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Conditions de paiement</TableCell>
                  <TableCell>Limite de crédit</TableCell>
                  <TableCell>Risque IA</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Date création</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClients.map((client) => {
                  const riskBadge = getRiskBadge(client.ai_payment_risk_score || 0);
                  return (
                    <TableRow key={client.id} hover sx={{ cursor: 'pointer' }}>
                      <TableCell onClick={() => navigate(`/clients/${client.id}`)}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {client.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                              {client.name}
                            </Typography>
                            {client.legal_name && client.legal_name !== client.name && (
                              <Typography variant="caption" color="text.secondary">
                                {client.legal_name}
                              </Typography>
                            )}
                            {client.business_number && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                N° {client.business_number}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {client.contact_person && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Person fontSize="small" color="action" />
                              <Typography variant="body2">{client.contact_person}</Typography>
                            </Box>
                          )}
                          {client.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Email fontSize="small" color="action" />
                              <Typography variant="body2">{client.email}</Typography>
                            </Box>
                          )}
                          {client.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Phone fontSize="small" color="action" />
                              <Typography variant="body2">{client.phone}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard fontSize="small" color="action" />
                          <Typography variant="body2">{client.payment_terms}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {client.credit_limit ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AttachMoney fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {formatCurrency(client.credit_limit)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Non définie
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.ai_payment_risk_score > 0 ? (
                          <Chip
                            label={riskBadge.label}
                            color={riskBadge.color}
                            size="small"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            En attente
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(client.is_active)}
                          color={getStatusColor(client.is_active)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatDate(client.created_at)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/clients/${client.id}`)}
                            color="primary"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/clients/${client.id}/edit`)}
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredClients.length === 0 && clients.length > 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                Aucun client ne correspond aux filtres
              </Typography>
            </Box>
          )}

          {clients.length === 0 && !loading && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                Aucun client trouvé
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/clients/new')}
                sx={{ mt: 2 }}
              >
                Créer le premier client
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Clients;