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
  Settings as SettingsIcon,
  ChatBubbleOutline as RelanceIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import MonthlyReportButton from '../../components/crm/MonthlyReportButton';
import crmAPI from '../../services/crmAPI';
import useCurrentUser from '../../hooks/useCurrentUser';
import PassagesPanel from './PassagesPanel';
import StatsPanel from './StatsPanel';
import CampagnesPanel from './CampagnesPanel';
import QualitePanel from './QualitePanel';
import ReglagesDialog from './ReglagesDialog';
import RelanceDialog from '../../components/crm/RelanceDialog';
import Etiquettes from '../../components/crm/Etiquettes';
import { chargerMotifs, ilYa, jourCourt } from '../../components/crm/crmData';
import { useModules } from '../../contexts/ModuleContext';

const TAILLE_PAGE = 30;

// Deux onglets, mêmes composants : « À suivre » regroupe ce qu'on peut faire
// aujourd'hui (rappeler, souhaiter, relancer) ; « Patients » est la liste complète.
const ONGLETS = {
  suivre: {
    label: 'À suivre',
    segments: ['golden', 'not_back_60', 'to_call_back', 'revisit_due', 'awaited', 'promised_missing', 'new_month', 'vaccine_due', 'birthday_week', 'loyal'],
    defaut: 'golden',
  },
  patients: {
    label: 'Patients',
    segments: ['all', 'never_billed', 'no_origin'],
    defaut: 'all',
  },
  // Fiches bien ou mal renseignées, et par qui (administrateurs).
  qualite: {
    label: 'Qualité des fiches',
    segments: [],
    defaut: 'all',
  },
  // Les actions de terrain et leurs résultats.
  campagnes: {
    label: 'Campagnes',
    segments: [],
    defaut: 'all',
  },
  // Relances, campagnes, provenance, montée en gamme (montants réservés aux administrateurs).
  stats: {
    label: 'Statistiques',
    segments: [],
    defaut: 'all',
  },
  // Pas une liste de patients : les gens passés au centre, avec ou sans facture.
  passages: {
    label: 'Passages',
    segments: [],
    defaut: 'all',
  },
};

// Onglets qui affichent la liste des patients (les autres ont leur propre écran).
const ONGLETS_LISTE = ['suivre', 'patients'];

// Motif de relance proposé d'office selon la liste dans laquelle on travaille.
const MOTIF_PAR_SEGMENT = {
  golden: 'Rappel de suivi',
  to_call_back: 'Rappel de suivi',
  revisit_due: 'Rappel de suivi',
  promised_missing: 'Rappel de suivi',
  not_back_60: 'Rappel de suivi',
  new_month: 'Rappel de suivi',
  vaccine_due: 'Vaccination',
  birthday_week: 'Vœux / anniversaire',
};

const COULEUR_ETAT = { came: 'success', waiting: 'info', missed: 'warning' };
const TEXTE_ETAT = { came: 'venu', waiting: 'attendu', missed: 'pas venu' };

const MODELES_MESSAGE = {
  revisit_due: "Bonjour {nom}, ici {centre}. Votre contrôle était prévu ces jours-ci. Quand pouvez-vous passer nous voir ?",
  golden: "Bonjour {nom}, ici {centre}. Comment allez-vous depuis votre passage chez nous ? Si vous avez besoin d'un suivi ou d'un contrôle, nous sommes là.",
  awaited: "Bonjour {nom}, ici {centre}. Nous vous attendons comme convenu. N'hésitez pas à nous prévenir si vous avez un empêchement.",
  promised_missing: "Bonjour {nom}, ici {centre}. Vous deviez passer nous voir et nous vous attendons toujours. Quel jour vous conviendrait ?",
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
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
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

  const [message, setMessage] = useState(null); // { patient, texte, motifId }
  const [relance, setRelance] = useState(null); // patient pour qui on note une relance
  const [reglages, setReglages] = useState(false);
  const [motifs, setMotifs] = useState([]);
  const estAdmin = ['admin', 'manager', 'owner'].includes(user?.role) || Boolean(user?.is_superuser);

  const nomCentre = user?.organization?.name || user?.organization_name || 'le centre';

  useEffect(() => { chargerMotifs().then(setMotifs).catch(() => {}); }, []);

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

  useEffect(() => { if (ONGLETS_LISTE.includes(onglet)) charger(); }, [charger, onglet]);

  // Un passage vient d'être enregistré (bouton flottant) : la pastille « dernier
  // passage » des lignes doit se mettre à jour sans recharger la page.
  useEffect(() => {
    const recharger = () => { if (ONGLETS_LISTE.includes(onglet)) charger(); };
    window.addEventListener('crm-passage-created', recharger);
    window.addEventListener('crm-relance-saved', recharger);
    return () => {
      window.removeEventListener('crm-passage-created', recharger);
      window.removeEventListener('crm-relance-saved', recharger);
    };
  }, [charger, onglet]);

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
    const motifDefaut = motifs.find((m) => m.label === MOTIF_PAR_SEGMENT[segment]);
    const base = lireMemoire(cle) || MODELES_MESSAGE[segment] || (motifDefaut && motifDefaut.template) || MODELES_MESSAGE.defaut;
    setMessage({ patient, cle, texte: base, motifId: motifDefaut ? motifDefaut.id : '' });
  };

  const texteFinal = (m) => m.texte
    .split('{nom}').join(titre(m.patient.name))
    .split('{centre}').join(nomCentre);

  const envoyerWhatsApp = async () => {
    ecrireMemoire(message.cle, message.texte);
    window.open(`${message.patient.whatsapp_url}?text=${encodeURIComponent(texteFinal(message))}`, '_blank');
    const { patient, motifId } = message;
    setMessage(null);
    // On note la relance d'office : c'est elle qui permettra de savoir s'il est venu ensuite.
    try {
      const cree = await crmAPI.createContact({
        patient_id: patient.id, channel: 'whatsapp', reason_id: motifId || null, outcome: 'sent',
      });
      charger();
      enqueueSnackbar('Relance notée', {
        variant: 'success', autoHideDuration: 10000,
        action: (key) => (
          <>
            <Button color="inherit" size="small" onClick={async () => {
              closeSnackbar(key);
              try { await crmAPI.updateContact(cree.id, { outcome: 'agreed' }); charger(); } catch (e) { /* sans gravité */ }
            }}>
              Il est d'accord
            </Button>
            <Button color="inherit" size="small" onClick={() => closeSnackbar(key)}>OK</Button>
          </>
        ),
      });
    } catch (e) {
      enqueueSnackbar("Le message est parti, mais la relance n'a pas pu être notée", { variant: 'warning' });
    }
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
      <Tooltip title="Noter une relance (appel, message…)">
        <IconButton onClick={() => setRelance(p)} aria-label="Noter une relance" sx={{ width: { xs: 44, md: 36 }, height: { xs: 44, md: 36 } }}>
          <RelanceIcon fontSize="small" />
        </IconButton>
      </Tooltip>
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
      {p.tags && p.tags.length > 0 && <Box sx={{ my: 0.25 }}><Etiquettes tags={p.tags} max={4} /></Box>}
      <Typography variant="caption" color="text.secondary">
        {[p.age != null ? `${p.age} ans` : null, p.gender === 'F' ? 'Femme' : p.gender === 'M' ? 'Homme' : null,
          p.quartier || (p.address ? p.address.split('\n')[0].slice(0, 28) : null)].filter(Boolean).join(' · ')}
      </Typography>
      {(p.last_contact || p.do_not_contact) && (
        <Box mt={0.5} display="flex" gap={0.5} flexWrap="wrap">
          {p.last_contact && (
            <Chip
              size="small" clickable onClick={() => setRelance(p)}
              color={COULEUR_ETAT[p.last_contact.status] || 'default'}
              variant={p.last_contact.status === 'came' ? 'filled' : 'outlined'}
              label={`Relancé ${ilYa(p.last_contact.days)} · ${p.last_contact.channel}${p.last_contact.reason ? ` · ${p.last_contact.reason}` : ''} · ${p.last_contact.outcome_label.toLowerCase()}${p.follow_up_date && ['callback', 'agreed'].includes(p.last_contact.outcome) ? ` (${p.last_contact.outcome === 'callback' ? 'rappeler' : 'prévu'} le ${jourCourt(p.follow_up_date)})` : ''}${TEXTE_ETAT[p.last_contact.status] ? ` · ${TEXTE_ETAT[p.last_contact.status]}` : ''}`}
              sx={{ height: 20, fontSize: '0.68rem', maxWidth: '100%' }}
            />
          )}
          {p.do_not_contact && <Chip size="small" color="error" label="Ne plus relancer" sx={{ height: 20, fontSize: '0.68rem' }} />}
        </Box>
      )}
      {p.last_passage && (
        <Box mt={0.5}>
          <Chip
            size="small" variant="outlined" color="info"
            label={`Passage ${p.last_passage.days < 1 ? "aujourd'hui" : `il y a ${p.last_passage.days} j`} · ${p.last_passage.reason}`}
            sx={{ height: 20, fontSize: '0.68rem' }}
          />
        </Box>
      )}
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
        <Box display="flex" gap={1} flexWrap="wrap">
        {estAdmin && (
          <Button size="small" variant="outlined" startIcon={<SettingsIcon />} onClick={() => setReglages(true)}>
            Réglages
          </Button>
        )}
        <MonthlyReportButton />
        {ONGLETS_LISTE.includes(onglet) && donnees?.can_export && (
          <Button
            size="small" variant="outlined" onClick={exporter} disabled={export_}
            startIcon={export_ ? <CircularProgress size={14} /> : <DownloadIcon />}
          >
            Exporter en Excel
          </Button>
        )}
        </Box>
      </Box>

      <Tabs value={onglet} onChange={changerOnglet} sx={{ mb: 1.5 }}>
        {Object.entries(ONGLETS)
          .filter(([, o]) => !o.admin || donnees?.can_see_amounts)
          .map(([cle, o]) => <Tab key={cle} value={cle} label={o.label} />)}
      </Tabs>

      {onglet === 'stats' ? (
        <StatsPanel peutVoirMontants={estAdmin} />
      ) : onglet === 'campagnes' ? (
        <CampagnesPanel estAdmin={estAdmin} />
      ) : onglet === 'qualite' ? (
        <QualitePanel peutOuvrirDossier={peutOuvrirDossier} onOuvrirPatient={(id) => navigate(`/healthcare/patients/${id}`)} />
      ) : onglet === 'passages' ? (
        <PassagesPanel
          peutOuvrirDossier={peutOuvrirDossier}
          onOuvrirPatient={(id) => navigate(`/healthcare/patients/${id}`)}
          estAdmin={['admin', 'manager', 'owner'].includes(user?.role) || Boolean(user?.is_superuser)}
          monNom={`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || ''}
        />
      ) : (
        <>
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
          {[...TRIS, ...(donnees?.can_see_amounts ? [{ value: '-paid_total', label: "Plus gros dépensiers d'abord" }] : [])]
            .map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
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
        </>
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
          {message && motifs.length > 0 && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                Pour quoi ? <span style={{ opacity: 0.7 }}>(la relance sera notée avec ce motif)</span>
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                {motifs.map((m) => {
                  const actif = message.motifId === m.id;
                  return (
                    <Chip key={m.id} clickable size="small" label={m.label}
                      onClick={() => setMessage({ ...message, motifId: actif ? '' : m.id, texte: !actif && m.template ? m.template : message.texte })}
                      color={actif ? 'primary' : 'default'} variant={actif ? 'filled' : 'outlined'} />
                  );
                })}
              </Box>
            </Box>
          )}
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

      <RelanceDialog
        open={Boolean(relance)} patient={relance} estAdmin={estAdmin}
        onClose={() => setRelance(null)} onSaved={() => charger()}
      />
      <ReglagesDialog open={reglages} onClose={() => setReglages(false)} />
    </Box>
  );
}
