import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Avatar,
  Stack,
  Rating,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  FilterList,
  Business,
  Email,
  Phone,
  LocationOn,
  Star,
  TrendingUp,
  LocalShipping,
  CheckCircle,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { suppliersAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, parseRating } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

function Suppliers() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersAPI.list();
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement des fournisseurs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = !searchTerm ||
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || supplier.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Statistiques
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
  const localSuppliers = suppliers.filter(s => s.is_local).length;
  const avgRating = suppliers.length > 0
    ? suppliers.reduce((sum, s) => sum + (parseRating(s.rating) || 0), 0) / suppliers.length
    : 0;

  const SupplierCard = ({ supplier }) => (
    <Card
      onClick={() => navigate(`/suppliers/${supplier.id}`)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Avatar
            sx={{
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              bgcolor: 'primary.main',
              borderRadius: 1,
              fontSize: isMobile ? '1.2rem' : '1.5rem',
            }}
          >
            {supplier.name?.charAt(0)?.toUpperCase() || '?'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                fontSize: isMobile ? '0.875rem' : '0.95rem',
              }}
            >
              {supplier.name}
            </Typography>
            {parseRating(supplier.rating) > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Rating
                  value={parseRating(supplier.rating)}
                  readOnly
                  size="small"
                  sx={{ fontSize: '0.9rem' }}
                />
                <Typography variant="caption" color="text.secondary">
                  ({parseRating(supplier.rating).toFixed(1)})
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Infos de contact */}
        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          {supplier.contact_person && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {supplier.contact_person}
              </Typography>
            </Box>
          )}

          {supplier.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {supplier.email}
              </Typography>
            </Box>
          )}

          {supplier.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {supplier.phone}
              </Typography>
            </Box>
          )}

          {(supplier.city || supplier.province) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {[supplier.city, supplier.province].filter(Boolean).join(', ')}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Footer - Tags diversité */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
          <Chip
            label={getStatusLabel(supplier.status)}
            size="small"
            color={getStatusColor(supplier.status)}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          {supplier.is_local && (
            <Chip
              label="Local"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
          {supplier.is_minority_owned && (
            <Chip
              label="Minorité"
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
          {supplier.is_woman_owned && (
            <Chip
              label="Femme"
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
          {supplier.is_indigenous && (
            <Chip
              label="Autochtone"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Header avec stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
          Fournisseurs
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'primary.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Business sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="primary">
                      {totalSuppliers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'success.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircle sx={{ fontSize: isMobile ? 20 : 24, color: 'success.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="success.main">
                      {activeSuppliers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Actifs
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'warning.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LocalShipping sx={{ fontSize: isMobile ? 20 : 24, color: 'warning.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="warning.main">
                      {localSuppliers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Locaux
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'info.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Star sx={{ fontSize: isMobile ? 20 : 24, color: 'info.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="info.main">
                      {avgRating.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Note moy.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, borderRadius: 1 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher un fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              />
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  bgcolor: showFilters ? 'primary.main' : 'transparent',
                  color: showFilters ? 'white' : 'inherit',
                  '&:hover': {
                    bgcolor: showFilters ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <FilterList />
              </IconButton>
            </Box>

            {showFilters && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label="Statut"
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="active">Actif</MenuItem>
                      <MenuItem value="pending">En attente</MenuItem>
                      <MenuItem value="inactive">Inactif</MenuItem>
                      <MenuItem value="blocked">Bloqué</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <EmptyState
          title="Aucun fournisseur"
          description="Aucun fournisseur ne correspond à vos critères de recherche."
          actionLabel="Nouveau fournisseur"
          onAction={() => navigate('/suppliers/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredSuppliers.map((supplier) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={supplier.id}>
              <SupplierCard supplier={supplier} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default Suppliers;
