import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, Switch, CircularProgress, IconButton, Tooltip, Paper, useMediaQuery, useTheme,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, EditOutlined as EditIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import { chargerMotifs, viderCacheCrm } from '../../components/crm/crmData';

const TYPES = [
  { value: 'door_to_door', label: 'Porte-à-porte' },
  { value: 'social', label: 'Facebook / réseaux' },
  { value: 'onsite', label: 'Dépistage sur place' },
  { value: 'flyers', label: 'Affiches / flyers' },
  { value: 'partner', label: 'Partenariat' },
  { value: 'other', label: 'Autre' },
];

const VIDE = { name: '', kind: 'other', reason_id: '', zone: '', start_date: '', end_date: '', budget: '', notes: '', is_active: true };
const fmt = (n) => `${Math.round(n || 0).toLocaleString('fr-FR')} F`;
const jour = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');

function Chiffre({ valeur, libelle, couleur }) {
  return (
    <Box textAlign="center" sx={{ minWidth: 64 }}>
      <Typography variant="h6" fontWeight={800} color={couleur || 'text.primary'} lineHeight={1.1}>{valeur}</Typography>
      <Typography variant="caption" color="text.secondary">{libelle}</Typography>
    </Box>
  );
}

/**
 * Les campagnes (porte-à-porte, publicité, dépistage…) : on les crée ici, on les choisit ensuite à la
 * création d'un patient ou d'une relance, et chaque carte dit ce qu'elle a rapporté.
 */
export default function CampagnesPanel({ estAdmin }) {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [donnees, setDonnees] = useState(null);
  const [motifs, setMotifs] = useState([]);
  const [edition, setEdition] = useState(null); // { id?, ...champs }
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    try {
      setDonnees(await crmAPI.listCampaigns());
    } catch (e) {
      enqueueSnackbar('Impossible de charger les campagnes', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  useEffect(() => { charger(); chargerMotifs().then(setMotifs).catch(() => {}); }, [charger]);

  const maj = (patch) => setEdition((e) => ({ ...e, ...patch }));

  const ouvrir = (c) => {
    setErreur('');
    setEdition(c ? {
      id: c.id, name: c.name, kind: c.kind, reason_id: c.reason?.id || '', zone: c.zone || '',
      start_date: c.start_date || '', end_date: c.end_date || '', budget: c.budget ?? '', notes: c.notes || '', is_active: c.is_active,
    } : { ...VIDE });
  };

  const enregistrer = async () => {
    if (!edition.name.trim()) { setErreur('Donnez un nom à la campagne.'); return; }
    setEnvoi(true);
    setErreur('');
    const corps = {
      name: edition.name.trim(), kind: edition.kind, reason_id: edition.reason_id || null, zone: edition.zone,
      start_date: edition.start_date || null, end_date: edition.end_date || null, notes: edition.notes, is_active: edition.is_active,
    };
    if (estAdmin) corps.budget = edition.budget === '' ? null : edition.budget;
    try {
      if (edition.id) await crmAPI.updateCampaign(edition.id, corps);
      else await crmAPI.createCampaign(corps);
      viderCacheCrm();
      setEdition(null);
      charger();
    } catch (e) {
      setErreur(e.response?.data?.error || "Impossible d'enregistrer la campagne");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async () => {
    if (!window.confirm('Supprimer cette campagne ? Si elle a déjà servi, elle sera seulement archivée.')) return;
    try {
      const rep = await crmAPI.deleteCampaign(edition.id);
      enqueueSnackbar(rep?.archived ? 'Campagne archivée (elle avait déjà servi)' : 'Campagne supprimée', { variant: 'info' });
      viderCacheCrm();
      setEdition(null);
      charger();
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Suppression impossible', { variant: 'error' });
    }
  };

  const liste = donnees?.results || [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} gap={1} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          Une campagne = une action dont on veut mesurer le résultat. Elle apparaît ensuite en pastille à la création
          d'un patient et quand on note une relance.
        </Typography>
        {donnees?.can_manage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => ouvrir(null)}>Nouvelle campagne</Button>
        )}
      </Box>

      {!donnees ? (
        <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
      ) : liste.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <CampaignIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
          <Typography fontWeight={600} mt={1}>Aucune campagne</Typography>
          <Typography variant="body2" color="text.secondary">
            Créez la première (par exemple « Dépistage hépatite B — octobre »).
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          {liste.map((c) => {
            const resolus = c.came + c.missed;
            const taux = resolus ? Math.round((100 * c.came) / resolus) : null;
            return (
              <Card key={c.id} variant="outlined" sx={{ opacity: c.is_active ? 1 : 0.6 }}>
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box>
                      <Typography fontWeight={700}>{c.name}</Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mt={0.5}>
                        <Chip size="small" label={c.kind_label} sx={{ height: 20, fontSize: '0.7rem' }} />
                        {c.reason && <Chip size="small" color="primary" variant="outlined" label={c.reason.label} sx={{ height: 20, fontSize: '0.7rem' }} />}
                        {c.zone && <Chip size="small" variant="outlined" label={c.zone} sx={{ height: 20, fontSize: '0.7rem' }} />}
                        {!c.is_active && <Chip size="small" label="Archivée" sx={{ height: 20, fontSize: '0.7rem' }} />}
                      </Stack>
                      {(c.start_date || c.end_date) && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          {c.start_date ? `du ${jour(c.start_date)}` : ''}{c.end_date ? ` au ${jour(c.end_date)}` : ''}
                        </Typography>
                      )}
                    </Box>
                    {donnees.can_manage && (
                      <Tooltip title="Modifier"><IconButton size="small" onClick={() => ouvrir(c)} aria-label="Modifier"><EditIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                  </Box>
                  <Box display="flex" justifyContent="space-between" mt={1.5} gap={1} flexWrap="wrap">
                    <Chiffre valeur={c.patients} libelle="patients" />
                    <Chiffre valeur={c.contacts} libelle="relances" />
                    <Chiffre valeur={c.agreed} libelle="d'accord" />
                    <Chiffre valeur={c.came} libelle="venus" couleur="success.main" />
                    <Chiffre valeur={taux === null ? '—' : `${taux} %`} libelle="ont tenu parole" />
                  </Box>
                  {(c.waiting > 0 || c.missed > 0) && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      {c.waiting > 0 ? `${c.waiting} attendu${c.waiting > 1 ? 's' : ''}` : ''}
                      {c.waiting > 0 && c.missed > 0 ? ' · ' : ''}
                      {c.missed > 0 ? `${c.missed} pas venu${c.missed > 1 ? 's' : ''}` : ''}
                    </Typography>
                  )}
                  {c.budget != null && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      Budget {fmt(c.budget)}{c.patients > 0 ? ` · ${fmt(c.budget / c.patients)} par patient` : ''}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog open={Boolean(edition)} onClose={envoi ? undefined : () => setEdition(null)} maxWidth="sm" fullWidth fullScreen={mobile}>
        <DialogTitle>{edition?.id ? 'Modifier la campagne' : 'Nouvelle campagne'}</DialogTitle>
        <DialogContent dividers>
          {edition && (
            <Stack spacing={2}>
              <TextField autoFocus size="small" fullWidth label="Nom" value={edition.name} inputProps={{ maxLength: 120 }}
                placeholder="ex. Dépistage hépatite B — octobre" onChange={(e) => maj({ name: e.target.value })} />
              <Box>
                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  {TYPES.map((t) => (
                    <Chip key={t.value} clickable label={t.label} onClick={() => maj({ kind: t.value })}
                      color={edition.kind === t.value ? 'primary' : 'default'} variant={edition.kind === t.value ? 'filled' : 'outlined'} />
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Motif : ce pour quoi on invite les gens <span style={{ opacity: 0.7 }}>(sert à voir s'ils sont vraiment venus)</span>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  {motifs.map((m) => (
                    <Chip key={m.id} clickable label={m.label}
                      onClick={() => maj({ reason_id: edition.reason_id === m.id ? '' : m.id })}
                      color={edition.reason_id === m.id ? 'primary' : 'default'} variant={edition.reason_id === m.id ? 'filled' : 'outlined'} />
                  ))}
                </Box>
              </Box>
              <TextField size="small" fullWidth label="Quartier / zone (facultatif)" value={edition.zone}
                onChange={(e) => maj({ zone: e.target.value })} />
              <Stack direction="row" spacing={1.5}>
                <TextField size="small" fullWidth type="date" label="Début" value={edition.start_date} InputLabelProps={{ shrink: true }}
                  onChange={(e) => maj({ start_date: e.target.value })} />
                <TextField size="small" fullWidth type="date" label="Fin" value={edition.end_date} InputLabelProps={{ shrink: true }}
                  onChange={(e) => maj({ end_date: e.target.value })} />
              </Stack>
              {estAdmin && (
                <TextField size="small" fullWidth type="number" label="Budget (facultatif)" value={edition.budget}
                  inputProps={{ min: 0 }} InputProps={{ endAdornment: <InputAdornment position="end">F</InputAdornment> }}
                  helperText="Sert à calculer le coût par patient. Visible des administrateurs seulement."
                  onChange={(e) => maj({ budget: e.target.value })} />
              )}
              <TextField size="small" fullWidth multiline minRows={2} label="Notes (facultatif)" value={edition.notes}
                onChange={(e) => maj({ notes: e.target.value })} />
              {edition.id && (
                <FormControlLabel control={<Switch checked={edition.is_active} onChange={(e) => maj({ is_active: e.target.checked })} />}
                  label="Active (proposée en pastille)" />
              )}
              {erreur && <Typography variant="body2" color="error">{erreur}</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {edition?.id && estAdmin && <Button color="error" onClick={supprimer} disabled={envoi} sx={{ mr: 'auto' }}>Supprimer</Button>}
          <Button onClick={() => setEdition(null)} disabled={envoi}>Annuler</Button>
          <Button variant="contained" onClick={enregistrer} disabled={envoi} startIcon={envoi ? <CircularProgress size={16} /> : null}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
