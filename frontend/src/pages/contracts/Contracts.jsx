import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, IconButton, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Grid, Chip, Avatar, Stack,
  CircularProgress, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Search, FilterList, Description, AttachMoney, CheckCircle, Schedule,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { contractsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';

function Contracts() {
  const { t } = useTranslation(['contracts', 'common']);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await contractsAPI.list();
      setContracts(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { draft: 'default', active: 'success', expired: 'error', cancelled: 'error' };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: t('contracts:status.draft'),
      active: t('contracts:status.active'),
      expired: t('contracts:status.expired'),
      cancelled: t('contracts:status.terminated'),
    };
    return labels[status] || status;
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = !searchTerm ||
      contract.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const expiring = contracts.filter(c => {
    if (!c.end_date) return false;
    const end = new Date(c.end_date);
    const now = new Date();
    const diff = (end - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;
  const totalValue = contracts.reduce((sum, c) => sum + (c.total_value || 0), 0);

  const ContractCard = ({ contract }) => (
    <Card
      onClick={() => navigate(`/contracts/${contract.id}`)}
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
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Avatar
            sx={{
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              bgcolor: 'primary.main',
              borderRadius: 1,
            }}
          >
            <Description />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                fontSize: isMobile ? '0.875rem' : '0.95rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {contract.title}
            </Typography>
            {contract.contract_number && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.75rem', display: 'block' }}
              >
                {contract.contract_number}
              </Typography>
            )}
          </Box>
        </Box>

        {contract.total_value > 0 && (
          <Box
            sx={{
              bgcolor: 'success.50',
              borderRadius: 1,
              p: 1,
              mb: 1.5,
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h6"
              color="success.main"
              sx={{ fontWeight: 700, fontSize: isMobile ? '1.1rem' : '1.25rem' }}
            >
              {formatCurrency(contract.total_value)}
            </Typography>
          </Box>
        )}

        <Stack spacing={0.75}>
          {contract.end_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {t('contracts:labels.endDate')}: {formatDate(contract.end_date)}
              </Typography>
            </Box>
          )}
        </Stack>

        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={getStatusLabel(contract.status)}
            size="small"
            color={getStatusColor(contract.status)}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={isMobile ? 1 : 2}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderRadius: 1, bgcolor: 'primary.50' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Description sx={{ fontSize: isMobile ? 20 : 24, color: 'primary.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="primary">
                      {totalContracts}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('contracts:labels.totalContracts')}
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
                      {activeContracts}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('contracts:labels.activeContracts')}
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
                  <Schedule sx={{ fontSize: isMobile ? 20 : 24, color: 'warning.main' }} />
                  <Box>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" color="warning.main">
                      {expiring}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('contracts:labels.expiringSoon')}
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
                  <AttachMoney sx={{ fontSize: isMobile ? 20 : 24, color: 'info.main' }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant={isMobile ? 'subtitle2' : 'h6'}
                      fontWeight="bold"
                      color="info.main"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: isMobile ? '0.9rem' : '1.25rem',
                      }}
                    >
                      {formatCurrency(totalValue)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('contracts:labels.totalValue')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Card sx={{ mb: 3, borderRadius: 1 }}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('contracts:search.placeholder')}
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
                    <InputLabel>{t('contracts:labels.status')}</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      label={t('contracts:labels.status')}
                      sx={{ borderRadius: 1 }}
                    >
                      <MenuItem value="">{t('contracts:filters.all')}</MenuItem>
                      <MenuItem value="draft">{t('contracts:status.draft')}</MenuItem>
                      <MenuItem value="active">{t('contracts:status.active')}</MenuItem>
                      <MenuItem value="expired">{t('contracts:status.expired')}</MenuItem>
                      <MenuItem value="cancelled">{t('contracts:status.terminated')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}
          </Stack>
        </CardContent>
      </Card>

      {filteredContracts.length === 0 ? (
        <EmptyState
          title={t('contracts:labels.noContracts')}
          description={t('contracts:labels.noContractsDescription')}
          actionLabel={t('contracts:newContract')}
          onAction={() => navigate('/contracts/new')}
        />
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
          {filteredContracts.map((contract) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={contract.id}>
              <ContractCard contract={contract} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default Contracts;
