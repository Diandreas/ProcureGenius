import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, IconButton, Tooltip, CircularProgress, Alert,
  Card, CardContent, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import { Add, Visibility, CheckCircle, Cancel, OpenInNew, FileDownload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import accountingAPI from '../../services/accountingAPI';
import { useModules } from '../../contexts/ModuleContext';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import AccountingNav from './AccountingNav';

const STATUS_COLORS = { draft: 'default', posted: 'success', cancelled: 'error' };
// Libellés traduits au rendu : accounting:status.<status> et accounting:entries.source.<source>
const SOURCE_COLORS = {
  manual: 'default',
  invoice: 'primary',
  invoice_reversal: 'warning',
  payment: 'success',
  purchase_order: 'info',
};
// Construit l'URL du document source pour navigation directe
function getSourceUrl(entry) {
  if (entry.source === 'invoice' || entry.source === 'invoice_reversal') {
    if (entry.source_invoice_id) return `/invoices/${entry.source_invoice_id}`;
    if (entry.reference) return `/invoices?search=${entry.reference}`;
  }
  if (entry.source === 'payment') {
    if (entry.source_invoice_id) return `/invoices/${entry.source_invoice_id}`;
  }
  if (entry.source === 'purchase_order') {
    return `/purchase-orders?search=${entry.reference || ''}`;
  }
  return null;
}

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ journal: '', status: '', start_date: '', end_date: '', search: '' });
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasFeature } = useModules();
  const { format } = useCurrency();
  const { t } = useTranslation(['accounting', 'common']);
  const statusLabel = (status) => t(`accounting:status.${status}`);
  const sourceLabel = (source) => t(`accounting:entries.source.${source}`, { defaultValue: source });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const neu = getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft');

  const load = (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.journal) params.journal = f.journal;
    if (f.status) params.status = f.status;
    if (f.start_date) params.start_date = f.start_date;
    if (f.end_date) params.end_date = f.end_date;
    if (f.search) params.search = f.search;
    accountingAPI.getEntries(params)
      .then((r) => { setEntries(r.data); setError(null); })
      .catch(() => setError(t('accounting:entries.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    accountingAPI.getJournals().then((r) => setJournals(r.data));
    load();
  }, []);

  const setFilter = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    load(updated);
  };

  const handlePost = async (id) => {
    try {
      await accountingAPI.postEntry(id);
      enqueueSnackbar(t('accounting:entries.posted'), { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || t('accounting:entries.postError'), { variant: 'error' });
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm(t('accounting:entries.confirmCancel'))) return;
    try {
      await accountingAPI.cancelEntry(id);
      enqueueSnackbar(t('accounting:entries.cancelled'), { variant: 'warning' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || t('accounting:entries.cancelError'), { variant: 'error' });
    }
  };

  // Export FEC (écritures validées). Reprend la période des filtres si posée,
  // sinon l'année civile en cours (défaut backend).
  const handleExportFEC = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.start_date) params.start = filters.start_date;
      if (filters.end_date) params.end = filters.end_date;
      const res = await accountingAPI.exportFEC(params);
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = match ? match[1] : 'export_fec.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      enqueueSnackbar(t('accounting:entries.fecDownloaded'), { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || t('accounting:entries.fecError'), { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav
        title={t('accounting:entries.title')}
        subtitle={t('accounting:entries.subtitle', { count: entries.length })}
        action={
          <Box display="flex" gap={1}>
            {hasFeature('advanced_exports') && (
              <Tooltip title={t('accounting:entries.fecTooltip')}>
                <Button
                  variant="outlined"
                  startIcon={<FileDownload />}
                  size={isMobile ? 'small' : 'medium'}
                  onClick={handleExportFEC}
                  disabled={exporting}
                >
                  {exporting ? t('accounting:entries.exporting') : t('accounting:entries.exportFec')}
                </Button>
              </Tooltip>
            )}
            <Button
              variant="contained"
              startIcon={<Add />}
              size={isMobile ? 'small' : 'medium'}
              onClick={() => navigate('/accounting/entries/new')}
            >
              {isMobile ? t('accounting:entries.newShort') : t('accounting:entries.newEntry')}
            </Button>
          </Box>
        }
      />

      {/* Filtres */}
      <Box display="flex" gap={1.5} mb={2} flexWrap="wrap">
        <TextField
          size="small" placeholder={t('accounting:entries.searchPlaceholder')}
          value={filters.search} onChange={(e) => setFilter('search', e.target.value)}
          sx={{ flex: '1 1 160px' }}
        />
        <FormControl size="small" sx={{ flex: '1 1 140px' }}>
          <InputLabel>{t('accounting:common.journal')}</InputLabel>
          <Select value={filters.journal} onChange={(e) => setFilter('journal', e.target.value)} label={t('accounting:common.journal')}>
            <MenuItem value="">{t('accounting:common.all')}</MenuItem>
            {journals.map((j) => <MenuItem key={j.id} value={j.id}>{j.code} — {j.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ flex: '1 1 120px' }}>
          <InputLabel>{t('accounting:common.status')}</InputLabel>
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} label={t('accounting:common.status')}>
            <MenuItem value="">{t('accounting:common.all')}</MenuItem>
            <MenuItem value="draft">{statusLabel('draft')}</MenuItem>
            <MenuItem value="posted">{statusLabel('posted')}</MenuItem>
            <MenuItem value="cancelled">{statusLabel('cancelled')}</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" type="date" label={t('accounting:common.from')} InputLabelProps={{ shrink: true }}
          value={filters.start_date} onChange={(e) => setFilter('start_date', e.target.value)}
          sx={{ flex: '1 1 130px', maxWidth: 170 }}
        />
        <TextField size="small" type="date" label={t('accounting:common.to')} InputLabelProps={{ shrink: true }}
          value={filters.end_date} onChange={(e) => setFilter('end_date', e.target.value)}
          sx={{ flex: '1 1 130px', maxWidth: 170 }}
        />
      </Box>

      {loading && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        isMobile ? (
          /* ── Vue mobile : cartes ── */
          <Stack spacing={1.5}>
            {entries.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                {t('accounting:entries.noEntries')}
              </Typography>
            ) : entries.map((e) => (
              <Card key={e.id} elevation={0} sx={{ border: 'none', borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: neu }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box minWidth={0} flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                        <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="text.secondary">
                          {e.entry_number}
                        </Typography>
                        <Chip label={e.journal_code} size="small" variant="outlined" />
                        <Chip label={statusLabel(e.status)} size="small" color={STATUS_COLORS[e.status]} />
                      </Box>
                      <Typography variant="body2" fontWeight={600} noWrap>{e.description}</Typography>
                      {e.reference && (
                        <Typography variant="caption" color="text.secondary">{e.reference}</Typography>
                      )}
                    </Box>
                    <Box textAlign="right" ml={1} flexShrink={0}>
                      <Typography variant="body2" fontWeight={700}>{format(parseFloat(e.total_debit || 0))}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDate(e.date)}</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center"
                    sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}
                  >
                    {(() => {
                      const url = getSourceUrl(e);
                      return url ? (
                        <Chip
                          label={sourceLabel(e.source)}
                          size="small"
                          color={SOURCE_COLORS[e.source] || 'default'}
                          variant="outlined"
                          icon={<OpenInNew sx={{ fontSize: '0.75rem !important' }} />}
                          onClick={() => navigate(url)}
                          sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {sourceLabel(e.source)}
                        </Typography>
                      );
                    })()}
                    <Box>
                      <Tooltip title={t('accounting:entries.viewDetail')}>
                        <IconButton size="small" onClick={() => navigate(`/accounting/entries/${e.id}`)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {e.status === 'draft' && (
                        <Tooltip title={t('accounting:entries.post')}>
                          <IconButton size="small" color="success" onClick={() => handlePost(e.id)}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {e.status === 'posted' && (
                        <Tooltip title={t('accounting:entries.cancelReversal')}>
                          <IconButton size="small" color="error" onClick={() => handleCancel(e.id)}>
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          /* ── Vue desktop : tableau ── */
          <TableContainer component={Paper} elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t('accounting:common.entryNumber')}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t('accounting:common.date')}</strong></TableCell>
                  <TableCell><strong>{t('accounting:common.description')}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t('accounting:common.journal')}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t('accounting:common.source')}</strong></TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><strong>{t('accounting:common.amount')}</strong></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong>{t('accounting:common.status')}</strong></TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}><strong>{t('accounting:common.actions')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{e.entry_number}</Typography>
                    </TableCell>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>{e.description}</Typography>
                      {e.reference && <Typography variant="caption" color="text.secondary">{e.reference}</Typography>}
                    </TableCell>
                    <TableCell><Chip label={e.journal_code} size="small" variant="outlined" /></TableCell>
                    <TableCell>
                      {(() => {
                        const url = getSourceUrl(e);
                        return url ? (
                          <Chip
                            label={sourceLabel(e.source)}
                            size="small"
                            color={SOURCE_COLORS[e.source] || 'default'}
                            variant="outlined"
                            icon={<OpenInNew sx={{ fontSize: '0.75rem !important' }} />}
                            onClick={() => navigate(url)}
                            sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                          />
                        ) : (
                          <Chip label={sourceLabel(e.source)} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        );
                      })()}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>{format(parseFloat(e.total_debit || 0))}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={statusLabel(e.status)} size="small" color={STATUS_COLORS[e.status]} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={t('accounting:entries.viewDetail')}>
                        <IconButton size="small" onClick={() => navigate(`/accounting/entries/${e.id}`)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {e.status === 'draft' && (
                        <Tooltip title={t('accounting:entries.post')}>
                          <IconButton size="small" color="success" onClick={() => handlePost(e.id)}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {e.status === 'posted' && (
                        <Tooltip title={t('accounting:entries.cancelReversal')}>
                          <IconButton size="small" color="error" onClick={() => handleCancel(e.id)}>
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" py={3}>{t('accounting:entries.noEntries')}</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Box>
  );
}
