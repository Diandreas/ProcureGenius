import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Card, CardContent, Typography, IconButton, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Grid, Chip, Avatar, Stack,
  Button, Divider, useMediaQuery, useTheme, Tabs, Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Search, FilterList, Description, AttachMoney, CheckCircle, Schedule,
  Gavel, TrendingUp, Warning, Edit, FactCheck, CalendarToday,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { contractsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ContractTemplatesTab from '../../components/ContractTemplatesTab';
import { useHeader } from '../../contexts/HeaderContext';

const STATUS_COLOR_MAP = {
  draft: '#94a3b8',
  pending_review: '#f59e0b',
  pending_approval: '#f59e0b',
  approved: '#3b82f6',
  active: '#10b981',
  expiring_soon: '#f97316',
  expired: '#ef4444',
  terminated: '#ef4444',
  renewed: '#8b5cf6',
};

function Contracts() {
  const { t } = useTranslation(['contracts', 'common']);
  const { format: formatCurrency } = useCurrency();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { setPageHeader } = useHeader();

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

  useEffect(() => {
    setPageHeader({
      title: t('contracts:title', 'Contrats'),
      actions: (
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FactCheck />}
            onClick={() => navigate('/contracts/analyze')}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, px: { xs: 1.5, sm: 2.5 } }}
          >
            {t('contracts:analyzer.cta', 'Analyser un contrat')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Description />}
            onClick={() => navigate('/contracts/new')}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              px: { xs: 2, sm: 3 },
              boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
            }}
          >
            {t('navigation:topBar.newContract', 'Nouveau contrat')}
          </Button>
        </Box>
      )
    });
    return () => setPageHeader({ title: '', actions: null });
  }, [t, navigate, theme.palette.primary.main, setPageHeader]);

  const getStatusLabel = (status) => {
    const labels = {
      draft: t('contracts:status.draft', 'Brouillon'),
      pending_review: t('contracts:contractStatus.pending_review', 'En révision'),
      pending_approval: t('contracts:contractStatus.pending_approval', 'En approbation'),
      approved: t('contracts:status.approved', 'Approuvé'),
      active: t('contracts:status.active', 'Actif'),
      expiring_soon: t('contracts:contractStatus.expiring_soon', 'Expire bientôt'),
      expired: t('contracts:status.expired', 'Expiré'),
      terminated: t('contracts:status.terminated', 'Résilié'),
      renewed: t('contracts:contractStatus.renewed', 'Renouvelé'),
    };
    return labels[status] || status;
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = !searchTerm ||
      contract.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const expiring = contracts.filter(c => {
    if (!c.end_date) return false;
    const diff = (new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;
  const totalValue = contracts.reduce((sum, c) => sum + (c.total_value || 0), 0);

  const kpiCards = [
    {
      label: t('contracts:labels.totalContracts', 'Total'),
      value: totalContracts,
      icon: <Description />,
      color: theme.palette.primary.main,
    },
    {
      label: t('contracts:labels.activeContracts', 'Actifs'),
      value: activeContracts,
      icon: <CheckCircle />,
      color: '#10b981',
    },
    {
      label: t('contracts:labels.expiringSoon', 'Expire ≤ 30j'),
      value: expiring,
      icon: <Warning />,
      color: '#f97316',
    },
    {
      label: t('contracts:labels.totalValue', 'Valeur totale'),
      value: formatCurrency(totalValue),
      icon: <AttachMoney />,
      color: '#3b82f6',
      isAmount: true,
    },
  ];

  const ContractRow = ({ contract, index, isLast }) => {
    const statusColor = STATUS_COLOR_MAP[contract.status] || '#94a3b8';
    const displayTitle = contract.title || contract.contract_type || '—';
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
        style={{ borderLeft: `3px solid ${statusColor}` }}
      >
        <Box
          onClick={() => navigate(`/contracts/${contract.id}`)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: isMobile ? 1.5 : 2.5,
            py: isMobile ? 1.25 : 1,
            cursor: 'pointer',
            borderBottom: isLast ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.35)}`,
            transition: 'background 0.15s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              '& .contract-actions': { opacity: 1 },
            },
            minHeight: isMobile ? 52 : 48,
          }}
        >
          {isMobile ? (
            <>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayTitle}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                  {contract.contract_number}{contract.supplier_name ? ` · ${contract.supplier_name}` : ''}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
                {contract.total_value > 0 && (
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    {formatCurrency(contract.total_value)}
                  </Typography>
                )}
                <Chip
                  label={getStatusLabel(contract.status)}
                  size="small"
                  sx={{ height: 16, fontSize: '0.58rem', mt: 0.25, bgcolor: alpha(statusColor, 0.12), color: statusColor, border: 'none' }}
                />
              </Box>
            </>
          ) : (
            <>
              {/* Numéro */}
              <Box sx={{ width: 140, flexShrink: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary', fontFamily: 'monospace' }}>
                  {contract.contract_number || '—'}
                </Typography>
              </Box>
              {/* Titre + fournisseur */}
              <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.825rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayTitle}
                </Typography>
                {contract.supplier_name && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
                    {contract.supplier_name}
                  </Typography>
                )}
              </Box>
              {/* Montant */}
              <Box sx={{ width: 120, textAlign: 'right', flexShrink: 0, pr: 2 }}>
                {contract.total_value > 0 && (
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {formatCurrency(contract.total_value)}
                  </Typography>
                )}
              </Box>
              {/* Statut */}
              <Box sx={{ width: 120, flexShrink: 0, pr: 2 }}>
                <Chip
                  label={getStatusLabel(contract.status)}
                  size="small"
                  sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha(statusColor, 0.1), color: statusColor, border: `1px solid ${alpha(statusColor, 0.2)}` }}
                />
              </Box>
              {/* Date fin */}
              <Box sx={{ width: 100, flexShrink: 0, pr: 2 }}>
                {contract.end_date && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
                    {formatDate(contract.end_date)}
                  </Typography>
                )}
              </Box>
              {/* Actions */}
              <Box
                className="contract-actions"
                sx={{ opacity: 0, transition: 'opacity 0.15s', display: 'flex', gap: 0.5, flexShrink: 0 }}
                onClick={e => e.stopPropagation()}
              >
                <IconButton
                  size="small"
                  onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', width: 28, height: 28 }}
                >
                  <Edit sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </>
          )}
        </Box>
      </motion.div>
    );
  };

  // Vignette contrat (carte) — affichage en grille, cohérent avec les autres modules.
  const ContractCard = ({ contract, index }) => {
    const statusColor = STATUS_COLOR_MAP[contract.status] || '#94a3b8';
    const displayTitle = contract.title || contract.contract_type || '—';
    const expSoon = (() => {
      if (!contract.end_date) return false;
      const diff = (new Date(contract.end_date) - new Date()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    })();
    return (
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.3) }}
          style={{ height: '100%' }}
        >
          <Card
            onClick={() => navigate(`/contracts/${contract.id}`)}
            sx={{
              height: '100%', borderRadius: 3, cursor: 'pointer', position: 'relative',
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              borderTop: `3px solid ${statusColor}`,
              boxShadow: theme.palette.mode === 'light'
                ? '6px 6px 16px #d6dce8, -6px -6px 16px #ffffff'
                : '6px 6px 16px #14191f, -6px -6px 16px #283041',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: `0 14px 30px -12px ${alpha(statusColor, 0.5)}`,
                '& .contract-edit': { opacity: 1 },
              },
            }}
          >
            <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Statut + édition */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                <Chip
                  label={getStatusLabel(contract.status)}
                  size="small"
                  sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: alpha(statusColor, 0.12), color: statusColor, border: 'none' }}
                />
                <IconButton
                  className="contract-edit"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${contract.id}/edit`); }}
                  sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity 0.15s', width: 28, height: 28, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}
                >
                  <Edit sx={{ fontSize: 15 }} />
                </IconButton>
              </Box>

              {/* Titre */}
              <Typography sx={{
                fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3, mb: 0.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {displayTitle}
              </Typography>

              {/* Numéro */}
              <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                {contract.contract_number || '—'}
              </Typography>

              {/* Fournisseur */}
              {contract.supplier_name && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
                  <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
                    {contract.supplier_name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contract.supplier_name}
                  </Typography>
                </Box>
              )}

              <Box sx={{ flex: 1 }} />
              <Divider sx={{ my: 1.5 }} />

              {/* Pied : dates + montant */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: expSoon ? '#f97316' : 'text.disabled' }}>
                  <CalendarToday sx={{ fontSize: 13 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: expSoon ? 700 : 400 }}>
                    {contract.end_date ? formatDate(contract.end_date) : '—'}
                  </Typography>
                </Box>
                {contract.total_value > 0 && (
                  <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    {formatCurrency(contract.total_value)}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Grid>
    );
  };

  if (loading) {
    return <LoadingState message={t('contracts:messages.loading', 'Chargement des contrats...')} />;
  }

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Tabs
        value={activeTab}
        onChange={(e, val) => setActiveTab(val)}
        sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
      >
        <Tab label="Contrats" />
        <Tab label="Modèles" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {/* KPI Cards */}
          <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 3 }}>
            {kpiCards.map((kpi, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                >
                  <Card
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${alpha(kpi.color, 0.2)}`,
                      background: `linear-gradient(135deg, ${alpha(kpi.color, 0.06)} 0%, transparent 100%)`,
                      boxShadow: `0 2px 12px ${alpha(kpi.color, 0.08)}`,
                    }}
                  >
                    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, bgcolor: alpha(kpi.color, 0.12), color: kpi.color, borderRadius: 1.5 }}>
                          {React.cloneElement(kpi.icon, { sx: { fontSize: isMobile ? 18 : 22 } })}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant={isMobile ? 'subtitle1' : 'h5'}
                            fontWeight="bold"
                            sx={{ color: kpi.color, fontSize: kpi.isAmount ? (isMobile ? '0.85rem' : '1.1rem') : undefined, lineHeight: 1.2 }}
                          >
                            {kpi.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {kpi.label}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Card unique : search + liste */}
          <Card sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.5)}`, overflow: 'hidden' }}>
            {/* Toolbar search */}
            <Box sx={{ px: isMobile ? 1.5 : 2, py: 1.25, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`, display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('contracts:search.placeholder', 'Rechercher un contrat...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.default' } }}
              />
              <IconButton
                size="small"
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  borderRadius: 1.5,
                  bgcolor: showFilters ? 'primary.main' : 'transparent',
                  color: showFilters ? 'white' : 'text.secondary',
                  border: `1px solid ${showFilters ? 'primary.main' : alpha(theme.palette.divider, 0.8)}`,
                  '&:hover': { bgcolor: showFilters ? 'primary.dark' : alpha(theme.palette.action.hover, 0.8) },
                }}
              >
                <FilterList sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {showFilters && (
              <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`, bgcolor: alpha(theme.palette.action.hover, 0.2) }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>{t('contracts:labels.status', 'Statut')}</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label={t('contracts:labels.status', 'Statut')}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">{t('contracts:filters.all', 'Tous')}</MenuItem>
                    <MenuItem value="draft">{t('contracts:status.draft', 'Brouillon')}</MenuItem>
                    <MenuItem value="approved">{t('contracts:status.approved', 'Approuvé')}</MenuItem>
                    <MenuItem value="active">{t('contracts:status.active', 'Actif')}</MenuItem>
                    <MenuItem value="expiring_soon">Expire bientôt</MenuItem>
                    <MenuItem value="expired">{t('contracts:status.expired', 'Expiré')}</MenuItem>
                    <MenuItem value="terminated">{t('contracts:status.terminated', 'Résilié')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

          </Card>

          {/* Liste en vignettes (cartes) */}
          {filteredContracts.length === 0 ? (
            <Box sx={{ mt: 2 }}>
              <EmptyState
                title={t('contracts:labels.noContracts', 'Aucun contrat')}
                description={t('contracts:labels.noContractsDescription', 'Créez votre premier contrat')}
                actionLabel={t('contracts:newContract', 'Nouveau contrat')}
                onAction={() => navigate('/contracts/new')}
              />
            </Box>
          ) : (
            <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mt: 0.5 }}>
              {filteredContracts.map((contract, index) => (
                <ContractCard key={contract.id} contract={contract} index={index} />
              ))}
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <ContractTemplatesTab />
        </Box>
      )}
    </Box>
  );
}

export default Contracts;
