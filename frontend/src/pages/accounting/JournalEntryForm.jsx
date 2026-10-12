import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  Paper, IconButton, Alert, CircularProgress, Card, CardContent, Divider, Chip,
  Stack, useMediaQuery, useTheme,
} from '@mui/material';
import { Add, Delete, Save, CheckCircle } from '@mui/icons-material';
import AccountingTooltip from '../../components/accounting/AccountingTooltip';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import AccountingNav from './AccountingNav';

const EMPTY_LINE = { account: '', description: '', debit: '', credit: '' };

export default function JournalEntryForm() {
  const [journals, setJournals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    journal: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
  });
  const [lines, setLines] = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { format } = useCurrency();
  const { t } = useTranslation(['accounting', 'common']);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const neu = getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft');

  useEffect(() => {
    Promise.all([accountingAPI.getJournals(), accountingAPI.getAccounts({ active: 'true' })])
      .then(([j, a]) => { setJournals(j.data); setAccounts(a.data); });
  }, []);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const diff = totalDebit - totalCredit;

  const setLine = (i, key, value) => {
    const updated = lines.map((l, idx) => idx === i ? { ...l, [key]: value } : l);
    if (key === 'debit' && value) updated[i].credit = '';
    if (key === 'credit' && value) updated[i].debit = '';
    setLines(updated);
  };

  const addLine = () => setLines((l) => [...l, { ...EMPTY_LINE }]);
  const removeLine = (i) => setLines((l) => l.filter((_, idx) => idx !== i));

  const buildPayload = () => ({
    ...form,
    lines: lines
      .filter((l) => l.account)
      .map((l) => ({
        account: l.account,
        description: l.description,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
  });

  const validate = () => {
    if (!form.journal) { enqueueSnackbar(t('accounting:entryForm.journalRequired'), { variant: 'error' }); return false; }
    if (!form.description.trim()) { enqueueSnackbar(t('accounting:entryForm.descriptionRequired'), { variant: 'error' }); return false; }
    const validLines = lines.filter((l) => l.account && (parseFloat(l.debit) || parseFloat(l.credit)));
    if (validLines.length < 2) { enqueueSnackbar(t('accounting:entryForm.minLines'), { variant: 'error' }); return false; }
    return true;
  };

  const handleSave = async (post = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await accountingAPI.createEntry(buildPayload());
      const entry = res.data;
      if (post) {
        await accountingAPI.postEntry(entry.id);
        enqueueSnackbar(t('accounting:entryForm.createdPosted'), { variant: 'success' });
      } else {
        enqueueSnackbar(t('accounting:entryForm.savedDraft'), { variant: 'success' });
      }
      navigate(`/accounting/entries/${entry.id}`);
    } catch (err) {
      const msg = err?.response?.data?.error || JSON.stringify(err?.response?.data) || t('accounting:common.error');
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={{ xs: 2, sm: 3 }} maxWidth={960}>
      <AccountingNav title={t('accounting:entryForm.title')} subtitle={t('accounting:entryForm.subtitle')} />

      {/* En-tête */}
      <Card elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl required sx={{ flex: '1 1 200px' }}>
              <InputLabel>{t('accounting:entryForm.journalField')}</InputLabel>
              <Select value={form.journal} onChange={(e) => setForm((f) => ({ ...f, journal: e.target.value }))} label={t('accounting:entryForm.journalField')}>
                {journals.map((j) => <MenuItem key={j.id} value={j.id}>{j.code} — {j.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label={t('accounting:entryForm.dateField')} type="date" value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ flex: '1 1 150px' }} />
            <TextField label={t('accounting:entryForm.descriptionField')} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              sx={{ flex: '1 1 100%' }} />
            <TextField label={t('accounting:common.reference')} value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              sx={{ flex: '1 1 180px' }} />
          </Box>
        </CardContent>
      </Card>

      {/* Lignes */}
      <Typography variant="subtitle1" fontWeight={600} mb={1}>{t('accounting:entryDetail.lines')}</Typography>
      {isMobile ? (
        /* ── Vue mobile : éditeur en cartes ── */
        <Stack spacing={1.5} mb={2}>
          {lines.map((line, i) => (
            <Card key={i} elevation={0} sx={{ border: 'none', borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: neu }}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('accounting:entryForm.lineNumber', { number: i + 1 })}</Typography>
                  {lines.length > 2 && (
                    <IconButton size="small" color="error" onClick={() => removeLine(i)}><Delete fontSize="small" /></IconButton>
                  )}
                </Box>
                <FormControl fullWidth size="small" sx={{ mb: 1.25 }}>
                  <Select value={line.account} onChange={(e) => setLine(i, 'account', e.target.value)}
                    displayEmpty
                    renderValue={(v) => {
                      if (!v) return <Typography color="text.secondary" variant="body2">{t('accounting:entryForm.selectAccount')}</Typography>;
                      const acc = accounts.find((a) => a.id === v);
                      return acc ? `${acc.code} — ${acc.name}` : v;
                    }}>
                    {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField value={line.description} onChange={(e) => setLine(i, 'description', e.target.value)}
                  size="small" fullWidth placeholder={t('accounting:entryForm.lineDescription')} sx={{ mb: 1.25 }} />
                <Box display="flex" gap={1.5}>
                  <TextField label={t('accounting:common.debit')} value={line.debit} onChange={(e) => setLine(i, 'debit', e.target.value)}
                    size="small" type="number" fullWidth inputProps={{ min: 0, step: '0.01' }} placeholder="0.00" />
                  <TextField label={t('accounting:common.credit')} value={line.credit} onChange={(e) => setLine(i, 'credit', e.target.value)}
                    size="small" type="number" fullWidth inputProps={{ min: 0, step: '0.01' }} placeholder="0.00" />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        /* ── Vue desktop : tableau ── */
        <Paper elevation={0} sx={{ border: 'none', borderRadius: 3, boxShadow: neu, mb: 2, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ minWidth: 240 }}><strong>{t('accounting:common.account')}</strong></TableCell>
                <TableCell><strong>{t('accounting:common.description')}</strong></TableCell>
                <TableCell align="right" sx={{ width: 140 }}><strong><AccountingTooltip term="debit">{t('accounting:common.debit')}</AccountingTooltip></strong></TableCell>
                <TableCell align="right" sx={{ width: 140 }}><strong><AccountingTooltip term="credit">{t('accounting:common.credit')}</AccountingTooltip></strong></TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Select value={line.account} onChange={(e) => setLine(i, 'account', e.target.value)}
                      displayEmpty size="small" fullWidth
                      renderValue={(v) => {
                        if (!v) return <Typography color="text.secondary" variant="body2">{t('accounting:entryForm.select')}</Typography>;
                        const acc = accounts.find((a) => a.id === v);
                        return acc ? `${acc.code} — ${acc.name}` : v;
                      }}>
                      {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField value={line.description} onChange={(e) => setLine(i, 'description', e.target.value)}
                      size="small" fullWidth placeholder={t('accounting:entryForm.lineDescriptionShort')} />
                  </TableCell>
                  <TableCell>
                    <TextField value={line.debit} onChange={(e) => setLine(i, 'debit', e.target.value)}
                      size="small" type="number" inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                      placeholder="0.00" />
                  </TableCell>
                  <TableCell>
                    <TextField value={line.credit} onChange={(e) => setLine(i, 'credit', e.target.value)}
                      size="small" type="number" inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                      placeholder="0.00" />
                  </TableCell>
                  <TableCell>
                    {lines.length > 2 && (
                      <IconButton size="small" color="error" onClick={() => removeLine(i)}><Delete fontSize="small" /></IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Button startIcon={<Add />} onClick={addLine} size="small" sx={{ mb: 3 }}>{t('accounting:entryForm.addLine')}</Button>

      {/* Totaux */}
      <Box display="flex" justifyContent={{ xs: 'stretch', sm: 'flex-end' }} mb={3}>
        <Box sx={{ borderRadius: 3, boxShadow: neu, bgcolor: 'background.paper', p: 2, width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 260 } }}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">{t('accounting:common.totalDebit')}</Typography>
            <Typography variant="body2" fontWeight={600} color="primary.main">{format(totalDebit)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2">{t('accounting:common.totalCredit')}</Typography>
            <Typography variant="body2" fontWeight={600} color="secondary.main">{format(totalCredit)}</Typography>
          </Box>
          <Divider />
          <Box display="flex" justifyContent="space-between" mt={1} alignItems="center">
            <Typography variant="body2">{t('accounting:entryForm.difference')}</Typography>
            {isBalanced ? (
              <Chip label={`${t('accounting:entryForm.balanced')} `} color="success" size="small" />
            ) : (
              <Chip label={t('accounting:entryForm.differenceChip', { amount: `${diff > 0 ? '+' : ''}${format(diff)}` })} color="error" size="small" />
            )}
          </Box>
        </Box>
      </Box>

      {!isBalanced && totalDebit > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('accounting:entryForm.mustBalance', { amount: format(Math.abs(diff)) })}
        </Alert>
      )}

      <Box display="flex" gap={1.5} flexWrap="wrap">
        <Button variant="outlined" onClick={() => navigate('/accounting/entries')}>{t('accounting:common.cancel')}</Button>
        <Button variant="outlined" startIcon={<Save />} onClick={() => handleSave(false)} disabled={saving}>
          {isMobile ? t('accounting:status.draft') : t('accounting:entryForm.saveDraft')}
        </Button>
        <Button variant="contained" color="success" startIcon={<CheckCircle />}
          onClick={() => handleSave(true)} disabled={saving || !isBalanced}>
          {saving ? <CircularProgress size={20} /> : (isMobile ? t('accounting:entries.post') : t('accounting:entryForm.saveAndPost'))}
        </Button>
      </Box>
    </Box>
  );
}
