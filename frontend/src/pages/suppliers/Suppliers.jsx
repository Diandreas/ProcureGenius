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
  Block,
  Public,
  StarBorder,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, parseRating } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

function Suppliers() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['suppliers', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState(''); // Nouveau: filtre rapide
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
      enqueueSnackbar(t('suppliers:messages.loadingError'), { variant: 'error' });
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

    // Nouveau: filtre rapide
    const matchesQuick = !quickFilter || (() => {
      if (quickFilter === 'active') return supplier.status === 'active';
      if (quickFilter === 'inactive') return supplier.status === 'inactive';
      if (quickFilter === 'local') return supplier.is_local;
      if (quickFilter === 'international') return !supplier.is_local;
      if (quickFilter === 'top_rated') return parseRating(supplier.rating) >= 4;
      return true;
    })();

    return matchesSearch && matchesStatus && matchesQuick;
  });

  // Statistiques
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
  const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length;
  const localSuppliers = suppliers.filter(s => s.is_local).length;
  const internationalSuppliers = suppliers.filter(s => !s.is_local).length;
  const topRatedSuppliers = suppliers.filter(s => parseRating(s.rating) >= 4).length;

  const handleQuickFilterClick = (filterValue) => {
    if (quickFilter === filterValue) {
      setQuickFilter('');
    } else {
      setQuickFilter(filterValue);
    }
  };

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
              label={t('suppliers:diversity.minority')}
              size="small"
              color="info"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
          {supplier.is_woman_owned && (
            <Chip
              label={t('suppliers:diversity.woman')}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 18 }}
            />
          )}
          {supplier.is_indigenous && (
            <Chip
              label={t('suppliers:diversity.indigenous')}
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
        {/* Stats Cards - Cliquables pour filtrer */}
        <Grid container spacing={isMobile ? 1 : 2}>
          {/* Actifs */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('active')}
              sx={{
                borderRadius: 2,
                bgcolor: 'success.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'active' ? 'success.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 3, borderColor: 'success.main' }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircle sx={{ fontSize: isMobile ? 20 : 24, color: 'success.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="success.main">
                      {activeSuppliers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('suppliers:filters.active')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Inactifs */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('inactive')}
              sx={{
                borderRadius: 2,
                bgcolor: 'error.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'inactive' ? 'error.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 3, borderColor: 'error.main' }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Block sx={{ fontSize: isMobile ? 20 : 24, color: 'error.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="error.main">
                      {inactiveSuppliers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('suppliers:filters.inactive')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Locaux */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('local')}
              sx={{
                borderRadius: 2,
                bgcolor: 'warning.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'local' ? 'warning.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 3, borderColor: 'warning.main' }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LocalShipping sx={{ fontSize: isMobile ? 20 : 24, color: 'warning.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="warning.main">
                      {localSuppliers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('suppliers:filters.local')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Internationaux */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('international')}
              sx={{
                borderRadius: 2,
                bgcolor: 'info.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'international' ? 'info.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 3, borderColor: 'info.main' }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Public sx={{ fontSize: isMobile ? 20 : 24, color: 'info.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="info.main">
                      {internationalSuppliers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('suppliers:filters.international')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Rated */}
          <Grid item xs={6} sm={2.4}>
            <Card
              onClick={() => handleQuickFilterClick('top_rated')}
              sx={{
                borderRadius: 2,
                bgcolor: quickFilter === 'top_rated' ? 'secondary.100' : 'secondary.50',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: quickFilter === 'top_rated' ? 'secondary.main' : 'transparent',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 3, borderColor: 'secondary.main' }
              }}
            >
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Star sx={{ fontSize: isMobile ? 20 : 24, color: 'secondary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="secondary.main">
                      {topRatedSuppliers}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                      {t('suppliers:filters.topRated')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Indicateur de filtre actif */}
        {quickFilter && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{t('suppliers:filters.activeFilter')}</Typography>
            <Chip
              label={
                quickFilter === 'active' ? t('suppliers:filters.active') :
                quickFilter === 'inactive' ? t('suppliers:filters.inactive') :
                quickFilter === 'local' ? t('suppliers:filters.local') :
                quickFilter === 'international' ? t('suppliers:filters.internationalFull') :
                quickFilter === 'top_rated' ? t('suppliers:filters.topRated') : ''
              }
              onDelete={() => setQuickFilter('')}
              color={
                quickFilter === 'active' ? 'success' :
                quickFilter === 'inactive' ? 'error' :
                quickFilter === 'local' ? 'warning' :
                quickFilter === 'international' ? 'info' :
                quickFilter === 'top_rated' ? 'secondary' : 'default'
              }
              size="small"
            />
          </Box>
        )}
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, borderRadius: 1 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('suppliers:search.placeholder')}
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
                    <InputLabel>{t('suppliers:filters.statusLabel')}</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label={t('suppliers:filters.statusLabel')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('suppliers:filters.all')}</MenuItem>
                      <MenuItem value="active">{t('suppliers:status.active')}</MenuItem>
                      <MenuItem value="pending">{t('suppliers:status.pending')}</MenuItem>
                      <MenuItem value="inactive">{t('suppliers:status.inactive')}</MenuItem>
                      <MenuItem value="blocked">{t('suppliers:status.blocked')}</MenuItem>
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
          title={t('suppliers:messages.noSuppliers')}
          description={t('suppliers:messages.noSuppliersDescription')}
          actionLabel={t('suppliers:newSupplier')}
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
