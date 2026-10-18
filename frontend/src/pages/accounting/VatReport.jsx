import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Card, CardContent,
  CircularProgress, Alert, Button, Select, MenuItem, FormControl, InputLabel,
  ToggleButtonGroup, ToggleButton, Divider, Stack, useTheme,
} from '@mui/material';
import { Download as DownloadIcon, InfoOutlined as InfoIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import accountingAPI from '../../services/accountingAPI';
import useCurrency from '../../hooks/useCurrency';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import AccountingNav from './AccountingNav';

const KINDS = ['month', 'quarter', 'year'];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Carte simple, fond uni (pas de dégradé). */
function SectionCard({ title, subtitle, children, neu, accent }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 2.5, boxShadow: neu, bgcolor: 'background.paper', borderTop: accent ? 3 : 0, borderTopColor: accent }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2.5 }, '&:last-child': { pb: { xs: 1.5, sm: 2.5 } } }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary" display="block" mb={1}>{subtitle}</Typography>}
        {children}
      </CardContent>
    </Card>
  );
}

/** Tableau taux / base / TVA ; `extra` = lignes supplémentaires (avoirs, total). */
function RateTable({ rows, t, format, fmtRate, sign = 1, extra = null, emptyLabel }) {
  const cell = { px: { xs: 0.75, sm: 1.5 }, py: 0.75, fontSize: { xs: '0.78rem', sm: '0.85rem' } };
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 260 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...cell, fontWeight: 700 }}>{t('accounting:vatReport.rate')}</TableCell>
            <TableCell align="right" sx={{ ...cell, fontWeight: 700 }}>{t('accounting:vatReport.netBase')}</TableCell>
            <TableCell align="right" sx={{ ...cell, fontWeight: 700 }}>{t('accounting:vatReport.vat')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} sx={{ ...cell, color: 'text.secondary', fontStyle: 'italic' }}>{emptyLabel}</TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.rate}>
              <TableCell sx={cell}>{fmtRate(r.rate)}</TableCell>
              <TableCell align="right" sx={{ ...cell, whiteSpace: 'nowrap' }}>{format(sign * num(r.base))}</TableCell>
              <TableCell align="right" sx={{ ...cell, whiteSpace: 'nowrap' }}>{format(sign * num(r.vat))}</TableCell>
            </TableRow>
          ))}
          {extra}
        </TableBody>
      </Table>
    </Box>
  );
}

function TotalRow({ label, base, vat, format, strong = true }) {
  const cell = { px: { xs: 0.75, sm: 1.5 }, py: 0.75, fontSize: { xs: '0.78rem', sm: '0.85rem' }, fontWeight: strong ? 700 : 400, borderBottom: 'none' };
  return (
    <TableRow sx={{ bgcolor: strong ? 'action.hover' : 'transparent' }}>
      <TableCell sx={cell}>{label}</TableCell>
      <TableCell align="right" sx={{ ...cell, whiteSpace: 'nowrap' }}>{base == null ? '' : format(base)}</TableCell>
      <TableCell align="right" sx={{ ...cell, whiteSpace: 'nowrap' }}>{format(vat)}</TableCell>
    </TableRow>
  );
}

/** Une Kennzahl de l'UStVA : numéro, libellé, montant à saisir. */
function KzRow({ kz, label, value, tax }) {
  return (
    <Box display="flex" alignItems="center" gap={1.5} py={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ minWidth: 52, px: 1, py: 0.5, borderRadius: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
        {kz}
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" sx={{ lineHeight: 1.3 }}>{label}</Typography>
        {tax && <Typography variant="caption" color="text.secondary">{tax}</Typography>}
      </Box>
      <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{value}</Typography>
    </Box>
  );
}

export default function VatReport() {
  const { t, i18n } = useTranslation(['accounting', 'common']);
  const { format } = useCurrency();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const neu = getNeumorphicShadow(theme.palette.mode === 'dark' ? 'dark' : 'light', 'soft');
  const lang = (i18n.language || 'fr').slice(0, 2);

  const [kind, setKind] = useState(null);   // null = laisser le serveur choisir (fréquence de l'organisation)
  const [year, setYear] = useState(null);
  const [index, setIndex] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const params = useMemo(() => (kind ? { period: kind, year, ...(kind !== 'year' ? { index } : {}) } : {}), [kind, year, index]);

  const load = useCallback((p) => {
    setLoading(true);
    accountingAPI.getVatReport(p)
      .then((r) => {
        setData(r.data);
        setError(null);
        const per = r.data.period || {};
        setKind((k) => k || per.kind);
        setYear((y) => y || per.year);
        setIndex((i) => i || per.index || 1);
      })
      .catch((err) => setError(err?.response?.data?.error || t('accounting:vatReport.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    // Pas de second appel quand la période choisie par défaut par le serveur vient d'être reprise
    const p = data?.period;
    if (kind && p && p.kind === kind && p.year === year && (kind === 'year' || p.index === index)) return;
    load(params);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeKind = (_, k) => {
    if (!k || k === kind) return;
    const now = new Date();
    // Dernière période écoulée du nouveau type
    if (k === 'year') { setYear(now.getFullYear() - 1); setIndex(null); }
    else if (k === 'quarter') {
      const q = Math.floor(now.getMonth() / 3) + 1;
      setYear(q === 1 ? now.getFullYear() - 1 : now.getFullYear()); setIndex(q === 1 ? 4 : q - 1);
    } else {
      const m = now.getMonth(); // 0 = janvier → décembre de l'an passé
      setYear(m === 0 ? now.getFullYear() - 1 : now.getFullYear()); setIndex(m === 0 ? 12 : m);
    }
    setKind(k);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await accountingAPI.exportVatReportCSV({ ...params, lang });
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = match ? match[1] : 'vat-report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      enqueueSnackbar(t('accounting:vatReport.exportError'), { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const fmtRate = (r) => `${Number(r).toLocaleString(i18n.language, { maximumFractionDigits: 2 })} %`;
  const fmtDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const monthName = (m) => new Date(2000, m - 1, 1).toLocaleDateString(i18n.language, { month: 'long' });

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => thisYear - i);

  const periodLabel = useMemo(() => {
    const p = data?.period;
    if (!p) return '';
    if (p.kind === 'year') return String(p.year);
    if (p.kind === 'quarter') return t('accounting:vatReport.quarterLabel', { quarter: p.index, year: p.year });
    return `${new Date(p.year, p.index - 1, 1).toLocaleDateString(i18n.language, { month: 'long' })} ${p.year}`;
  }, [data, t, i18n.language]);

  const payable = num(data?.payable);
  const isDE = data?.country === 'DE';
  const ustva = data?.ustva;
  const status = data?.small_business ? 'none' : payable > 0 ? 'pay' : payable < 0 ? 'refund' : 'none';
  const statusColor = { pay: 'error.main', refund: 'success.main', none: 'text.secondary' }[status];
  const howToKey = isDE ? 'de' : data?.country === 'FR' ? 'fr' : 'generic';

  return (
    <Box p={{ xs: 2, sm: 3 }} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <AccountingNav title={t('accounting:vatReport.title')} subtitle={t('accounting:vatReport.subtitle')} />

      {/* ── Choix de la période ── */}
      <Box display="flex" gap={1.5} mb={2.5} alignItems="center" flexWrap="wrap">
        <ToggleButtonGroup size="small" exclusive value={kind} onChange={changeKind} sx={{ flexShrink: 0 }}>
          {KINDS.map((k) => (
            <ToggleButton key={k} value={k} sx={{ textTransform: 'none', px: { xs: 1.25, sm: 2 } }}>
              {t(`accounting:vatReport.kinds.${k}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 96 }}>
          <InputLabel id="vat-year-label">{t('accounting:vatReport.year')}</InputLabel>
          <Select labelId="vat-year-label" label={t('accounting:vatReport.year')} value={year || ''} onChange={(e) => setYear(e.target.value)}>
            {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>

        {kind === 'month' && (
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="vat-month-label">{t('accounting:vatReport.month')}</InputLabel>
            <Select labelId="vat-month-label" label={t('accounting:vatReport.month')} value={index || ''} onChange={(e) => setIndex(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MenuItem key={m} value={m} sx={{ textTransform: 'capitalize' }}>{monthName(m)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {kind === 'quarter' && (
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel id="vat-quarter-label">{t('accounting:vatReport.quarter')}</InputLabel>
            <Select labelId="vat-quarter-label" label={t('accounting:vatReport.quarter')} value={index || ''} onChange={(e) => setIndex(e.target.value)}>
              {[1, 2, 3, 4].map((q) => <MenuItem key={q} value={q}>{t('accounting:vatReport.quarterShort', { quarter: q })}</MenuItem>)}
            </Select>
          </FormControl>
        )}

        <Box flex={1} />
        <Button
          variant="outlined" size="small" startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
          onClick={handleExport} disabled={exporting || !data} sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}
        >
          {t('accounting:vatReport.exportCsv')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !data && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}

      {data && (
        <Box sx={{ opacity: loading ? 0.5 : 1, transition: 'opacity .2s' }}>
          {data.small_business && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={700}>{t(`accounting:vatReport.smallBusiness.${data.small_business_reason || 'small_business'}.title`)}</Typography>
              <Typography variant="body2">{t(`accounting:vatReport.smallBusiness.${data.small_business_reason || 'small_business'}.text`)}</Typography>
            </Alert>
          )}
          {(data.warnings || []).map((w) => (
            <Alert key={w.code} severity="warning" sx={{ mb: 2 }}>{t(`accounting:vatReport.warnings.${w.code}`, { count: w.count, currency: data.currency })}</Alert>
          ))}

          {/* ── Résultat : à payer / remboursement ── */}
          <Card elevation={0} sx={{ borderRadius: 2.5, boxShadow: neu, mb: 2.5, bgcolor: 'background.paper', borderLeft: 6, borderLeftColor: statusColor }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('accounting:vatReport.periodOf', { period: periodLabel })} · {fmtDate(data.period.start)} – {fmtDate(data.period.end)}
              </Typography>
              <Typography variant="h6" fontWeight={700} mt={0.5}>
                {t(`accounting:vatReport.result.${status}`)}
              </Typography>
              <Typography sx={{ fontSize: { xs: '2rem', sm: '2.6rem' }, fontWeight: 800, color: statusColor, lineHeight: 1.15, wordBreak: 'break-word' }}>
                {format(Math.abs(payable))}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {t('accounting:vatReport.result.formula', { output: format(num(data.output_vat)), input: format(num(data.input_vat)) })}
              </Typography>
              {ustva && (
                <Typography variant="body2" mt={1}>
                  <b>{t('accounting:vatReport.deadline')}:</b> {fmtDate(ustva.deadline)}
                </Typography>
              )}
            </CardContent>
          </Card>

          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2.5} mb={2.5}>
            {/* ── TVA collectée ── */}
            <SectionCard
              neu={neu} accent="primary.main"
              title={t('accounting:vatReport.output.title')}
              subtitle={t('accounting:vatReport.output.subtitle', { count: data.sales.invoice_count })}
            >
              <RateTable
                rows={data.sales.by_rate} t={t} format={format} fmtRate={fmtRate}
                emptyLabel={t('accounting:vatReport.noSales')}
                extra={(
                  <>
                    {data.credit_notes.count > 0 && (
                      <TotalRow
                        strong={false} format={format}
                        label={t('accounting:vatReport.output.creditNotes', { count: data.credit_notes.count })}
                        base={-num(data.credit_notes.base)} vat={-num(data.credit_notes.vat)}
                      />
                    )}
                    <TotalRow
                      format={format} label={t('accounting:vatReport.output.total')}
                      base={num(data.sales.base_total) - num(data.credit_notes.base)} vat={num(data.output_vat)}
                    />
                  </>
                )}
              />
            </SectionCard>

            {/* ── TVA déductible ── */}
            <SectionCard
              neu={neu} accent="secondary.main"
              title={t('accounting:vatReport.input.title')}
              subtitle={data.purchases.deductible ? t('accounting:vatReport.input.subtitle') : t('accounting:vatReport.input.notDeductible')}
            >
              <Stack spacing={0.5} mb={1.5}>
                <Box display="flex" justifyContent="space-between" gap={1}>
                  <Typography variant="body2">{t('accounting:vatReport.input.purchaseOrders', { count: data.purchases.po_count })}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>{format(num(data.purchases.po_vat))}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" gap={1}>
                  <Typography variant="body2">{t('accounting:vatReport.input.expenses', { count: data.purchases.expense_count })}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>{format(num(data.purchases.expense_vat))}</Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <RateTable
                rows={data.purchases.by_rate} t={t} format={format} fmtRate={fmtRate}
                emptyLabel={t('accounting:vatReport.noPurchases')}
                extra={<TotalRow format={format} label={t('accounting:vatReport.input.total')} base={null} vat={num(data.purchases.vat_total)} />}
              />
            </SectionCard>
          </Box>

          {/* ── UStVA (Allemagne) ── */}
          {ustva && (
            <SectionCard neu={neu} accent="primary.main" title={t('accounting:vatReport.ustva.title')} subtitle={t('accounting:vatReport.ustva.subtitle')}>
              <Box mb={2}>
                <KzRow kz="81" label={t('accounting:vatReport.ustva.kz81')} value={format(ustva.kz81, 0)} tax={t('accounting:vatReport.ustva.taxLine', { amount: format(num(ustva.kz81_vat)) })} />
                <KzRow kz="86" label={t('accounting:vatReport.ustva.kz86')} value={format(ustva.kz86, 0)} tax={t('accounting:vatReport.ustva.taxLine', { amount: format(num(ustva.kz86_vat)) })} />
                {(ustva.kz35 !== 0 || num(ustva.kz36) !== 0) && (
                  <KzRow kz="35/36" label={t('accounting:vatReport.ustva.kz35')} value={format(ustva.kz35, 0)} tax={t('accounting:vatReport.ustva.taxLine', { amount: format(num(ustva.kz36)) })} />
                )}
                <KzRow kz="66" label={t('accounting:vatReport.ustva.kz66')} value={format(num(ustva.kz66))} />
                <KzRow kz="83" label={t('accounting:vatReport.ustva.kz83')} value={format(num(ustva.kz83))} />
              </Box>
              {num(ustva.tax_free_base) !== 0 && (
                <Alert severity="info" sx={{ mb: 1.5 }}>{t('accounting:vatReport.ustva.taxFree', { amount: format(num(ustva.tax_free_base)) })}</Alert>
              )}
              <Typography variant="body2" mb={0.5}>
                <b>{t('accounting:vatReport.deadline')}:</b> {fmtDate(ustva.deadline)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('accounting:vatReport.ustva.extension', { date: fmtDate(ustva.deadline_extended) })}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {t('accounting:vatReport.ustva.rounding')}
              </Typography>
            </SectionCard>
          )}

          {/* ── Que faire de ces chiffres ? ── */}
          <Box mt={2.5}>
            <SectionCard neu={neu} title={t('accounting:vatReport.howTo.title')}>
              <Box display="flex" gap={1} alignItems="flex-start">
                <InfoIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
                <Typography variant="body2" color="text.secondary">
                  {t(`accounting:vatReport.howTo.${howToKey}`)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {t('accounting:vatReport.howTo.sources')}
              </Typography>
            </SectionCard>
          </Box>
        </Box>
      )}
    </Box>
  );
}
