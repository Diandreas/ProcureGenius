import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab, Box, Typography, TextField, Switch,
  IconButton, Tooltip, Stack, CircularProgress, FormControlLabel, useMediaQuery, useTheme,
} from '@mui/material';
import { DeleteOutline as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import { viderCacheCrm } from '../../components/crm/crmData';
import { viderCacheOrigines } from '../../components/crm/ProvenanceChips';

/** Un motif ou une provenance : nom, (mots-clés), actif — chaque modification s'enregistre en quittant le champ. */
function Ligne({ element, avecMotsCles, onChange, onDelete }) {
  const [label, setLabel] = useState(element.label);
  const [mots, setMots] = useState(element.keywords || '');
  const [message, setMessage] = useState(element.message_template || '');
  useEffect(() => {
    setLabel(element.label); setMots(element.keywords || ''); setMessage(element.message_template || '');
  }, [element.label, element.keywords, element.message_template]);

  return (
    <Box sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', opacity: element.is_active ? 1 : 0.55 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small" fullWidth value={label} onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label.trim() && label !== element.label && onChange({ label: label.trim() })}
          inputProps={{ maxLength: 80 }}
        />
        <Tooltip title={element.is_active ? 'Proposé dans les pastilles' : 'Masqué'}>
          <Switch size="small" checked={element.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />
        </Tooltip>
        <Tooltip title={element.usage ? 'Déjà utilisé : il sera masqué, pas supprimé' : 'Supprimer'}>
          <IconButton size="small" onClick={() => onDelete(element)} aria-label="Supprimer"><DeleteIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Stack>
      {avecMotsCles && (
        <TextField
          size="small" fullWidth sx={{ mt: 0.75 }} value={mots} onChange={(e) => setMots(e.target.value)}
          onBlur={() => mots !== (element.keywords || '') && onChange({ keywords: mots })}
          label="Mots qui reconnaissent un achat (séparés par une virgule)" placeholder="ex. hépatite b, aghbs"
          helperText={mots.trim() ? 'Quand il vient, une ligne de sa facture contenant un de ces mots montre qu\'il est venu pour ça.' : 'Sans mot : toute nouvelle facture après la relance compte comme « revenu ».'}
          inputProps={{ maxLength: 300 }}
        />
      )}
      {avecMotsCles && (
        <TextField
          size="small" fullWidth multiline minRows={2} sx={{ mt: 0.75 }} value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => message !== (element.message_template || '') && onChange({ message_template: message })}
          label="Message WhatsApp proposé pour ce motif"
          placeholder={element.template || 'Bonjour {nom}, ici {centre}. …'}
          helperText="{nom} et {centre} sont remplacés à l'envoi. Laissez vide pour garder le modèle par défaut."
          inputProps={{ maxLength: 1000 }}
        />
      )}
      {element.usage > 0 && (
        <Typography variant="caption" color="text.secondary">Utilisé {element.usage} fois</Typography>
      )}
    </Box>
  );
}

/**
 * Réglages du Suivi patients (administrateurs) : les motifs de relance — ce pour quoi on rappelle un
 * patient — et la liste des provenances proposées à la création d'un patient et sur la facture.
 */
export default function ReglagesDialog({ open, onClose }) {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [onglet, setOnglet] = useState('motifs');
  const [motifs, setMotifs] = useState(null);
  const [origines, setOrigines] = useState(null);
  const [nouveau, setNouveau] = useState('');
  const [mots, setMots] = useState('');

  const charger = useCallback(async () => {
    try {
      const [m, o] = await Promise.all([crmAPI.listReasonSettings(), crmAPI.listOriginSettings()]);
      setMotifs(m); setOrigines(o);
    } catch (e) {
      enqueueSnackbar('Impossible de charger les réglages', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  useEffect(() => { if (open) { setNouveau(''); setMots(''); charger(); } }, [open, charger]);

  const apres = () => { viderCacheCrm(); viderCacheOrigines(); charger(); };

  const erreur = (e, defaut) => enqueueSnackbar(e.response?.data?.error || defaut, { variant: 'error' });

  const ajouter = async () => {
    if (!nouveau.trim()) return;
    try {
      if (onglet === 'motifs') await crmAPI.createReason({ label: nouveau.trim(), keywords: mots });
      else await crmAPI.createOrigin({ label: nouveau.trim() });
      setNouveau(''); setMots('');
      apres();
    } catch (e) { erreur(e, "Impossible d'ajouter"); }
  };

  const modifier = (element, patch) => {
    const appel = onglet === 'motifs' ? crmAPI.updateReason : crmAPI.updateOrigin;
    appel(element.id, patch).then(apres).catch((e) => erreur(e, "Impossible d'enregistrer"));
  };

  const supprimer = (element) => {
    const appel = onglet === 'motifs' ? crmAPI.deleteReason : crmAPI.deleteOrigin;
    appel(element.id).then((rep) => {
      if (rep?.archived) enqueueSnackbar('Déjà utilisé : masqué plutôt que supprimé', { variant: 'info' });
      apres();
    }).catch((e) => erreur(e, 'Suppression impossible'));
  };

  const liste = onglet === 'motifs' ? motifs : origines;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={mobile}>
      <DialogTitle>Réglages du suivi patients</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Tabs value={onglet} onChange={(_, v) => setOnglet(v)} variant="fullWidth">
          <Tab value="motifs" label="Motifs de relance" />
          <Tab value="origines" label="Provenances" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            {onglet === 'motifs'
              ? "Ce pour quoi on relance un patient. Les mots-clés servent à vérifier automatiquement, à sa prochaine facture, qu'il est bien venu pour ça."
              : "Les réponses proposées à « Comment a-t-il connu le centre ? ». Les plus utilisées s'affichent en premier."}
          </Typography>

          {!liste ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress size={26} /></Box>
          ) : (
            liste.map((el) => (
              <Ligne key={el.id} element={el} avecMotsCles={onglet === 'motifs'}
                onChange={(patch) => modifier(el, patch)} onDelete={supprimer} />
            ))
          )}

          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              {onglet === 'motifs' ? 'Ajouter un motif' : 'Ajouter une provenance'}
            </Typography>
            <Stack spacing={1}>
              <TextField size="small" fullWidth value={nouveau} onChange={(e) => setNouveau(e.target.value)}
                placeholder={onglet === 'motifs' ? 'ex. Dépistage diabète' : 'ex. Église, marché, ancien patient'}
                inputProps={{ maxLength: 80 }} onKeyDown={(e) => { if (e.key === 'Enter') ajouter(); }} />
              {onglet === 'motifs' && (
                <TextField size="small" fullWidth value={mots} onChange={(e) => setMots(e.target.value)}
                  label="Mots-clés de facture (facultatif)" placeholder="ex. glycémie, diabète" />
              )}
              <Box><Button variant="outlined" startIcon={<AddIcon />} onClick={ajouter} disabled={!nouveau.trim()}>Ajouter</Button></Box>
            </Stack>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="contained" onClick={onClose}>Terminé</Button>
      </DialogActions>
    </Dialog>
  );
}
