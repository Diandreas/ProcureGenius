import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Chip, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Stack, Divider, Tooltip, Paper, Alert,
  ToggleButton, ToggleButtonGroup, Grid,
} from '@mui/material';
import {
  Search, ArrowBack, Science, FilterList, Close,
  TrendingUp, Person, CalendarMonth, Assignment,
  KeyboardArrowDown, KeyboardArrowUp, CheckCircle, Warning,
} from '@mui/icons-material';
import api from '../../../services/api';
import dayjs from 'dayjs';

const STATUS_COLORS = {
  pending:          { label: 'En attente',  color: '#f59e0b' },
  sample_collected: { label: 'Prélevé',     color: '#3b82f6' },
  in_progress:      { label: 'En cours',    color: '#8b5cf6' },
  results_entered:  { label: 'Résultats saisis', color: '#06b6d4' },
  verified:         { label: 'Validé',      color: '#10b981' },
  delivered:        { label: 'Remis',       color: '#6366f1' },
};

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

export default function LabExamStats() {
  const navigate = useNavigate();

  // Liste des examens
  const [tests, setTests]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [ordering, setOrdering] = useState('-times_performed');

  // Détail d'un examen
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(1);

  // Charger la liste
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)   params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to', dateTo);
      params.set('ordering', ordering);
      const res = await api.get(`/healthcare/laboratory/exam-stats/?${params}`);
      setTests(res.data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, ordering]);

  useEffect(() => { loadList(); }, [loadList]);

  // Charger le détail
  const loadDetail = useCallback(async (testId, page = 1) => {
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: 50 });
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to', dateTo);
      const res = await api.get(`/healthcare/laboratory/exam-stats/${testId}/?${params}`);
      setDetail(res.data);
      setDetailPage(page);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  }, [dateFrom, dateTo]);

  const handleSelectTest = (test) => {
    setSelected(test);
    loadDetail(test.id);
  };

  const handleClose = () => {
    setSelected(null);
    setDetail(null);
    setDetailPage(1);
  };

  // Résumé global
  const totalPerformed = tests.reduce((s, t) => s + t.times_performed, 0);
  const totalRevenue   = tests.reduce((s, t) => s + t.revenue, 0);
  const doneTests      = tests.filter(t => t.times_performed > 0).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/healthcare/laboratory/catalog')}>
          <ArrowBack />
        </IconButton>
        <Science color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={800}>Statistiques des Examens</Typography>
          <Typography variant="body2" color="text.secondary">
            Historique complet — quand, combien de fois, par qui
          </Typography>
        </Box>
      </Box>

      {/* Filtres */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small" placeholder="Rechercher un examen…"
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField size="small" label="Du" type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <TextField size="small" label="Au" type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            {(dateFrom || dateTo || search) && (
              <Button size="small" startIcon={<Close />} onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}>
                Effacer
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Résumé */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Examens réalisés', value: doneTests + ' / ' + tests.length, icon: <Science />, color: '#3b82f6' },
          { label: 'Total réalisations', value: fmt(totalPerformed), icon: <TrendingUp />, color: '#10b981' },
          { label: 'CA généré', value: fmt(totalRevenue) + ' XAF', icon: <Assignment />, color: '#8b5cf6' },
        ].map(c => (
          <Grid item xs={12} sm={4} key={c.label}>
            <Card sx={{ borderRadius: 3, borderLeft: `4px solid ${c.color}` }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: c.color }}>{c.icon}</Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                    <Typography variant="h6" fontWeight={700}>{c.value}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tri */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Trier par :</Typography>
        {[
          { key: '-times_performed', label: 'Plus réalisés' },
          { key: 'times_performed',  label: 'Moins réalisés' },
          { key: '-revenue',         label: 'CA décroissant' },
          { key: 'name',             label: 'Nom' },
          { key: '-last_date',       label: 'Récent' },
        ].map(o => (
          <Chip key={o.key} label={o.label} size="small" clickable
            color={ordering === o.key ? 'primary' : 'default'}
            variant={ordering === o.key ? 'filled' : 'outlined'}
            onClick={() => setOrdering(o.key)} />
        ))}
      </Box>

      {/* Tableau */}
      <Card sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Examen</strong></TableCell>
                <TableCell><strong>Catégorie</strong></TableCell>
                <TableCell align="center"><strong>Nb réalisations</strong></TableCell>
                <TableCell align="center"><strong>CA généré (XAF)</strong></TableCell>
                <TableCell align="center"><strong>Première fois</strong></TableCell>
                <TableCell align="center"><strong>Dernière fois</strong></TableCell>
                <TableCell align="center"><strong>Détail</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
              ) : tests.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>Aucun examen trouvé</TableCell></TableRow>
              ) : tests.map(t => (
                <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleSelectTest(t)}>
                  <TableCell><Typography variant="caption" fontWeight={700}>{t.test_code}</Typography></TableCell>
                  <TableCell><Typography variant="body2" fontWeight={500}>{t.name}</Typography></TableCell>
                  <TableCell>
                    {t.category && <Chip label={t.category} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={t.times_performed}
                      size="small"
                      color={t.times_performed > 0 ? 'primary' : 'default'}
                      variant={t.times_performed > 0 ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={600} color={t.revenue > 0 ? 'success.main' : 'text.secondary'}>
                      {t.revenue > 0 ? fmt(t.revenue) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="caption" color="text.secondary">
                      {t.first_date ? dayjs(t.first_date).format('DD/MM/YYYY') : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="caption" color="text.secondary">
                      {t.last_date ? dayjs(t.last_date).format('DD/MM/YYYY') : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Voir l'historique complet">
                      <IconButton size="small" color="primary" onClick={e => { e.stopPropagation(); handleSelectTest(t); }}>
                        <Assignment fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog Détail */}
      <Dialog open={!!selected} onClose={handleClose} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Science color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={800}>{selected?.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {selected?.test_code} · {selected?.category} · {fmt(selected?.price)} XAF / examen
            </Typography>
          </Box>
          {detail && (
            <Stack direction="row" spacing={1}>
              <Chip label={detail.count + ' réalisation(s)'} color="primary" size="small" />
              <Chip label={fmt(tests.find(t => t.id === selected?.id)?.revenue) + ' XAF'} color="success" size="small" />
            </Stack>
          )}
          <IconButton onClick={handleClose} size="small"><Close /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : detail?.results?.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Science sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">Aucune réalisation sur la période sélectionnée</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Heure</strong></TableCell>
                    <TableCell><strong>N° Commande</strong></TableCell>
                    <TableCell><strong>Patient</strong></TableCell>
                    <TableCell><strong>Prescripteur</strong></TableCell>
                    <TableCell><strong>Ordonné par</strong></TableCell>
                    <TableCell><strong>Biologiste</strong></TableCell>
                    <TableCell><strong>Sous-traitant</strong></TableCell>
                    <TableCell align="center"><strong>Statut</strong></TableCell>
                    <TableCell align="center"><strong>Prix (XAF)</strong></TableCell>
                    <TableCell><strong>Résultat</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail?.results?.map((r, idx) => {
                    const st = STATUS_COLORS[r.statut] || { label: r.statut, color: '#9e9e9e' };
                    return (
                      <TableRow key={r.item_id} hover
                        sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {dayjs(r.date).format('DD/MM/YYYY')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{r.heure}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption" fontWeight={600} color="primary"
                            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => navigate(`/healthcare/laboratory/${r.order_id}`)}
                          >
                            {r.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ cursor: r.patient_id ? 'pointer' : 'default', color: r.patient_id ? 'primary.main' : 'inherit' }}
                            onClick={() => r.patient_id && navigate(`/healthcare/patients/${r.patient_id}`)}
                          >
                            {r.patient}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{r.prescripteur || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{r.ordonne_par}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color={r.biologiste ? 'success.main' : 'text.disabled'}>
                            {r.biologiste || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.sous_traitant ? (
                            <Chip label={r.sous_traitant} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                          ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={st.label} size="small"
                            sx={{ bgcolor: st.color + '22', color: st.color, fontWeight: 700, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>{fmt(r.prix)}</Typography>
                        </TableCell>
                        <TableCell>
                          {r.resultat ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {r.anomalie && r.anomalie !== 'normal' ? (
                                <Warning sx={{ fontSize: 14, color: 'warning.main' }} />
                              ) : (
                                <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                              )}
                              <Typography variant="caption" fontWeight={500}
                                color={r.anomalie && r.anomalie !== 'normal' ? 'warning.main' : 'success.main'}>
                                {r.resultat.slice(0, 30)}{r.resultat.length > 30 ? '…' : ''}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.disabled">En attente</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        {detail && detail.pages > 1 && (
          <DialogActions sx={{ justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
            <Button disabled={detailPage <= 1} onClick={() => loadDetail(selected.id, detailPage - 1)}>
              Précédent
            </Button>
            <Typography variant="body2" color="text.secondary">
              Page {detailPage} / {detail.pages} ({detail.count} entrées)
            </Typography>
            <Button disabled={detailPage >= detail.pages} onClick={() => loadDetail(selected.id, detailPage + 1)}>
              Suivant
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
