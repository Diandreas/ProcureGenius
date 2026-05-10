import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Container, Chip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, CircularProgress, TextField, Button,
} from '@mui/material';
import {
  TrendingUp as MarginIcon,
  Medication as PharmacyIcon,
  Science as LabIcon,
  MedicalServices as ServiceIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import inventoryAnalyticsAPI from '../../../services/inventoryAnalyticsAPI';
import Breadcrumbs from '../../../components/navigation/Breadcrumbs';
import BackButton from '../../../components/navigation/BackButton';

const fmt = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(v || 0);

const pct = (v) => (v !== null && v !== undefined ? `${v.toFixed(1)} %` : '—');

const colorForMargin = (v) => {
  if (v === null || v === undefined) return 'default';
  if (v >= 30) return 'success';
  if (v >= 15) return 'warning';
  return 'error';
};

function SummaryCard({ title, icon, summary, note }) {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {icon}
        <Typography variant="h6" fontWeight={600}>{title}</Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">CA (Revenus)</Typography>
          <Typography variant="h6" fontWeight={700}>{fmt(summary?.revenue)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Coût de revient</Typography>
          <Typography variant="h6" fontWeight={700} color="error.main">{fmt(summary?.cost)}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">Marge brute</Typography>
          <Typography variant="h5" fontWeight={700} color="success.main">{fmt(summary?.margin)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Taux de marge</Typography>
          <Chip
            label={pct(summary?.taux_marge)}
            color={colorForMargin(summary?.taux_marge)}
            size="small"
          />
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Taux de marque</Typography>
          <Chip
            label={pct(summary?.taux_marque)}
            color={colorForMargin(summary?.taux_marque)}
            size="small"
          />
        </Grid>
      </Grid>
      {note && (
        <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 2, fontSize: '0.75rem', py: 0.5 }}>
          {note}
        </Alert>
      )}
    </Paper>
  );
}

function DetailTable({ rows, nameField = 'name', codeField = null }) {
  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell><strong>Désignation</strong></TableCell>
            {codeField && <TableCell><strong>Code</strong></TableCell>}
            <TableCell align="right"><strong>Qté vendue</strong></TableCell>
            <TableCell align="right"><strong>PV (FCFA)</strong></TableCell>
            <TableCell align="right"><strong>PA / Coût</strong></TableCell>
            <TableCell align="right"><strong>CA total</strong></TableCell>
            <TableCell align="right"><strong>Marge totale</strong></TableCell>
            <TableCell align="right"><strong>Tx marge</strong></TableCell>
            <TableCell align="right"><strong>Tx marque</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} hover>
              <TableCell>{row[nameField]}</TableCell>
              {codeField && <TableCell>{row[codeField] || '—'}</TableCell>}
              <TableCell align="right">{Number(row.qty || 0).toLocaleString('fr-FR')}</TableCell>
              <TableCell align="right">{fmt(row.pv)}</TableCell>
              <TableCell align="right">{row.pa > 0 ? fmt(row.pa) : <Typography variant="caption" color="text.disabled">Non renseigné</Typography>}</TableCell>
              <TableCell align="right">{fmt(row.revenue)}</TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={row.margin >= 0 ? 'success.main' : 'error.main'}
                >
                  {fmt(row.margin)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={pct(row.taux_marge)}
                  color={colorForMargin(row.taux_marge)}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={pct(row.taux_marque)}
                  color={colorForMargin(row.taux_marque)}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                Aucune donnée pour cette période
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const MarginAnalytics = () => {
  const thisYear = new Date().getFullYear();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [startDate, setStartDate] = useState(`${thisYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await inventoryAnalyticsAPI.getMarginAnalytics({ start_date: startDate, end_date: endDate });
      setData(result);
    } catch (err) {
      console.error('Error fetching margin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Inventaire', path: '/inventory' },
    { label: 'Analytiques', path: '/inventory/analytics' },
    { label: 'Analyse des marges' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <BackButton />
      <Breadcrumbs items={breadcrumbItems} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MarginIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Analyse des Marges</Typography>
            <Typography variant="body2" color="text.secondary">
              Marge totale · Taux de marge · Taux de marque — par catégorie d'activité
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Du"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Au"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" size="small" onClick={fetchData} disabled={loading}>
            Actualiser
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data && (
        <>
          {/* Global KPI banner */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>CA Total</Typography>
                <Typography variant="h5" fontWeight={700}>{fmt(data.global?.revenue)}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Coût Total</Typography>
                <Typography variant="h5" fontWeight={700}>{fmt(data.global?.cost)}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Marge Brute Globale</Typography>
                <Typography variant="h5" fontWeight={700}>{fmt(data.global?.margin)}</Typography>
              </Grid>
              <Grid item xs={6} sm={1.5}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Taux de marge</Typography>
                <Typography variant="h6" fontWeight={700}>{pct(data.global?.taux_marge)}</Typography>
              </Grid>
              <Grid item xs={6} sm={1.5}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Taux de marque</Typography>
                <Typography variant="h6" fontWeight={700}>{pct(data.global?.taux_marque)}</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Section summary cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <SummaryCard
                title="Médicaments & Produits"
                icon={<PharmacyIcon color="primary" />}
                summary={data.pharmacy?.summary}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SummaryCard
                title="Examens de Laboratoire"
                icon={<LabIcon color="secondary" />}
                summary={data.laboratory?.summary}
                note={data.laboratory?.note}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SummaryCard
                title="Services & Soins"
                icon={<ServiceIcon color="success" />}
                summary={data.services?.summary}
                note={data.services?.note}
              />
            </Grid>
          </Grid>

          {/* Detail tables by tab */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label={`Médicaments (${data.pharmacy?.products?.length || 0})`} icon={<PharmacyIcon />} iconPosition="start" />
              <Tab label={`Labo (${data.laboratory?.tests?.length || 0})`} icon={<LabIcon />} iconPosition="start" />
              <Tab label={`Services (${data.services?.products?.length || 0})`} icon={<ServiceIcon />} iconPosition="start" />
            </Tabs>
            <Box sx={{ p: 2 }}>
              {tab === 0 && (
                <DetailTable rows={data.pharmacy?.products || []} nameField="name" codeField="reference" />
              )}
              {tab === 1 && (
                <DetailTable rows={data.laboratory?.tests || []} nameField="name" codeField="test_code" />
              )}
              {tab === 2 && (
                <DetailTable rows={data.services?.products || []} nameField="name" codeField="reference" />
              )}
            </Box>
          </Paper>

          {/* Formula reminder */}
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Taux de marge</strong> = (PV − PA) / PA × 100 &nbsp;|&nbsp;
              <strong>Taux de marque</strong> = (PV − PA) / PV × 100 &nbsp;|&nbsp;
              <strong>Marge totale</strong> = (PV − PA) × Quantité vendue
            </Typography>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default MarginAnalytics;
