import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, Chip, TextField, InputAdornment, Button, IconButton, Tooltip,
  Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper,
  Pagination, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup, MenuItem, FormControlLabel, Switch, Stack, Badge,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  Search as SearchIcon,
  WhatsApp as WhatsAppIcon,
  Phone as PhoneIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import useCurrentUser from '../../hooks/useCurrentUser';
import { useModules } from '../../contexts/ModuleContext';

const TAILLE_PAGE = 30;

// Deux onglets, mêmes composants : « À suivre » regroupe ce qu'on peut faire
// aujourd'hui (rappeler, souhaiter, relancer) ; « Patients » est la liste complète.
const ONGLETS = {
  suivre: {
    label: 'À suivre',
    segments: ['not_back_60', 'new_month', 'vaccine_due', 'birthday_week', 'loyal'],
    defaut: 'not_back_60',
  },
  patients: {
    label: 'Patients',
    segments: ['all', 'never_billed'],
    defaut: 'all',
  },
};

const MODELES_MESSAGE = {
  not_back_60: "Bonjour {nom}, ici {centre}. Cela fait un moment que nous ne vous avons pas vu. Comment allez-vous ? N'hésitez pas à passer nous voir.",
  new_month: "Bonjour {nom}, merci d'avoir choisi {centre}. Comment vous sentez-vous depuis votre visite ?",
  vaccine_due: "Bonjour {nom}, ici {centre}. Nous vous rappelons que votre prochain vaccin approche. Passez nous voir pour le faire.",
  birthday_week: "Bonjour {nom}, toute l'équipe de {centre} vous souhaite un joyeux anniversaire !",
  loyal: "Bonjour {nom}, merci pour votre fidélité à {centre}. Prenez soin de vous !",
  defaut: "Bonjour {nom}, ici {centre}. ",
};

const FILTRES_VIDES = {
  gender: '', age_min: '', age_max: '', min_visits: '', inactive_days: '',
  quartier: '', service: '', privilege_card: false, include_external: false,
};

const TRIS = [
  { value: '-last_visit', label: 'Dernière visite (récente d\'abord)' },
  { value: 'last_visit', label: 'Dernière visite (ancienne d\'abord)' },
  { value: 'name', label: 'Nom' },
  { value: '-visits', label: 'Nombre de visites' },
  { value: '-created_at', label: 'Nouveaux d\'abord' },
];

const titre = (nom) => (nom || '')
  .toLowerCase().replace(/(^|\s|-)(\S)/g, (_, a, b) => a + b.toUpperCase());

const depuis = (jours) => {
  if (jours === null || jours === undefined) return 'Jamais facturé';
  if (jours < 1) return "Aujourd'hui";
  if (jours === 1) return 'Hier';
  if (jours < 60) return `il y a ${jours} jours`;
  if (jours < 365) return `il y a ${Math.round(jours / 30)} mois`;
  const ans = Math.floor(jours / 365);
  return `il y a ${ans} an${ans > 1 ? 's' : ''}`;
};

const fmt = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

const lireMemoire = (cle) => {
  try { return window.localStorage.getItem(cle); } catch (e) { return null; }
};
const ecrireMemoire = (cle, valeur) => {
  try { window.localStorage.setItem(cle, valeur); } catch (e) { /* stockage indisponible */ }
};

export default function SuiviPatients() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useCurrentUser();
  const { hasModule } = useModules();
  // Le dossier médical n'est ouvert que par ceux qui ont le module Patients :
  // un compte limité au suivi (commerciale) voit la liste, pas les dossiers.
  const peutOuvrirDossier = hasModule('patients');

  const [onglet, setOnglet] = useState('suivre');
  const [segment, setSegment] = useState(ONGLETS.suivre.defaut);
  const [recherche, setRecherche] = useState('');
  const [rechercheDiff, setRechercheDiff] = useState('');
  const [page, setPage] = useState(1);
  const [tri, setTri] = useState('-last_visit');
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [brouillon, setBrouillon] = useState(FILTRES_VIDES);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [export_, setExport] = useState(false);

  const [message, setMessage] = useState(null); // { patient, texte }

  const nomCentre = user?.organization?.name || user?.organization_name || 'le centre';

  useEffect(() => {
    const t = setTimeout(() => { setRechercheDiff(recherche); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [recherche]);

  const parametres = useMemo(() => {
    const p = { segment, ordering: tri, page, page_size: TAILLE_PAGE };
    if (rechercheDiff) p.q = rechercheDiff;
    Object.entries(filtres).forEach(([cle, valeur]) => {
      if (valeur === '' || valeur === false || valeur === null) return;
      p[cle] = valeur === true ? 1 : valeur;
    });
    return p;
  }, [segment, tri, page, rechercheDiff, filtres]);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setDonnees(await crmAPI.listPatients(parametres));
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Impossible de charger les patients', { variant: 'error' });
    } finally {
      setChargement(false);
    }
  }, [parametres, enqueueSnackbar]);

  useEffect(() => { charger(); }, [charger]);

  const changerOnglet = (_, valeur) => {
    setOnglet(valeur);
    setSegment(ONGLETS[valeur].defaut);
    setPage(1);
  };

  const choisirSegment = (code) => { setSegment(code); setPage(1); };

  const nbFiltres = Object.entries(filtres).filter(([, v]) => v !== '' && v !== false).length;

  const appliquerFiltres = () => { setFiltres(brouillon); setPage(1); setFiltresOuverts(false); };
  const reinitialiserFiltres = () => { setBrouillon(FILTRES_VIDES); setFiltres(FILTRES_VIDES); setPage(1); setFiltresOuverts(false); };

  const exporter = async () => {
    setExport(true);
    try {
      const { page: _p, page_size: _s, ...sansPagination } = parametres;
      const blob = await crmAPI.exportPatients(sansPagination);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = 'suivi-patients.xlsx';
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      enqueueSnackbar("Impossible d'exporter la liste", { variant: 'error' });
    } finally {
      setExport(false);
    }
  };

  // ── Message WhatsApp : modèle selon le segment, modifiable, mémorisé ──────
  const ouvrirMessage = (patient) => {
    const cle = `crm-modele-${segment}`;
    const base = lireMemoire(cle) || MODELES_MESSAGE[segment] || MODELES_MESSAGE.defaut;
    setMessage({ patient, cle, texte: base });
  };

  const texteFinal = (m) => m.texte
    .split('{nom}').join(titre(m.patient.name))
    .split('{centre}').join(nomCentre);

  const envoyerWhatsApp = () => {
    ecrireMemoire(message.cle, message.texte);
    window.open(`${message.patient.whatsapp_url}?text=${encodeURIComponent(texteFinal(message))}`, '_blank');
    setMessage(null);
  };

  // ── Éléments d'affichage ──────────────────────────────────────────────────
  const boutonsContact = (p) => (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {p.whatsapp_url ? (
        <Tooltip title="Écrire sur WhatsApp">
          <IconButton onClick={() => ouvrirMessage(p)} sx={{ color: '#25D366', width: { xs: 44, md: 36 }, height: { xs: 44, md: 36 } }} aria-label="WhatsApp">
            <WhatsAppIcon />
          </IconButton>
        </Tooltip>
      ) : null}
      {p.phone ? (
        <Tooltip title={p.phone}>
          <IconButton component="a" href={`tel:${p.phone.split('/')[0].trim()}`} aria-label="Appeler" sx={{ width: { xs: 44, md: 36 }, height: { xs: 44, md: 36 } }}>
            <PhoneIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Typography variant="caption" color="text.secondary">Pas de numéro</Typography>
      )}
      {p.phone_shared > 1 && (
        <Tooltip title={`${p.phone_shared} fiches ont ce numéro : un seul message suffit pour la famille.`}>
          <Chip size="small" variant="outlined" label={`Partagé ×${p.phone_shared}`} sx={{ height: 20, fontSize: '0.68rem' }} />
        </Tooltip>
      )}
    </Stack>
  );

  const pastillesServices = (p) => {
    const liste = p.services || [];
    if (!liste.length) return null;
    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {liste.slice(0, 3).map((s) => (
          <Chip key={s.value} size="small" label={s.label} sx={{ height: 20, fontSize: '0.68rem' }} />
        ))}
        {liste.length > 3 && <Chip size="small" label={`+${liste.length - 3}`} sx={{ height: 20, fontSize: '0.68rem' }} />}
      </Stack>
    );
  };

  const derniereVisite = (p) => (
    <Typography
      variant="body2"
      sx={{ color: p.days_since_last_visit >= 60 ? 'warning.main' : 'text.primary', fontWeight: p.days_since_last_visit >= 60 ? 600 : 400 }}
    >
      {depuis(p.days_since_last_visit)}
    </Typography>
  );

  const identite = (p) => (
    <Box>
      <Typography
        variant="body2" fontWeight={700} sx={{ cursor: peutOuvrirDossier ? 'pointer' : 'default' }}
        onClick={peutOuvrirDossier ? () => navigate(`/healthcare/patients/${p.id}`) : undefined}
      >
        {titre(p.name)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {[p.age != null ? `${p.age} ans` : null, p.gender === 'F' ? 'Femme' : p.gender === 'M' ? 'Homme' : null,
          p.address ? p.address.split('\n')[0].slice(0, 28) : null].filter(Boolean).join(' · ')}
      </Typography>
    </Box>
  );

  const carte = (p) => (
    <Card key={p.id} variant="outlined" sx={{ mb: 1.25 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          {identite(p)}
          <Box textAlign="right">
            {derniereVisite(p)}
            <Typography variant="caption" color="text.secondary">
              {p.visits} visite{p.visits > 1 ? 's' : ''}
              {donnees?.can_see_amounts && p.paid_total != null ? ` · ${fmt(p.paid_total)}` : ''}
            </Typography>
          </Box>
        </Box>
        <Box mt={1}>{pastillesServices(p)}</Box>
        <Box mt={0.5}>{boutonsContact(p)}</Box>
      </CardContent>
    </Card>
  );

  const tableau = (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Patient</TableCell>
            <TableCell>Dernière visite</TableCell>
            <TableCell align="center">Visites</TableCell>
            <TableCell>Services</TableCell>
            {donnees?.can_see_amounts && <TableCell align="right">Total payé</TableCell>}
            <TableCell>Contact</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(donnees?.results || []).map((p) => (
            <TableRow key={p.id} hover>
              <TableCell>{identite(p)}</TableCell>
              <TableCell>{derniereVisite(p)}</TableCell>
              <TableCell align="center">{p.visits}</TableCell>
              <TableCell>{pastillesServices(p)}</TableCell>
              {donnees?.can_see_amounts && <TableCell align="right">{fmt(p.paid_total)}</TableCell>}
              <TableCell>{boutonsContact(p)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const comptes = useMemo(() => {
    const m = {};
    (donnees?.segments || []).forEach((s) => { m[s.code] = s; });
    return m;
  }, [donnees]);

  const nbPages = donnees ? Math.max(Math.ceil(donnees.count / TAILLE_PAGE), 1) : 1;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5} gap={1} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={1}>
          <GroupsIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Suivi patients</Typography>
        </Box>
        {donnees?.can_export && (
          <Button
            size="small" variant="outlined" onClick={exporter} disabled={export_}
            startIcon={export_ ? <CircularProgress size={14} /> : <DownloadIcon />}
          >
            Exporter en Excel
          </Button>
        )}
      </Box>

      <Tabs value={onglet} onChange={changerOnglet} sx={{ mb: 1.5 }}>
        {Object.entries(ONGLETS).map(([cle, o]) => <Tab key={cle} value={cle} label={o.label} />)}
      </Tabs>

      {/* Segments : un tap pour changer de liste */}
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1 }}>
        {ONGLETS[onglet].segments.map((code) => {
          const s = comptes[code];
          const actif = segment === code;
          return (
            <Chip
              key={code}
              clickable
              color={actif ? 'primary' : 'default'}
              variant={actif ? 'filled' : 'outlined'}
              onClick={() => choisirSegment(code)}
              label={s ? `${s.label} · ${s.count}` : code}
              sx={{ flexShrink: 0, fontWeight: actif ? 700 : 400 }}
            />
          );
        })}
      </Box>

      {/* Recherche + filtres + tri */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small" placeholder="Nom, téléphone ou numéro patient" value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 220 }}
        />
        <TextField
          select size="small" value={tri} onChange={(e) => { setTri(e.target.value); setPage(1); }}
          sx={{ minWidth: 200 }} label="Trier par"
        >
          {TRIS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
        <Badge color="primary" badgeContent={nbFiltres} invisible={!nbFiltres}>
          <Button size="small" variant="outlined" startIcon={<FilterIcon />}
            onClick={() => { setBrouillon(filtres); setFiltresOuverts(true); }}>
            Filtres
          </Button>
        </Badge>
      </Box>

      {/* Résultats */}
      {chargement && !donnees ? (
        <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
      ) : donnees && donnees.results.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <GroupsIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
          <Typography fontWeight={600} mt={1}>Personne dans cette liste</Typography>
          <Typography variant="body2" color="text.secondary">
            Essayez une autre liste ou retirez un filtre.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ opacity: chargement ? 0.6 : 1, transition: 'opacity .15s' }}>
          {donnees && (
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {donnees.count} patient{donnees.count > 1 ? 's' : ''}
            </Typography>
          )}
          {isMobile ? (donnees?.results || []).map(carte) : tableau}
          {nbPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination count={nbPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </Box>
      )}

      {/* Filtres avancés */}
      <Dialog open={filtresOuverts} onClose={() => setFiltresOuverts(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Filtres</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">Sexe</Typography>
              <ToggleButtonGroup
                exclusive fullWidth size="small" value={brouillon.gender}
                onChange={(_, v) => setBrouillon({ ...brouillon, gender: v || '' })}
              >
                <ToggleButton value="F">Femmes</ToggleButton>
                <ToggleButton value="M">Hommes</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box display="flex" gap={1}>
              <TextField label="Âge min." type="number" size="small" fullWidth value={brouillon.age_min}
                onChange={(e) => setBrouillon({ ...brouillon, age_min: e.target.value })} inputProps={{ min: 0 }} />
              <TextField label="Âge max." type="number" size="small" fullWidth value={brouillon.age_max}
                onChange={(e) => setBrouillon({ ...brouillon, age_max: e.target.value })} inputProps={{ min: 0 }} />
            </Box>
            <TextField label="Au moins … visites" type="number" size="small" value={brouillon.min_visits}
              onChange={(e) => setBrouillon({ ...brouillon, min_visits: e.target.value })} inputProps={{ min: 0 }} />
            <TextField label="Pas venus depuis … jours" type="number" size="small" value={brouillon.inactive_days}
              onChange={(e) => setBrouillon({ ...brouillon, inactive_days: e.target.value })} inputProps={{ min: 1 }} />
            <TextField label="Quartier ou adresse contient" size="small" value={brouillon.quartier}
              onChange={(e) => setBrouillon({ ...brouillon, quartier: e.target.value })} />
            <TextField select label="A déjà utilisé le service" size="small" value={brouillon.service}
              onChange={(e) => setBrouillon({ ...brouillon, service: e.target.value })}>
              <MenuItem value="">Tous</MenuItem>
              {(donnees?.service_choices || []).map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
            <FormControlLabel
              control={<Switch checked={brouillon.privilege_card} onChange={(e) => setBrouillon({ ...brouillon, privilege_card: e.target.checked })} />}
              label="Titulaires d'une carte privilège"
            />
            <FormControlLabel
              control={<Switch checked={brouillon.include_external} onChange={(e) => setBrouillon({ ...brouillon, include_external: e.target.checked })} />}
              label="Inclure les patients de laboratoires partenaires"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={reinitialiserFiltres}>Tout effacer</Button>
          <Button variant="contained" onClick={appliquerFiltres}>Appliquer</Button>
        </DialogActions>
      </Dialog>

      {/* Message WhatsApp */}
      <Dialog open={Boolean(message)} onClose={() => setMessage(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Message pour {message ? titre(message.patient.name) : ''}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            multiline minRows={4} fullWidth autoFocus value={message?.texte || ''}
            onChange={(e) => setMessage({ ...message, texte: e.target.value })}
            helperText="{nom} et {centre} sont remplacés à l'envoi. Votre modification est retenue pour cette liste."
          />
          {message && (
            <Paper variant="outlined" sx={{ p: 1.5, mt: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary">Aperçu</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{texteFinal(message)}</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setMessage(null)}>Annuler</Button>
          <Button variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={envoyerWhatsApp}>
            Ouvrir WhatsApp
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
