import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Chip, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Stack, Tooltip, Grid, Tab, Tabs,
} from '@mui/material';
import {
  Search, ArrowBack, Science, Close,
  TrendingUp, Assignment, CheckCircle, Warning, LibraryBooks,
} from '@mui/icons-material';
import api from '../../../services/api';
import dayjs from 'dayjs';

const STATUS_COLORS = {
  pending:          { label: 'En attente',       color: '#f59e0b' },
  sample_collected: { label: 'Prélevé',          color: '#3b82f6' },
  in_progress:      { label: 'En cours',         color: '#8b5cf6' },
  results_entered:  { label: 'Résultats saisis', color: '#06b6d4' },
  verified:         { label: 'Validé',           color: '#10b981' },
  delivered:        { label: 'Remis',            color: '#6366f1' },
};

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

// ─── Composant tableau de classement ─────────────────────────────────────────
function SortChips({ ordering, setOrdering, options }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">Trier par :</Typography>
      {options.map(o => (
        <Chip key={o.key} label={o.label} size="small" clickable
          color={ordering === o.key ? 'primary' : 'default'}
          variant={ordering === o.key ? 'filled' : 'outlined'}
          onClick={() => setOrdering(o.key)} />
      ))}
    </Box>
  );
}

// ─── KPI résumé ──────────────────────────────────────────────────────────────
function KpiRow({ kpis }) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {kpis.map(c => (
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
  );
}

// ─── Filtres barre ───────────────────────────────────────────────────────────
function FilterBar({ search, setSearch, dateFrom, setDateFrom, dateTo, setDateTo }) {
  const clear = () => { setSearch(''); setDateFrom(''); setDateTo(''); };
  return (
    <Card sx={{ mb: 3, borderRadius: 3 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small" placeholder="Rechercher…"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <TextField size="small" label="Du" type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
          <TextField size="small" label="Au" type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
          {(dateFrom || dateTo || search) && (
            <Button size="small" startIcon={<Close />} onClick={clear}>Effacer</Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function LabExamStats() {
  const navigate = useNavigate();

  // Filtres partagés
  const [tab, setTab]           = useState(0);
  const [search, setSearch]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  // ── Examens ──
  const [tests, setTests]             = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testsOrdering, setTestsOrdering] = useState('-times_performed');
  const [selectedTest, setSelectedTest]   = useState(null);
  const [testDetail, setTestDetail]       = useState(null);
  const [testDetailLoading, setTestDetailLoading] = useState(false);
  const [testDetailPage, setTestDetailPage] = useState(1);

  // ── Bilans ──
  const [panels, setPanels]               = useState([]);
  const [panelsLoading, setPanelsLoading] = useState(true);
  const [panelsOrdering, setPanelsOrdering] = useState('-times_ordered');
  const [selectedPanel, setSelectedPanel]   = useState(null);
  const [panelDetail, setPanelDetail]       = useState(null);
  const [panelDetailLoading, setPanelDetailLoading] = useState(false);
  const [panelDetailPage, setPanelDetailPage] = useState(1);

  // ── Charger examens ──
  const loadTests = useCallback(async () => {
    setTestsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)   params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to', dateTo);
      params.set('ordering', testsOrdering);
      const res = await api.get(`/healthcare/laboratory/exam-stats/?${params}`);
      setTests(res.data.results || []);
    } catch (e) { console.error(e); }
    finally { setTestsLoading(false); }
  }, [search, dateFrom, dateTo, testsOrdering]);

  useEffect(() => { if (tab === 0) loadTests(); }, [loadTests, tab]);

  // ── Charger bilans ──
  const loadPanels = useCallback(async () => {
    setPanelsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)   params.set('search', search);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to', dateTo);
      params.set('ordering', panelsOrdering);
      const res = await api.get(`/healthcare/laboratory/panel-stats/?${params}`);
      setPanels(res.data.results || []);
    } catch (e) { console.error(e); }
    finally { setPanelsLoading(false); }
  }, [search, dateFrom, dateTo, panelsOrdering]);

  useEffect(() => { if (tab === 1) loadPanels(); }, [loadPanels, tab]);

  // ── Détail examen ──
  const loadTestDetail = useCallback(async (testId, page = 1) => {
    setTestDetailLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: 50 });
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to', dateTo);
      const res = await api.get(`/healthcare/laboratory/exam-stats/${testId}/?${params}`);
      setTestDetail(res.data);
      setTestDetailPage(page);
    } catch (e) { console.error(e); }
    finally { setTestDetailLoading(false); }
  }, [dateFrom, dateTo]);

  // ── Détail bilan ──
  const loadPanelDetail = useCallback(async (panelId, page = 1) => {
    setPanelDetailLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: 50 });
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to', dateTo);
      const res = await api.get(`/healthcare/laboratory/panel-stats/${panelId}/?${params}`);
      setPanelDetail(res.data);
      setPanelDetailPage(page);
    } catch (e) { console.error(e); }
    finally { setPanelDetailLoading(false); }
  }, [dateFrom, dateTo]);

  // KPI examens
  const totalTestPerformed = tests.reduce((s, t) => s + t.times_performed, 0);
  const totalTestRevenue   = tests.reduce((s, t) => s + t.revenue, 0);
  const doneTests          = tests.filter(t => t.times_performed > 0).length;

  // KPI bilans
  const totalPanelOrdered = panels.reduce((s, p) => s + p.times_ordered, 0);
  const totalPanelRevenue = panels.reduce((s, p) => s + p.revenue, 0);
  const donePanels        = panels.filter(p => p.times_ordered > 0).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/healthcare/laboratory/catalog')}>
          <ArrowBack />
        </IconButton>
        <Science color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" fontWeight={800}>Statistiques des Examens &amp; Bilans</Typography>
          <Typography variant="body2" color="text.secondary">
            Historique complet — quand, combien de fois, par qui
          </Typography>
        </Box>
      </Box>

      {/* Filtres */}
      <FilterBar
        search={search} setSearch={setSearch}
        dateFrom={dateFrom} setDateFrom={setDateFrom}
        dateTo={dateTo} setDateTo={setDateTo}
      />

      {/* Onglets */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Science />} iconPosition="start" label={`Examens (${tests.length})`} />
        <Tab icon={<LibraryBooks />} iconPosition="start" label={`Bilans / Packs (${panels.length})`} />
      </Tabs>

      {/* ── TAB 0 : Examens ── */}
      {tab === 0 && (
        <>
          <KpiRow kpis={[
            { label: 'Examens réalisés', value: `${doneTests} / ${tests.length}`, icon: <Science />, color: '#3b82f6' },
            { label: 'Total réalisations', value: fmt(totalTestPerformed), icon: <TrendingUp />, color: '#10b981' },
            { label: 'CA généré', value: `${fmt(totalTestRevenue)} XAF`, icon: <Assignment />, color: '#8b5cf6' },
          ]} />

          <SortChips ordering={testsOrdering} setOrdering={setTestsOrdering} options={[
            { key: '-times_performed', label: 'Plus réalisés' },
            { key: 'times_performed',  label: 'Moins réalisés' },
            { key: '-revenue',         label: 'CA décroissant' },
            { key: 'name',             label: 'Nom' },
            { key: '-last_date',       label: 'Récent' },
          ]} />

          <Card sx={{ borderRadius: 3 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Examen</strong></TableCell>
                    <TableCell><strong>Catégorie</strong></TableCell>
                    <TableCell align="center"><strong>Nb réalisations</strong></TableCell>
                    <TableCell align="center"><strong>CA (XAF)</strong></TableCell>
                    <TableCell align="center"><strong>Première fois</strong></TableCell>
                    <TableCell align="center"><strong>Dernière fois</strong></TableCell>
                    <TableCell align="center"><strong>Détail</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testsLoading ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                  ) : tests.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>Aucun examen trouvé</TableCell></TableRow>
                  ) : tests.map(t => (
                    <TableRow key={t.id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedTest(t); loadTestDetail(t.id); }}>
                      <TableCell><Typography variant="caption" fontWeight={700}>{t.test_code}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={500}>{t.name}</Typography></TableCell>
                      <TableCell>
                        {t.category && <Chip label={t.category} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={t.times_performed} size="small"
                          color={t.times_performed > 0 ? 'primary' : 'default'}
                          variant={t.times_performed > 0 ? 'filled' : 'outlined'} />
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
                          <IconButton size="small" color="primary" onClick={e => { e.stopPropagation(); setSelectedTest(t); loadTestDetail(t.id); }}>
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
        </>
      )}

      {/* ── TAB 1 : Bilans / Packs ── */}
      {tab === 1 && (
        <>
          <KpiRow kpis={[
            { label: 'Bilans commandés', value: `${donePanels} / ${panels.length}`, icon: <LibraryBooks />, color: '#f59e0b' },
            { label: 'Total commandes', value: fmt(totalPanelOrdered), icon: <TrendingUp />, color: '#10b981' },
            { label: 'CA généré', value: `${fmt(totalPanelRevenue)} XAF`, icon: <Assignment />, color: '#8b5cf6' },
          ]} />

          <SortChips ordering={panelsOrdering} setOrdering={setPanelsOrdering} options={[
            { key: '-times_ordered', label: 'Plus commandés' },
            { key: 'times_ordered',  label: 'Moins commandés' },
            { key: '-revenue',       label: 'CA décroissant' },
            { key: 'name',           label: 'Nom' },
            { key: '-last_date',     label: 'Récent' },
          ]} />

          <Card sx={{ borderRadius: 3 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Bilan / Pack</strong></TableCell>
                    <TableCell align="center"><strong>Nb examens</strong></TableCell>
                    <TableCell align="center"><strong>Prix catalogue</strong></TableCell>
                    <TableCell align="center"><strong>Nb commandes</strong></TableCell>
                    <TableCell align="center"><strong>CA (XAF)</strong></TableCell>
                    <TableCell align="center"><strong>Première fois</strong></TableCell>
                    <TableCell align="center"><strong>Dernière fois</strong></TableCell>
                    <TableCell align="center"><strong>Détail</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {panelsLoading ? (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                  ) : panels.length === 0 ? (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>Aucun bilan trouvé</TableCell></TableRow>
                  ) : panels.map(p => (
                    <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedPanel(p); loadPanelDetail(p.id); }}>
                      <TableCell><Typography variant="caption" fontWeight={700}>{p.code || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={500}>{p.name}</Typography></TableCell>
                      <TableCell align="center">
                        <Chip label={p.tests_count} size="small" variant="outlined" color="info" />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{fmt(p.price)} XAF</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={p.times_ordered} size="small"
                          color={p.times_ordered > 0 ? 'primary' : 'default'}
                          variant={p.times_ordered > 0 ? 'filled' : 'outlined'} />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} color={p.revenue > 0 ? 'success.main' : 'text.secondary'}>
                          {p.revenue > 0 ? fmt(p.revenue) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" color="text.secondary">
                          {p.first_date ? dayjs(p.first_date).format('DD/MM/YYYY') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" color="text.secondary">
                          {p.last_date ? dayjs(p.last_date).format('DD/MM/YYYY') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Voir l'historique">
                          <IconButton size="small" color="primary" onClick={e => { e.stopPropagation(); setSelectedPanel(p); loadPanelDetail(p.id); }}>
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
        </>
      )}

      {/* ── Dialog détail EXAMEN ── */}
      <Dialog open={!!selectedTest} onClose={() => { setSelectedTest(null); setTestDetail(null); }} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Science color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={800}>{selectedTest?.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedTest?.test_code} · {selectedTest?.category} · {fmt(selectedTest?.price)} XAF / examen
            </Typography>
          </Box>
          {testDetail && (
            <Stack direction="row" spacing={1}>
              <Chip label={`${testDetail.count} réalisation(s)`} color="primary" size="small" />
              <Chip label={`${fmt(tests.find(t => t.id === selectedTest?.id)?.revenue)} XAF`} color="success" size="small" />
            </Stack>
          )}
          <IconButton onClick={() => { setSelectedTest(null); setTestDetail(null); }} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {testDetailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : testDetail?.results?.length === 0 ? (
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
                    <TableCell align="center"><strong>Prix</strong></TableCell>
                    <TableCell><strong>Résultat</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testDetail?.results?.map((r, idx) => {
                    const st = STATUS_COLORS[r.statut] || { label: r.statut, color: '#9e9e9e' };
                    return (
                      <TableRow key={r.item_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                        <TableCell><Typography variant="body2" fontWeight={600}>{dayjs(r.date).format('DD/MM/YYYY')}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{r.heure}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={600} color="primary"
                            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => navigate(`/healthcare/laboratory/${r.order_id}`)}>
                            {r.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2"
                            sx={{ cursor: r.patient_id ? 'pointer' : 'default', color: r.patient_id ? 'primary.main' : 'inherit' }}
                            onClick={() => r.patient_id && navigate(`/healthcare/patients/${r.patient_id}`)}>
                            {r.patient}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{r.prescripteur || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{r.ordonne_par}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" color={r.biologiste ? 'success.main' : 'text.disabled'}>
                            {r.biologiste || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.sous_traitant
                            ? <Chip label={r.sous_traitant} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={st.label} size="small"
                            sx={{ bgcolor: st.color + '22', color: st.color, fontWeight: 700, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>{fmt(r.prix)}</Typography>
                        </TableCell>
                        <TableCell>
                          {r.resultat ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {r.anomalie && r.anomalie !== 'normal'
                                ? <Warning sx={{ fontSize: 14, color: 'warning.main' }} />
                                : <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />}
                              <Typography variant="caption" fontWeight={500}
                                color={r.anomalie && r.anomalie !== 'normal' ? 'warning.main' : 'success.main'}>
                                {r.resultat.slice(0, 30)}{r.resultat.length > 30 ? '…' : ''}
                              </Typography>
                            </Box>
                          ) : <Typography variant="caption" color="text.disabled">En attente</Typography>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        {testDetail && testDetail.pages > 1 && (
          <DialogActions sx={{ justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
            <Button disabled={testDetailPage <= 1} onClick={() => loadTestDetail(selectedTest.id, testDetailPage - 1)}>Précédent</Button>
            <Typography variant="body2" color="text.secondary">
              Page {testDetailPage} / {testDetail.pages} ({testDetail.count} entrées)
            </Typography>
            <Button disabled={testDetailPage >= testDetail.pages} onClick={() => loadTestDetail(selectedTest.id, testDetailPage + 1)}>Suivant</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ── Dialog détail BILAN ── */}
      <Dialog open={!!selectedPanel} onClose={() => { setSelectedPanel(null); setPanelDetail(null); }} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <LibraryBooks color="warning" />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={800}>{selectedPanel?.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedPanel?.code} · {selectedPanel?.tests_count} examens · {fmt(selectedPanel?.price)} XAF
            </Typography>
          </Box>
          {panelDetail && (
            <Stack direction="row" spacing={1}>
              <Chip label={`${panelDetail.count} commande(s)`} color="warning" size="small" />
              <Chip label={`${fmt(panels.find(p => p.id === selectedPanel?.id)?.revenue)} XAF`} color="success" size="small" />
            </Stack>
          )}
          <IconButton onClick={() => { setSelectedPanel(null); setPanelDetail(null); }} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {panelDetailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : panelDetail?.results?.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <LibraryBooks sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">Aucune commande sur la période sélectionnée</Typography>
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
                    <TableCell align="center"><strong>Statut</strong></TableCell>
                    <TableCell align="center"><strong>Prix bilan</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {panelDetail?.results?.map((r, idx) => {
                    const st = STATUS_COLORS[r.statut] || { label: r.statut, color: '#9e9e9e' };
                    return (
                      <TableRow key={r.item_id} hover sx={{ bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover' }}>
                        <TableCell><Typography variant="body2" fontWeight={600}>{dayjs(r.date).format('DD/MM/YYYY')}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{r.heure}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={600} color="primary"
                            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => navigate(`/healthcare/laboratory/${r.order_id}`)}>
                            {r.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2"
                            sx={{ cursor: r.patient_id ? 'pointer' : 'default', color: r.patient_id ? 'primary.main' : 'inherit' }}
                            onClick={() => r.patient_id && navigate(`/healthcare/patients/${r.patient_id}`)}>
                            {r.patient}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{r.prescripteur || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{r.ordonne_par}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" color={r.biologiste ? 'success.main' : 'text.disabled'}>
                            {r.biologiste || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={st.label} size="small"
                            sx={{ bgcolor: st.color + '22', color: st.color, fontWeight: 700, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>{fmt(r.prix)}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        {panelDetail && panelDetail.pages > 1 && (
          <DialogActions sx={{ justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
            <Button disabled={panelDetailPage <= 1} onClick={() => loadPanelDetail(selectedPanel.id, panelDetailPage - 1)}>Précédent</Button>
            <Typography variant="body2" color="text.secondary">
              Page {panelDetailPage} / {panelDetail.pages} ({panelDetail.count} commandes)
            </Typography>
            <Button disabled={panelDetailPage >= panelDetail.pages} onClick={() => loadPanelDetail(selectedPanel.id, panelDetailPage + 1)}>Suivant</Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
