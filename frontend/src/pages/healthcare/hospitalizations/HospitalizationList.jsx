import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  IconButton, InputAdornment, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography, useMediaQuery, useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  LocalHospital as HospitalIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import hospitalizationAPI from '../../../services/hospitalizationAPI';
import BackButton from '../../../components/navigation/BackButton';

const STATUS_CONFIG = {
  admitted:    { label: 'Admis',     color: 'primary' },
  discharged:  { label: 'Sorti',     color: 'success' },
  transferred: { label: 'Transféré', color: 'warning' },
};

const STATUS_FILTERS = [
  { value: 'all',        label: 'Tous' },
  { value: 'admitted',   label: 'Admis' },
  { value: 'discharged', label: 'Sortis' },
  { value: 'transferred',label: 'Transférés' },
];

export default function HospitalizationList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [hospitalizations, setHospitalizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchHospitalizations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const data = await hospitalizationAPI.getAll(params);
      setHospitalizations(Array.isArray(data) ? data : data.results || []);
    } catch {
      enqueueSnackbar('Erreur lors du chargement des hospitalisations', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, enqueueSnackbar]);

  useEffect(() => {
    const timer = setTimeout(fetchHospitalizations, 300);
    return () => clearTimeout(timer);
  }, [fetchHospitalizations]);

  const handleDownloadPDF = async (id, patientName) => {
    setDownloadingId(id);
    try {
      const blob = await hospitalizationAPI.getDischargePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sortie_${patientName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      enqueueSnackbar('Erreur lors de la génération du PDF', { variant: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const MobileCard = ({ h }) => (
    <Card sx={{ mb: 1.5, borderRadius: 2 }} onClick={() => navigate(`/healthcare/hospitalizations/${h.id}/edit`)}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {h.patient_details?.name || '—'}
          </Typography>
          <Chip
            label={STATUS_CONFIG[h.status]?.label || h.status}
            color={STATUS_CONFIG[h.status]?.color || 'default'}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Admission : {formatDate(h.admission_date)}
        </Typography>
        {h.discharge_date && (
          <Typography variant="body2" color="text.secondary">
            Sortie : {formatDate(h.discharge_date)}
          </Typography>
        )}
        {h.admitting_doctor_details && (
          <Typography variant="body2" color="text.secondary">
            Dr. {h.admitting_doctor_details.first_name} {h.admitting_doctor_details.last_name}
          </Typography>
        )}
        {h.status === 'discharged' && (
          <Box sx={{ mt: 1, textAlign: 'right' }}>
            <Button
              size="small"
              startIcon={downloadingId === h.id ? <CircularProgress size={14} /> : <DownloadIcon />}
              onClick={(e) => { e.stopPropagation(); handleDownloadPDF(h.id, h.patient_details?.name || 'patient'); }}
              disabled={downloadingId === h.id}
            >
              Fiche de sortie
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <BackButton />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HospitalIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Hospitalisations</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/healthcare/hospitalizations/new')}
          size={isMobile ? 'small' : 'medium'}
        >
          Nouvelle
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Rechercher un patient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 220 }}
        />
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, v) => v && setStatusFilter(v)}
          size="small"
        >
          {STATUS_FILTERS.map(f => (
            <ToggleButton key={f.value} value={f.value}>{f.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : hospitalizations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          Aucune hospitalisation trouvée.
        </Paper>
      ) : isMobile ? (
        hospitalizations.map(h => <MobileCard key={h.id} h={h} />)
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                <TableCell>Patient</TableCell>
                <TableCell>Médecin</TableCell>
                <TableCell>Admission</TableCell>
                <TableCell>Sortie</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Motif</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hospitalizations.map(h => (
                <TableRow
                  key={h.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/healthcare/hospitalizations/${h.id}/edit`)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {h.patient_details?.name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {h.admitting_doctor_details
                      ? `Dr. ${h.admitting_doctor_details.first_name} ${h.admitting_doctor_details.last_name}`
                      : '—'}
                  </TableCell>
                  <TableCell>{formatDate(h.admission_date)}</TableCell>
                  <TableCell>{formatDate(h.discharge_date)}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_CONFIG[h.status]?.label || h.status}
                      color={STATUS_CONFIG[h.status]?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>{h.admission_reason || '—'}</Typography>
                  </TableCell>
                  <TableCell align="right" onClick={e => e.stopPropagation()}>
                    {h.status === 'discharged' && (
                      <Tooltip title="Télécharger fiche de sortie">
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadPDF(h.id, h.patient_details?.name || 'patient')}
                          disabled={downloadingId === h.id}
                        >
                          {downloadingId === h.id ? <CircularProgress size={18} /> : <DownloadIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
