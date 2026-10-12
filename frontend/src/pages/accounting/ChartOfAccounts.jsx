import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Alert,
  Card, CardContent, Stack, useMediaQuery, useTheme,
} from '@mui/material';
import { Add, Edit, Delete, AutoFixHigh } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import accountingAPI from '../../services/accountingAPI';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import AccountingNav from './AccountingNav';

const TYPE_COLORS = {
  asset: 'primary', liability: 'warning', equity: 'secondary', revenue: 'success', expense: 'error',
};
// Libellés traduits au rendu : accounting:accountTypes.<type> et accounting:accountTypeSections.<type>
// Ordre d'affichage des classes de comptes (présentation standard d'un plan comptable)
const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const EMPTY_FORM = { code: '', name: '', account_type: 'asset', parent: '', notes: '' };

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['accounting', 'common']);
  const typeLabel = (type) => t(`accounting:accountTypes.${type}`);
  const sectionLabel = (type) => t(`accounting:accountTypeSections.${type}`);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const neu = getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft');

  const handleInitSetup = async () => {
    setInitializing(true);
    try {
      const r = await accountingAPI.initSetup();
      enqueueSnackbar(
        t('accounting:chart.initSuccess', { accounts: r.data.accounts_created, journals: r.data.journals_created }),
        { variant: 'success' }
      );
      load();
    } catch {
      enqueueSnackbar(t('accounting:chart.initError'), { variant: 'error' });
    } finally {
      setInitializing(false);
    }
  };

  const load = () => {
    setLoading(true);
    accountingAPI.getAccounts({ active: 'true' })
      .then((r) => { setAccounts(r.data); setError(null); })
      .catch(() => setError(t('accounting:chart.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = accounts.filter((a) => {
    if (filterType && a.account_type !== filterType) return false;
    if (search && !`${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (acc) => {
    setEditing(acc);
    setForm({ code: acc.code, name: acc.name, account_type: acc.account_type, parent: acc.parent || '', notes: acc.notes || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      enqueueSnackbar(t('accounting:chart.requiredFields'), { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, parent: form.parent || null };
      if (editing) {
        await accountingAPI.updateAccount(editing.id, payload);
        enqueueSnackbar(t('accounting:chart.updated'), { variant: 'success' });
      } else {
        await accountingAPI.createAccount(payload);
        enqueueSnackbar(t('accounting:chart.created'), { variant: 'success' });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.code?.[0] || t('accounting:common.error');
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (acc) => {
    if (!window.confirm(t('accounting:chart.confirmDelete', { code: acc.code, name: acc.name }))) return;
    try {
      await accountingAPI.deleteAccount(acc.id);
      enqueueSnackbar(t('accounting:chart.deleted'), { variant: 'success' });
      load();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.error || t('accounting:chart.deleteError'), { variant: 'error' });
    }
  };

  // Regroupe les comptes filtrés par classe, dans l'ordre comptable standard,
  // triés par code à l'intérieur de chaque classe.
  const grouped = TYPE_ORDER
    .map((type) => [type, filtered
      .filter((a) => a.account_type === type)
      .sort((a, b) => String(a.code).localeCompare(String(b.code)))])
    .filter(([, list]) => list.length > 0);

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <AccountingNav
        title={t('accounting:chart.title')}
        subtitle={t('accounting:chart.subtitle', { count: accounts.length })}
        action={
          <Button variant="contained" startIcon={<Add />} size={isMobile ? 'small' : 'medium'} onClick={openAdd}>
            {isMobile ? t('accounting:chart.newShort') : t('accounting:chart.newAccount')}
          </Button>
        }
      />

      {/* Filtres */}
      <Box display="flex" gap={1.5} mb={2} flexWrap="wrap">
        <TextField size="small" placeholder={t('accounting:chart.searchPlaceholder')} value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ flex: '1 1 200px' }} />
        <FormControl size="small" sx={{ flex: '1 1 160px' }}>
          <InputLabel>{t('accounting:chart.accountType')}</InputLabel>
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} label={t('accounting:chart.accountType')}>
            <MenuItem value="">{t('accounting:common.all')}</MenuItem>
            {TYPE_ORDER.map((k) => <MenuItem key={k} value={k}>{typeLabel(k)}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {loading && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Banner : plan comptable vide → proposer l'initialisation */}
      {!loading && !error && accounts.length === 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={initializing ? <CircularProgress size={14} color="inherit" /> : <AutoFixHigh />}
              onClick={handleInitSetup}
              disabled={initializing}
            >
              {t('accounting:chart.initialize')}
            </Button>
          }
        >
          <strong>{t('accounting:chart.emptyTitle')}</strong> {t('accounting:chart.emptyText')}
        </Alert>
      )}

      {!loading && !error && (
        filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            {t('accounting:chart.noAccounts')}
          </Typography>
        ) : isMobile ? (
          /* ── Vue mobile : cartes groupées par classe ── */
          <Stack spacing={2.5}>
            {grouped.map(([type, list]) => (
              <Box key={type}>
                <Box display="flex" alignItems="center" gap={1} mb={1} px={0.5}>
                  <Typography variant="overline" fontWeight={700} color="text.secondary">
                    {sectionLabel(type)}
                  </Typography>
                  <Chip label={list.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                </Box>
                <Stack spacing={1.25}>
                  {list.map((acc) => (
                    <Card key={acc.id} elevation={0} sx={{ border: 'none', borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: neu }}>
                      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                          <Box minWidth={0} flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                              <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{acc.code}</Typography>
                              <Chip label={typeLabel(acc.account_type)} size="small" color={TYPE_COLORS[acc.account_type] || 'default'} />
                            </Box>
                            <Typography variant="body2" fontWeight={600}>{acc.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {acc.parent
                                ? t('accounting:chart.parentLabel', { code: accounts.find((a) => a.id === acc.parent)?.code || '—' })
                                : t('accounting:chart.rootAccount')}
                            </Typography>
                          </Box>
                          <Box flexShrink={0}>
                            <IconButton size="small" onClick={() => openEdit(acc)}><Edit fontSize="small" /></IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={acc.has_transactions}
                              onClick={() => handleDelete(acc)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          /* ── Vue desktop : tableau groupé par classe ── */
          <TableContainer component={Paper} elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>{t('accounting:common.code')}</strong></TableCell>
                  <TableCell><strong>{t('accounting:common.label')}</strong></TableCell>
                  <TableCell><strong>{t('accounting:common.type')}</strong></TableCell>
                  <TableCell><strong>{t('accounting:chart.parentAccount')}</strong></TableCell>
                  <TableCell align="center"><strong>{t('accounting:common.actions')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grouped.map(([type, list]) => (
                  <React.Fragment key={type}>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ bgcolor: 'action.hover', py: 0.75 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                          {sectionLabel(type)} · {list.length}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {list.map((acc) => (
                      <TableRow key={acc.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{acc.code}</Typography>
                        </TableCell>
                        <TableCell>{acc.name}</TableCell>
                        <TableCell>
                          <Chip label={typeLabel(acc.account_type)} size="small" color={TYPE_COLORS[acc.account_type] || 'default'} />
                        </TableCell>
                        <TableCell>
                          {acc.parent
                            ? accounts.find((a) => a.id === acc.parent)?.code || '—'
                            : <Typography variant="caption" color="text.secondary">{t('accounting:chart.root')}</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={t('accounting:common.edit')}>
                            <IconButton size="small" onClick={() => openEdit(acc)}><Edit fontSize="small" /></IconButton>
                          </Tooltip>
                          {acc.has_transactions ? (
                            <Tooltip title={t('accounting:chart.cannotDelete')}>
                              <span>
                                <IconButton size="small" color="error" disabled><Delete fontSize="small" /></IconButton>
                              </span>
                            </Tooltip>
                          ) : (
                            <Tooltip title={t('accounting:common.delete')}>
                              <IconButton size="small" color="error" onClick={() => handleDelete(acc)}><Delete fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('accounting:chart.editAccount') : t('accounting:chart.newAccount')}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <Box display="flex" gap={2}>
              <TextField label={t('accounting:chart.numberField')} value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                sx={{ width: 150 }} placeholder={t('accounting:chart.numberPlaceholder')} />
              <TextField label={t('accounting:chart.nameField')} value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
            </Box>
            <FormControl fullWidth>
              <InputLabel>{t('accounting:chart.typeField')}</InputLabel>
              <Select value={form.account_type} onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
                label={t('accounting:chart.typeField')}>
                {TYPE_ORDER.map((k) => <MenuItem key={k} value={k}>{typeLabel(k)}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('accounting:chart.parentOptional')}</InputLabel>
              <Select value={form.parent} onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
                label={t('accounting:chart.parentOptional')}>
                <MenuItem value="">{t('accounting:chart.noParent')}</MenuItem>
                {accounts.filter((a) => !editing || a.id !== editing.id).map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label={t('accounting:common.notes')} value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} multiline rows={2} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('accounting:common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (editing ? t('accounting:common.update') : t('accounting:common.create'))}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
