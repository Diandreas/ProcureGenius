import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  IconButton, Menu, MenuItem, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup,
  Tooltip, Typography, useMediaQuery, useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import medicalDocumentsAPI from '../../../services/medicalDocumentsAPI';
import BackButton from '../../../components/navigation/BackButton';

const DOCUMENT_TYPES = [
  { value: 'referral', label: 'Référence médicale', color: '#2563eb' },
  { value: 'rest_note', label: 'Repos médical', color: '#f59e0b' },
  { value: 'nursing_care', label: 'Soins infirmiers', color: '#10b981' },
  { value: 'referral_counter_referral', label: 'Référence & contre-référence', color: '#7c3aed' },
];

const typeConfig = (type) => DOCUMENT_TYPES.find(t => t.value === type) || { label: type, color: '#666' };

export default function MedicalDocumentList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);
  const [newMenuAnchor, setNewMenuAnchor] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter !== 'all') params.document_type = typeFilter;
      const data = await medicalDocumentsAPI.getAll(params);
      setDocuments(Array.isArray(data) ? data : data.results || []);
    } catch {
      enqueueSnackbar('Erreur lors du chargement des documents', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [typeFilter, enqueueSnackbar]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDownloadPDF = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const blob = await medicalDocumentsAPI.getPDF(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Document_${(doc.patient_details?.name || 'patient').replace(/\s+/g, '_')}.pdf`;
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
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BackButton />
          <DocIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Documents Médicaux</Typography>
        </Box>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={(e) => setNewMenuAnchor(e.currentTarget)}
        >
          Nouveau document
        </Button>
        <Menu anchorEl={newMenuAnchor} open={Boolean(newMenuAnchor)} onClose={() => setNewMenuAnchor(null)}>
          {DOCUMENT_TYPES.map(t => (
            <MenuItem key={t.value} onClick={() => { setNewMenuAnchor(null); navigate(`/healthcare/medical-documents/new?type=${t.value}`); }}>
              {t.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <ToggleButtonGroup
        value={typeFilter} exclusive size="small"
        onChange={(_, v) => v && setTypeFilter(v)}
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <ToggleButton value="all">Tous</ToggleButton>
        {DOCUMENT_TYPES.map(t => (
          <ToggleButton key={t.value} value={t.value}>{t.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : documents.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">Aucun document médical</Typography>
        </Card>
      ) : isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {documents.map(doc => {
            const cfg = typeConfig(doc.document_type);
            return (
              <Card key={doc.id} sx={{ borderRadius: 2 }} onClick={() => navigate(`/healthcare/medical-documents/${doc.id}/edit`)}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{doc.patient_details?.name || '—'}</Typography>
                    <Chip label={cfg.label} size="small" sx={{ bgcolor: `${cfg.color}20`, color: cfg.color, fontWeight: 600 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">N° {doc.document_number}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatDate(doc.issue_date)}</Typography>
                  <Box sx={{ mt: 1, textAlign: 'right' }}>
                    <Button
                      size="small" startIcon={downloadingId === doc.id ? <CircularProgress size={14} /> : <DownloadIcon />}
                      onClick={(e) => { e.stopPropagation(); handleDownloadPDF(doc); }}
                      disabled={downloadingId === doc.id}
                    >
                      PDF
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                <TableCell>N°</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Délivré par</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map(doc => {
                const cfg = typeConfig(doc.document_type);
                return (
                  <TableRow key={doc.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/healthcare/medical-documents/${doc.id}/edit`)}>
                    <TableCell>{doc.document_number}</TableCell>
                    <TableCell>
                      <Chip label={cfg.label} size="small" sx={{ bgcolor: `${cfg.color}20`, color: cfg.color, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>{doc.patient_details?.name || '—'}</TableCell>
                    <TableCell>
                      {doc.issued_by_details ? `${doc.issued_by_details.first_name} ${doc.issued_by_details.last_name}` : '—'}
                    </TableCell>
                    <TableCell>{formatDate(doc.issue_date)}</TableCell>
                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                      <Tooltip title="Télécharger PDF">
                        <IconButton size="small" onClick={() => handleDownloadPDF(doc)} disabled={downloadingId === doc.id}>
                          {downloadingId === doc.id ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
