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
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  const MobileClientCard = ({ client }) => {
    const riskBadge = getRiskBadge(client.ai_payment_risk_score || 0);
    return (
      <Card sx={{
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
      }}>
        <CardContent sx={{ p: 1.5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                {client.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {client.name}
                </Typography>
                {client.legal_name && client.legal_name !== client.name && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {client.legal_name}
                  </Typography>
                )}
              </Box>
            </Box>
            <Chip
              label={getStatusLabel(client.is_active)}
              color={getStatusColor(client.is_active)}
              size="small"
              sx={{ fontSize: '0.7rem', height: 20, fontWeight: 500 }}
            />
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person fontSize="small" sx={{ color: 'text.secondary', fontSize: '0.875rem' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {client.contact_person || 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCard fontSize="small" sx={{ color: 'text.secondary', fontSize: '0.875rem' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {client.payment_terms}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Email fontSize="small" sx={{ color: 'text.secondary', fontSize: '0.875rem' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {client.email || 'N/A'}
              </Typography>
            </Box>
            {client.ai_payment_risk_score > 0 ? (
              <Chip
                label={riskBadge.label}
                color={riskBadge.color}
                size="small"
                sx={{ fontSize: '0.65rem', height: 18 }}
              />
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                En attente
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 1.25, opacity: 0.6 }} />

          <Stack direction="row" spacing={0.75} justifyContent="flex-end">
            <IconButton
              size="small"
              onClick={() => navigate(`/clients/${client.id}`)}
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
              onClick={() => navigate(`/clients/${client.id}/edit`)}
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
          </Stack>
        </CardContent>
      </Card>
    );
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
    <Box p={isMobile ? 2 : 3}>
      {/* Header */}
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{
          fontSize: { xs: '1.75rem', md: '2.25rem' },
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          color: 'text.primary'
        }}>
          Clients ({filteredClients.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/clients/new')}
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
          {isMobile ? 'Nouveau' : 'Nouveau client'}
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{
        mb: 2.5,
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher par nom, contact ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Statut"
                  sx={{ borderRadius: 2 }}
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
                  sx={{ borderRadius: 2 }}
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
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                Effacer
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {isMobile ? (
        <Box>
          {filteredClients.map((client) => (
            <MobileClientCard key={client.id} client={client} />
          ))}
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
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Client</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Contact</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Conditions de paiement</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Limite de crédit</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Risque IA</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Statut</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Date création</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.5 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClients.map((client) => {
                    const riskBadge = getRiskBadge(client.ai_payment_risk_score || 0);
                    return (
                      <TableRow key={client.id} hover sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                          transform: 'scale(1.001)'
                        }
                      }}>
                        <TableCell onClick={() => navigate(`/clients/${client.id}`)} sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                              {client.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {client.name}
                              </Typography>
                              {client.legal_name && client.legal_name !== client.name && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                  {client.legal_name}
                                </Typography>
                              )}
                              {client.business_number && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.75rem' }}>
                                  N° {client.business_number}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box>
                            {client.contact_person && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Person fontSize="small" color="action" />
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{client.contact_person}</Typography>
                              </Box>
                            )}
                            {client.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Email fontSize="small" color="action" />
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{client.email}</Typography>
                              </Box>
                            )}
                            {client.phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Phone fontSize="small" color="action" />
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{client.phone}</Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CreditCard fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{client.payment_terms}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          {client.credit_limit ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AttachMoney fontSize="small" color="action" />
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {formatCurrency(client.credit_limit)}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              Non définie
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          {client.ai_payment_risk_score > 0 ? (
                            <Chip
                              label={riskBadge.label}
                              color={riskBadge.color}
                              size="small"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              En attente
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip
                            label={getStatusLabel(client.is_active)}
                            color={getStatusColor(client.is_active)}
                            size="small"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                            {formatDate(client.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/clients/${client.id}`)}
                              sx={{
                                bgcolor: 'rgba(25, 118, 210, 0.08)',
                                color: 'primary.main',
                                width: 32,
                                height: 32,
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
                              onClick={() => navigate(`/clients/${client.id}/edit`)}
                              sx={{
                                bgcolor: 'rgba(66, 66, 66, 0.08)',
                                color: 'text.secondary',
                                width: 32,
                                height: 32,
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
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default Clients;