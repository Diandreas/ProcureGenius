import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Button, Grid, Alert,
  TextField, Divider, Card, CardContent, CardActions, Chip, Stack,
  ToggleButton, ToggleButtonGroup, Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Payment as PaymentIcon,
  ShoppingCart as ShoppingCartIcon,
  TableChart as ExcelIcon,
  CloudDownload as CsvIcon,
  IntegrationInstructions as ErpIcon,
} from '@mui/icons-material';
import Breadcrumbs from '../../components/navigation/Breadcrumbs';
import api from '../../services/api';

const EXPORTS = [
  {
    key: 'sales-invoices',
    label: 'Factures de vente',
    erpnextDoc: 'Sales Invoice',
    description: 'Factures avec lignes article (consultations, labo, pharmacie).',
    icon: <ReceiptIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
    color: '#e3f2fd',
    usesDates: true,
  },
  {
    key: 'customers',
    label: 'Clients / Patients',
    erpnextDoc: 'Customer',
    description: 'Tous les clients et patients enregistrés.',
    icon: <PeopleIcon sx={{ fontSize: 40, color: '#388e3c' }} />,
    color: '#e8f5e9',
    usesDates: false,
  },
  {
    key: 'items',
    label: 'Articles / Produits',
    erpnextDoc: 'Item',
    description: 'Catalogue produits avec prix, stock et fournisseur.',
    icon: <InventoryIcon sx={{ fontSize: 40, color: '#f57c00' }} />,
    color: '#fff3e0',
    usesDates: false,
  },
  {
    key: 'payments',
    label: 'Paiements reçus',
    erpnextDoc: 'Payment Entry',
    description: 'Paiements encaissés (factures payées uniquement).',
    icon: <PaymentIcon sx={{ fontSize: 40, color: '#7b1fa2' }} />,
    color: '#f3e5f5',
    usesDates: true,
  },
  {
    key: 'purchase-orders',
    label: 'Bons de commande',
    erpnextDoc: 'Purchase Order',
    description: 'Commandes fournisseurs avec lignes article.',
    icon: <ShoppingCartIcon sx={{ fontSize: 40, color: '#c62828' }} />,
    color: '#ffebee',
    usesDates: true,
  },
];

const FORMAT_OPTIONS = [
  {
    value: 'csv',
    label: 'CSV / Excel',
    icon: <CsvIcon fontSize="small" />,
    color: '#2e7d32',
    tooltip: 'CSV simple avec BOM UTF-8, ouvrable directement dans Excel',
    ext: 'csv',
  },
  {
    value: 'xlsx',
    label: 'Excel (.xlsx)',
    icon: <ExcelIcon fontSize="small" />,
    color: '#1565c0',
    tooltip: 'Fichier Excel natif avec mise en forme',
    ext: 'xlsx',
  },
  {
    value: 'erpnext',
    label: 'ERPNext natif',
    icon: <ErpIcon fontSize="small" />,
    color: '#e65100',
    tooltip: 'CSV avec les 19 lignes d\'en-tête ERPNext (import direct dans ERPNext → Outils → Importation de données)',
    ext: 'csv',
  },
];

function getDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    date_from: firstDay.toISOString().slice(0, 10),
    date_to: today.toISOString().slice(0, 10),
  };
}

export default function ErpNextExport() {
  const navigate = useNavigate();
  const [dates, setDates] = useState(getDefaultDates());
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleExport = async (exportKey) => {
    setError(null);
    setSuccess(null);
    const loadKey = `${exportKey}-${exportFormat}`;
    setLoading(prev => ({ ...prev, [loadKey]: true }));

    try {
      const exp = EXPORTS.find(e => e.key === exportKey);
      const fmt = FORMAT_OPTIONS.find(f => f.value === exportFormat);
      const params = new URLSearchParams({
        date_from: dates.date_from,
        date_to: dates.date_to,
        format: exportFormat,
      });
      const response = await api.get(`/erpnext/${exportKey}/?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const suffix = exp.usesDates ? `_${dates.date_from}_${dates.date_to}` : `_${new Date().toISOString().slice(0,10)}`;
      link.setAttribute('download', `${exportKey}${suffix}.${fmt.ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(`Export "${exp.label}" téléchargé avec succès.`);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Accès refusé. Cette fonctionnalité est réservée aux administrateurs.');
      } else {
        setError("Erreur lors de l'export. Veuillez réessayer.");
      }
    } finally {
      const loadKey = `${exportKey}-${exportFormat}`;
      setLoading(prev => ({ ...prev, [loadKey]: false }));
    }
  };

  const selectedFmtInfo = FORMAT_OPTIONS.find(f => f.value === exportFormat);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Breadcrumbs />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/settings')}
            size="small"
          >
            Retour
          </Button>
          <Typography variant="h5" fontWeight={700}>
            Export comptabilité — ERPNext
          </Typography>
          <Chip label="Admin uniquement" color="warning" size="small" />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>
        )}

        {/* Contrôles : format + période */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="flex-start">
            {/* Sélecteur de format */}
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Format d'export
              </Typography>
              <ToggleButtonGroup
                value={exportFormat}
                exclusive
                onChange={(_, v) => v && setExportFormat(v)}
                size="small"
                fullWidth
              >
                {FORMAT_OPTIONS.map(fmt => (
                  <Tooltip title={fmt.tooltip} key={fmt.value}>
                    <ToggleButton
                      value={fmt.value}
                      sx={{
                        py: 1,
                        '&.Mui-selected': {
                          bgcolor: fmt.color + '22',
                          borderColor: fmt.color,
                          color: fmt.color,
                          fontWeight: 700,
                        }
                      }}
                    >
                      {fmt.icon}&nbsp;{fmt.label}
                    </ToggleButton>
                  </Tooltip>
                ))}
              </ToggleButtonGroup>
              {selectedFmtInfo && (
                <Alert severity="info" icon={false} sx={{ mt: 1, py: 0.5, fontSize: '0.78rem' }}>
                  {selectedFmtInfo.tooltip}
                </Alert>
              )}
            </Grid>

            {/* Période */}
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Période (pour les exports avec dates)
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    label="Date de début"
                    type="date"
                    size="small"
                    value={dates.date_from}
                    onChange={e => setDates(prev => ({ ...prev, date_from: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    label="Date de fin"
                    type="date"
                    size="small"
                    value={dates.date_to}
                    onChange={e => setDates(prev => ({ ...prev, date_to: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button variant="outlined" fullWidth size="small" onClick={() => setDates(getDefaultDates())}>
                    Ce mois
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        {/* Cartes d'export */}
        <Grid container spacing={3}>
          {EXPORTS.map(exp => {
            const loadKey = `${exp.key}-${exportFormat}`;
            const isLoading = !!loading[loadKey];
            return (
              <Grid item xs={12} sm={6} md={4} key={exp.key}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ flexGrow: 1, bgcolor: exp.color, pt: 3, pb: 1 }}>
                    <Stack alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      {exp.icon}
                      <Typography variant="h6" fontWeight={700} textAlign="center" fontSize="1rem">
                        {exp.label}
                      </Typography>
                      <Chip label={`ERPNext: ${exp.erpnextDoc}`} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" textAlign="center" fontSize="0.8rem">
                      {exp.description}
                    </Typography>
                    {exp.usesDates && (
                      <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={0.5}>
                        {dates.date_from} → {dates.date_to}
                      </Typography>
                    )}
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ justifyContent: 'center', py: 1.5 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleExport(exp.key)}
                      disabled={isLoading}
                      sx={{
                        bgcolor: selectedFmtInfo?.color,
                        '&:hover': { bgcolor: selectedFmtInfo?.color, filter: 'brightness(0.9)' }
                      }}
                    >
                      {isLoading ? 'Export en cours...' : `Télécharger ${selectedFmtInfo?.label}`}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Guide d'import */}
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Comment importer dans ERPNext ?
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" fontWeight={600} color="warning.main" gutterBottom>
                Format "ERPNext natif" (recommandé pour import direct) :
              </Typography>
              <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                <li>Sélectionnez le format <strong>"ERPNext natif"</strong> et téléchargez.</li>
                <li>Dans ERPNext → <strong>Outils → Importation de données</strong>.</li>
                <li>Choisissez le type de document indiqué sur la carte (ex: Sales Invoice).</li>
                <li>Chargez directement le fichier CSV — les colonnes sont pré-mappées.</li>
                <li>Vérifiez les données et cliquez <strong>Importer</strong>.</li>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" fontWeight={600} color="primary.main" gutterBottom>
                Format "CSV / Excel" ou "Excel (.xlsx)" :
              </Typography>
              <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                <li>Ouvrez dans Excel ou Google Sheets pour analyse et vérification.</li>
                <li>Pour import ERPNext : téléchargez un modèle ERPNext vierge du même type.</li>
                <li>Copiez les données de votre export dans le modèle ERPNext.</li>
                <li>Importez via <strong>Outils → Importation de données</strong>.</li>
              </Typography>
            </Grid>
          </Grid>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Important :</strong> Assurez-vous que les noms des clients, articles et fournisseurs correspondent exactement à ceux dans ERPNext avant d'importer. Faites d'abord un test avec quelques enregistrements.
          </Alert>
        </Paper>
      </Container>
    </Box>
  );
}
