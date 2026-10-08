import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Chip,
  Stack, CircularProgress, FormControlLabel, Checkbox, Divider, IconButton, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import { DeleteOutline as DeleteIcon, ChatBubbleOutline as RelanceIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import {
  chargerMotifs, chargerCampagnesActives, CANAUX, ISSUES, ETATS, libelleIssue, jourCourt, ilYa, dansJours, RACCOURCIS_DATE,
} from './crmData';

const titre = (nom) => (nom || '')
  .toLowerCase().replace(/(^|\s|-)(\S)/g, (_, a, b) => a + b.toUpperCase());

const pastille = (actif, taille = 36) => ({
  height: taille, fontWeight: actif ? 700 : 400, fontSize: '0.86rem',
});

/** Une relance passée : date, canal, motif, réponse, et ce qu'il est devenu (venu ? attendu ?). */
export function LigneRelance({ relance, peutSupprimer, onChange, onSupprimer }) {
  const [edition, setEdition] = useState(false);
  const etat = ETATS[relance.status] || ETATS.none;
  const modifierIssue = async (valeur) => {
    try {
      onChange(await crmAPI.updateContact(relance.id, { outcome: valeur }));
      setEdition(false);
    } catch (e) { /* l'écran parent affiche l'erreur éventuelle */ }
  };
  return (
    <Box sx={{ py: 0.75 }}>
      <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
          {jourCourt(relance.contacted_at)} · {ilYa(relance.days)}
        </Typography>
        <Chip size="small" variant="outlined" label={relance.channel_label} sx={{ height: 20, fontSize: '0.7rem' }} />
        {relance.reason && <Chip size="small" label={relance.reason.label} sx={{ height: 20, fontSize: '0.7rem' }} />}
        {relance.campaign && (
          <Chip size="small" color="secondary" variant="outlined" label={relance.campaign.name} sx={{ height: 20, fontSize: '0.7rem' }} />
        )}
        <Chip
          size="small" clickable label={libelleIssue(relance.outcome)} onClick={() => setEdition(!edition)}
          sx={{ height: 20, fontSize: '0.7rem' }}
        />
        {relance.follow_up_date && ['callback', 'agreed'].includes(relance.outcome) && (
          <Chip size="small" variant="outlined" label={`${relance.outcome === 'callback' ? 'à rappeler' : 'prévu'} le ${jourCourt(relance.follow_up_date)}`}
            sx={{ height: 20, fontSize: '0.7rem' }} />
        )}
        {etat.label && (
          <Chip
            size="small" color={etat.color} variant={relance.status === 'came' ? 'filled' : 'outlined'}
            label={relance.status === 'came' && relance.invoice
              ? `Venu le ${jourCourt(relance.invoice.date)}` : etat.label}
            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
          />
        )}
        {peutSupprimer && (
          <Tooltip title="Supprimer cette relance">
            <IconButton size="small" onClick={() => onSupprimer(relance)} aria-label="Supprimer"><DeleteIcon fontSize="inherit" /></IconButton>
          </Tooltip>
        )}
      </Box>
      {relance.note && <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 0.5 }}>« {relance.note} »</Typography>}
      {edition && (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} mt={0.75}>
          {ISSUES.map((i) => (
            <Chip
              key={i.value} clickable size="small" label={i.label}
              color={relance.outcome === i.value ? 'primary' : 'default'}
              variant={relance.outcome === i.value ? 'filled' : 'outlined'}
              onClick={() => modifierIssue(i.value)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/**
 * « J'ai relancé ce patient » : comment, pour quoi, ce qu'il a répondu — quatre touches.
 * Montre aussi les relances précédentes et ce qu'elles sont devenues.
 */
export default function RelanceDialog({
  open, patient, onClose, onSaved, defaultReasonId = '', defaultChannel = 'whatsapp', defaultOutcome = 'sent', estAdmin = false,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [motifs, setMotifs] = useState([]);
  const [campagnes, setCampagnes] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [canal, setCanal] = useState(defaultChannel);
  const [motif, setMotif] = useState(defaultReasonId);
  const [campagne, setCampagne] = useState('');
  const [issue, setIssue] = useState(defaultOutcome);
  const [note, setNote] = useState('');
  const [prevue, setPrevue] = useState('');
  const [nePlusRelancer, setNePlusRelancer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const chargerHistorique = useCallback(() => {
    if (!patient?.id) return;
    crmAPI.listContacts({ patient: patient.id }).then(setHistorique).catch(() => setHistorique([]));
  }, [patient]);

  useEffect(() => {
    if (!open) return;
    setCanal(defaultChannel); setMotif(defaultReasonId); setCampagne(''); setIssue(defaultOutcome);
    setNote(''); setPrevue(''); setNePlusRelancer(false); setErreur('');
    chargerMotifs().then(setMotifs).catch(() => setMotifs([]));
    chargerCampagnesActives().then(setCampagnes).catch(() => setCampagnes([]));
    chargerHistorique();
  }, [open, defaultChannel, defaultReasonId, defaultOutcome, chargerHistorique]);

  // Choisir une campagne propose son motif si aucun n'est encore choisi.
  const choisirCampagne = (c) => {
    const nouvelle = campagne === c.id ? '' : c.id;
    setCampagne(nouvelle);
    if (nouvelle && !motif && c.reason) setMotif(c.reason.id);
  };

  const enregistrer = async () => {
    setEnvoi(true);
    setErreur('');
    try {
      const cree = await crmAPI.createContact({
        patient_id: patient.id, channel: canal, reason_id: motif || null, campaign_id: campagne || null,
        outcome: issue, note: note.trim(), do_not_contact: issue === 'declined' && nePlusRelancer,
        follow_up_date: (issue === 'callback' || issue === 'agreed') && prevue ? prevue : null,
      });
      enqueueSnackbar('Relance notée', { variant: 'success' });
      window.dispatchEvent(new CustomEvent('crm-relance-saved', { detail: { patientId: patient.id } }));
      if (onSaved) onSaved(cree);
      onClose();
    } catch (e) {
      setErreur(e.response?.data?.error || "Impossible d'enregistrer la relance");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async (r) => {
    try {
      await crmAPI.deleteContact(r.id);
      chargerHistorique();
      window.dispatchEvent(new CustomEvent('crm-relance-saved', { detail: { patientId: patient.id } }));
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Suppression impossible', { variant: 'warning' });
    }
  };

  return (
    <Dialog open={open} onClose={envoi ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={mobile}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <RelanceIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>Noter une relance</Typography>
            <Typography variant="body2" color="text.secondary">{titre(patient?.name)}</Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="caption" color="text.secondary">Comment ?</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {CANAUX.map((c) => (
                <Chip key={c.value} clickable label={c.label} onClick={() => setCanal(c.value)}
                  color={canal === c.value ? 'primary' : 'default'} variant={canal === c.value ? 'filled' : 'outlined'}
                  sx={pastille(canal === c.value)} />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">Pour quoi ? <span style={{ opacity: 0.7 }}>(facultatif)</span></Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {motifs.map((m) => (
                <Chip key={m.id} clickable label={m.label} onClick={() => setMotif(motif === m.id ? '' : m.id)}
                  color={motif === m.id ? 'primary' : 'default'} variant={motif === m.id ? 'filled' : 'outlined'}
                  sx={pastille(motif === m.id)} />
              ))}
            </Box>
          </Box>

          {campagnes.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">Dans le cadre d'une campagne ? <span style={{ opacity: 0.7 }}>(facultatif)</span></Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                {campagnes.map((c) => (
                  <Chip key={c.id} clickable label={c.name} onClick={() => choisirCampagne(c)}
                    color={campagne === c.id ? 'secondary' : 'default'} variant={campagne === c.id ? 'filled' : 'outlined'}
                    sx={pastille(campagne === c.id)} />
                ))}
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary">Sa réponse</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {ISSUES.map((i) => (
                <Chip key={i.value} clickable label={i.label} onClick={() => setIssue(i.value)}
                  color={issue === i.value ? i.color === 'default' ? 'primary' : i.color : 'default'}
                  variant={issue === i.value ? 'filled' : 'outlined'} sx={pastille(issue === i.value)} />
              ))}
            </Box>
            {(issue === 'callback' || issue === 'agreed') && (
              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {issue === 'callback' ? 'À rappeler le…' : 'Il compte venir le…'} <span style={{ opacity: 0.7 }}>(facultatif)</span>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5, alignItems: 'center' }}>
                  {RACCOURCIS_DATE.map((r) => {
                    const valeur = dansJours(r.jours);
                    const actif = prevue === valeur;
                    return (
                      <Chip key={r.label} clickable size="small" label={r.label} onClick={() => setPrevue(actif ? '' : valeur)}
                        color={actif ? 'primary' : 'default'} variant={actif ? 'filled' : 'outlined'} />
                    );
                  })}
                  <TextField size="small" type="date" value={prevue} onChange={(e) => setPrevue(e.target.value)}
                    inputProps={{ min: dansJours(0) }} sx={{ width: 150 }} />
                </Box>
              </Box>
            )}
            {issue === 'agreed' && (
              <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                On verra automatiquement s'il est vraiment venu : sa prochaine facture{motifs.find((m) => m.id === motif) ? ` « ${motifs.find((m) => m.id === motif).label.toLowerCase()} »` : ''} le dira.
              </Typography>
            )}
            {issue === 'declined' && (
              <FormControlLabel sx={{ mt: 0.5 }}
                control={<Checkbox size="small" checked={nePlusRelancer} onChange={(e) => setNePlusRelancer(e.target.checked)} />}
                label="Ne plus le relancer" />
            )}
          </Box>

          <TextField size="small" fullWidth label="Remarque (facultatif)" value={note} inputProps={{ maxLength: 300 }}
            onChange={(e) => setNote(e.target.value)} placeholder="Ce qu'il a dit, quand il compte venir…" />

          {erreur && <Typography variant="body2" color="error">{erreur}</Typography>}

          {historique.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" gutterBottom>Relances précédentes</Typography>
                {historique.slice(0, 8).map((r) => (
                  <LigneRelance
                    key={r.id} relance={r}
                    peutSupprimer={estAdmin}
                    onSupprimer={supprimer}
                    onChange={(maj) => setHistorique((h) => h.map((x) => (x.id === maj.id ? maj : x)))}
                  />
                ))}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Button variant="contained" size={mobile ? 'large' : 'medium'} onClick={enregistrer} disabled={envoi}
          startIcon={envoi ? <CircularProgress size={16} /> : null} sx={{ order: { xs: 1, sm: 2 } }}>
          Enregistrer
        </Button>
        <Button onClick={onClose} disabled={envoi} sx={{ order: { xs: 2, sm: 1 } }}>Annuler</Button>
      </DialogActions>
    </Dialog>
  );
}
