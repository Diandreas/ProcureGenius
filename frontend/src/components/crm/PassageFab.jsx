import React, { useState, useEffect, useRef } from 'react';
import {
  Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Autocomplete, Box, Typography, Chip, Stack, CircularProgress, Link, useMediaQuery, useTheme,
} from '@mui/material';
import {
  HowToReg as PassageIcon,
  InfoOutlined as InfoIcon,
  EventAvailable as RdvIcon,
  Description as ResultsIcon,
  Payments as PaymentIcon,
  Medication as MedicationIcon,
  ReportProblemOutlined as ComplaintIcon,
  MoreHoriz as OtherIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import { useModules } from '../../contexts/ModuleContext';

// Ce que la personne est venue faire. Les valeurs correspondent à celles du serveur
// (apps/crm/models.py, PatientInteraction.REASON_CHOICES).
const MOTIFS = [
  { value: 'information', label: 'Renseignement', Icon: InfoIcon },
  { value: 'appointment', label: 'Rendez-vous', Icon: RdvIcon },
  { value: 'results', label: 'Résultats ou documents', Icon: ResultsIcon },
  { value: 'payment', label: 'Règlement', Icon: PaymentIcon },
  { value: 'medication', label: 'Médicaments', Icon: MedicationIcon },
  { value: 'complaint', label: 'Réclamation', Icon: ComplaintIcon },
  { value: 'other', label: 'Autre', Icon: OtherIcon },
];

const titre = (nom) => (nom || '')
  .toLowerCase().replace(/(^|\s|-)(\S)/g, (_, a, b) => a + b.toUpperCase());

const VIDE = { patient: null, nom: '', telephone: '', motif: '', texte: '', perte: '' };

// Reparti sans rien acheter : pourquoi ? (apps/crm/models.py, PatientInteraction.LOST_CHOICES)
const PERTES = [
  { value: 'price', label: 'Trop cher' },
  { value: 'stock', label: 'Produit ou examen indisponible' },
  { value: 'wait', label: 'Attente trop longue' },
  { value: 'doctor', label: 'Médecin absent' },
  { value: 'other', label: 'Autre raison' },
];

/**
 * Bouton flottant « un patient est passé » : on choisit la personne, on touche ce
 * qu'elle est venue faire, c'est enregistré. Trois gestes, sans facture.
 * N'apparaît que pour les comptes qui ont le module Suivi patients.
 */
export default function PassageFab() {
  const { hasModule } = useModules();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState(VIDE);
  const [sansFiche, setSansFiche] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [options, setOptions] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const dernierAppel = useRef(0);

  // Recherche de patient, avec un petit délai pour ne pas interroger à chaque lettre.
  useEffect(() => {
    if (!ouvert || sansFiche || recherche.trim().length < 2) {
      setOptions([]);
      return undefined;
    }
    const numero = ++dernierAppel.current;
    setChargement(true);
    const t = setTimeout(async () => {
      try {
        const liste = await crmAPI.searchPatients(recherche.trim());
        if (numero === dernierAppel.current) setOptions(liste);
      } catch (e) {
        if (numero === dernierAppel.current) setOptions([]);
      } finally {
        if (numero === dernierAppel.current) setChargement(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [recherche, ouvert, sansFiche]);

  if (!hasModule('crm')) return null;

  const fermer = () => {
    if (envoi) return;
    setOuvert(false);
    setSaisie(VIDE);
    setSansFiche(false);
    setRecherche('');
    setOptions([]);
    setErreur('');
  };

  const enregistrer = async (puisAjouterUnAutre) => {
    if (!sansFiche && !saisie.patient) { setErreur('Choisissez le patient.'); return; }
    if (sansFiche && !saisie.nom.trim()) { setErreur('Indiquez son nom.'); return; }
    if (!saisie.motif) { setErreur("Touchez ce qu'il est venu faire."); return; }

    setEnvoi(true);
    setErreur('');
    try {
      const corps = { reason: saisie.motif, text: saisie.texte.trim(), lost_reason: saisie.perte };
      if (sansFiche) {
        corps.person_name = saisie.nom.trim();
        corps.person_phone = saisie.telephone.trim();
      } else {
        corps.patient_id = saisie.patient.id;
      }
      const cree = await crmAPI.createPassage(corps);
      enqueueSnackbar(`Passage enregistré pour ${titre(cree.name)}`, { variant: 'success' });
      // La page « Suivi patients » écoute cet événement pour se rafraîchir.
      window.dispatchEvent(new CustomEvent('crm-passage-created'));
      if (puisAjouterUnAutre) {
        setSaisie(VIDE);
        setSansFiche(false);
        setRecherche('');
        setOptions([]);
      } else {
        fermer();
      }
    } catch (e) {
      setErreur(e.response?.data?.error || "Impossible d'enregistrer le passage");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <Tooltip title="Un patient est passé" placement="left">
        <Fab
          color="success"
          size="medium"
          aria-label="Signaler le passage d'un patient"
          onClick={() => setOuvert(true)}
          sx={{
            position: 'fixed',
            // Juste au-dessus du bouton de support (56 px, 24 px du bord).
            bottom: { xs: 140, md: 88 },
            right: 28,
            zIndex: (t) => t.zIndex.drawer + 2,
          }}
        >
          <PassageIcon />
        </Fab>
      </Tooltip>

      <Dialog open={ouvert} onClose={fermer} maxWidth="sm" fullWidth fullScreen={mobile}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={700}>Un patient est passé</Typography>
          <Typography variant="body2" color="text.secondary">
            À noter même sans consultation ni facture.
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            {/* 1. Qui */}
            <Box>
              <Typography variant="caption" color="text.secondary">Qui ?</Typography>
              {!sansFiche ? (
                <>
                  <Autocomplete
                    options={options}
                    loading={chargement}
                    value={saisie.patient}
                    onChange={(_, v) => { setSaisie({ ...saisie, patient: v }); setErreur(''); }}
                    inputValue={recherche}
                    onInputChange={(_, v) => setRecherche(v)}
                    filterOptions={(x) => x}
                    getOptionLabel={(o) => titre(o.name)}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    noOptionsText={recherche.trim().length < 2
                      ? 'Écrivez au moins 2 lettres'
                      : 'Aucun patient trouvé'}
                    loadingText="Recherche…"
                    renderOption={(props, o) => (
                      <li {...props} key={o.id}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{titre(o.name)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[o.age != null ? `${o.age} ans` : null, o.phone, o.patient_number]
                              .filter(Boolean).join(' · ')}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params} autoFocus placeholder="Nom, téléphone ou numéro patient" size="small"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {chargement ? <CircularProgress size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                    Pas encore enregistré ?{' '}
                    <Link component="button" type="button" underline="always"
                      onClick={() => { setSansFiche(true); setErreur(''); }}>
                      Saisir juste un nom
                    </Link>
                  </Typography>
                </>
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={0.5}>
                    <TextField
                      autoFocus size="small" fullWidth label="Nom" value={saisie.nom}
                      onChange={(e) => { setSaisie({ ...saisie, nom: e.target.value }); setErreur(''); }}
                    />
                    <TextField
                      size="small" fullWidth label="Téléphone (facultatif)" value={saisie.telephone}
                      inputProps={{ inputMode: 'tel' }}
                      onChange={(e) => setSaisie({ ...saisie, telephone: e.target.value })}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                    <Link component="button" type="button" underline="always"
                      onClick={() => { setSansFiche(false); setErreur(''); }}>
                      Choisir plutôt un patient enregistré
                    </Link>
                  </Typography>
                </>
              )}
            </Box>

            {/* 2. Pour quoi : de grosses pastilles, un seul geste */}
            <Box>
              <Typography variant="caption" color="text.secondary">Venu pour</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
                {MOTIFS.map(({ value, label, Icon }) => {
                  const actif = saisie.motif === value;
                  return (
                    <Chip
                      key={value}
                      clickable
                      icon={<Icon />}
                      label={label}
                      color={actif ? 'primary' : 'default'}
                      variant={actif ? 'filled' : 'outlined'}
                      onClick={() => { setSaisie({ ...saisie, motif: value }); setErreur(''); }}
                      sx={{ height: 40, fontSize: '0.9rem', fontWeight: actif ? 700 : 400, px: 0.5 }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* 3. Reparti sans acheter ? facultatif */}
            <Box>
              <Typography variant="caption" color="text.secondary">
                Reparti sans acheter ? <span style={{ opacity: 0.7 }}>(facultatif — dites pourquoi)</span>
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
                {PERTES.map((p) => {
                  const actif = saisie.perte === p.value;
                  return (
                    <Chip key={p.value} clickable label={p.label} size="small"
                      color={actif ? 'warning' : 'default'} variant={actif ? 'filled' : 'outlined'}
                      onClick={() => setSaisie({ ...saisie, perte: actif ? '' : p.value })}
                      sx={{ height: 34, fontWeight: actif ? 700 : 400 }} />
                  );
                })}
              </Box>
              {saisie.perte === 'stock' && (
                <Typography variant="caption" color="warning.main" display="block" mt={0.5}>
                  Écrivez ce qui manquait dans le détail : la liste servira aux commandes.
                </Typography>
              )}
            </Box>

            {/* 4. Détail, facultatif */}
            <TextField
              size="small" fullWidth multiline minRows={2} label="Détail (facultatif)"
              placeholder="Ce qu'il voulait savoir, ce qui a été répondu…"
              value={saisie.texte} inputProps={{ maxLength: 500 }}
              onChange={(e) => setSaisie({ ...saisie, texte: e.target.value })}
            />

            {erreur && (
              <Typography variant="body2" color="error">{erreur}</Typography>
            )}
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3, py: 2, gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            // Le style par défaut de MUI espace les boutons avec une marge gauche.
            '& > :not(style) ~ :not(style)': { ml: 0 },
          }}
        >
          {/* Sur mobile : l'action principale d'abord, pleine largeur. */}
          <Button
            variant="contained" size={mobile ? 'large' : 'medium'} onClick={() => enregistrer(false)} disabled={envoi}
            startIcon={envoi ? <CircularProgress size={16} /> : <PassageIcon />}
            sx={{ order: { xs: 1, sm: 4 } }}
          >
            Enregistrer
          </Button>
          <Button onClick={() => enregistrer(true)} disabled={envoi} sx={{ order: { xs: 2, sm: 3 } }}>
            Enregistrer et en ajouter un autre
          </Button>
          <Box sx={{ flex: 1, order: 2, display: { xs: 'none', sm: 'block' } }} />
          <Button onClick={fermer} disabled={envoi} sx={{ order: { xs: 3, sm: 1 } }}>Annuler</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
