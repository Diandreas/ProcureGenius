import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Chip, Card, CardContent, IconButton, Tooltip, Paper, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Pagination, Stack,
} from '@mui/material';
import { DeleteOutline as DeleteIcon, HowToReg as PassageIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';

const PERIODES = [
  { jours: 1, label: '24 h' },
  { jours: 7, label: '7 jours' },
  { jours: 30, label: '30 jours' },
];

const TAILLE_PAGE = 30;

const titre = (nom) => (nom || '')
  .toLowerCase().replace(/(^|\s|-)(\S)/g, (_, a, b) => a + b.toUpperCase());

const heure = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// « il y a 25 min », « il y a 3 h », « Hier 14:30 », « 12/10 14:30 »
const quand = (iso) => {
  const d = new Date(iso);
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 6) return `il y a ${Math.floor(minutes / 60)} h`;
  const aujourdhui = new Date();
  const hier = new Date(); hier.setDate(aujourdhui.getDate() - 1);
  if (d.toDateString() === aujourdhui.toDateString()) return `Aujourd'hui ${heure(d)}`;
  if (d.toDateString() === hier.toDateString()) return `Hier ${heure(d)}`;
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${heure(d)}`;
};

/**
 * Onglet « Passages » : qui est passé au centre, pour quoi, sans passer par la
 * facturation. Se rafraîchit seul quand un passage est enregistré depuis le bouton
 * flottant (événement « crm-passage-created »).
 */
export default function PassagesPanel({ peutOuvrirDossier, onOuvrirPatient, estAdmin, monNom }) {
  const { enqueueSnackbar } = useSnackbar();
  const [jours, setJours] = useState(7);
  const [motif, setMotif] = useState('');
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);
  const [suppression, setSuppression] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const params = { days: jours, page, page_size: TAILLE_PAGE };
      if (motif) params.reason = motif;
      setDonnees(await crmAPI.listPassages(params));
    } catch (e) {
      enqueueSnackbar('Impossible de charger les passages', { variant: 'error' });
    } finally {
      setChargement(false);
    }
  }, [jours, motif, page, enqueueSnackbar]);

  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    const recharger = () => { setPage(1); charger(); };
    window.addEventListener('crm-passage-created', recharger);
    return () => window.removeEventListener('crm-passage-created', recharger);
  }, [charger]);

  const peutSupprimer = (p) => {
    if (estAdmin) return true;
    const recent = Date.now() - new Date(p.occurred_at).getTime() < 24 * 3600 * 1000;
    return recent && p.created_by === monNom;
  };

  const confirmerSuppression = async () => {
    setSuppression(true);
    try {
      await crmAPI.deletePassage(aSupprimer.id);
      enqueueSnackbar('Passage supprimé', { variant: 'success' });
      setASupprimer(null);
      charger();
    } catch (e) {
      enqueueSnackbar(e.response?.data?.error || 'Impossible de supprimer ce passage', { variant: 'error' });
    } finally {
      setSuppression(false);
    }
  };

  const resume = donnees?.summary;
  const total = (resume?.by_reason || []).reduce((n, r) => n + r.count, 0);
  const nbPages = donnees ? Math.max(Math.ceil(donnees.count / TAILLE_PAGE), 1) : 1;

  return (
    <Box>
      {/* Le chiffre qu'on regarde en premier */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PassageIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700} lineHeight={1}>{resume?.today ?? '–'}</Typography>
          <Typography variant="caption" color="text.secondary">
            passage{(resume?.today ?? 0) > 1 ? 's' : ''} aujourd&apos;hui
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 220, textAlign: 'right' }}>
          Pour en ajouter : le bouton rond en bas à droite.
        </Typography>
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        {PERIODES.map((pe) => (
          <Chip
            key={pe.jours} clickable size="small" label={pe.label}
            color={jours === pe.jours ? 'primary' : 'default'}
            variant={jours === pe.jours ? 'filled' : 'outlined'}
            onClick={() => { setJours(pe.jours); setPage(1); }}
          />
        ))}
      </Stack>

      {/* Filtre par motif, avec le nombre de passages de chaque sorte */}
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1.5 }}>
        <Chip
          clickable label={`Tous · ${total}`} sx={{ flexShrink: 0 }}
          color={motif === '' ? 'primary' : 'default'} variant={motif === '' ? 'filled' : 'outlined'}
          onClick={() => { setMotif(''); setPage(1); }}
        />
        {(resume?.by_reason || []).filter((r) => r.count > 0 || motif === r.value).map((r) => (
          <Chip
            key={r.value} clickable label={`${r.label} · ${r.count}`} sx={{ flexShrink: 0 }}
            color={motif === r.value ? 'primary' : 'default'} variant={motif === r.value ? 'filled' : 'outlined'}
            onClick={() => { setMotif(r.value); setPage(1); }}
          />
        ))}
      </Box>

      {chargement && !donnees ? (
        <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
      ) : donnees && donnees.results.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <PassageIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
          <Typography fontWeight={600} mt={1}>Aucun passage sur cette période</Typography>
          <Typography variant="body2" color="text.secondary">
            Quand quelqu&apos;un passe au centre sans consultation, notez-le avec le bouton rond en bas à droite.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ opacity: chargement ? 0.6 : 1, transition: 'opacity .15s' }}>
          {(donnees?.results || []).map((p) => (
            <Card key={p.id} variant="outlined" sx={{ mb: 1 }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography
                        variant="body2" fontWeight={700}
                        sx={{ cursor: p.registered && peutOuvrirDossier ? 'pointer' : 'default' }}
                        onClick={p.registered && peutOuvrirDossier ? () => onOuvrirPatient(p.patient_id) : undefined}
                      >
                        {titre(p.name)}
                      </Typography>
                      {!p.registered && (
                        <Chip size="small" variant="outlined" label="Sans fiche" sx={{ height: 20, fontSize: '0.68rem' }} />
                      )}
                      <Chip size="small" color="primary" variant="outlined" label={p.reason_label}
                        sx={{ height: 22, fontSize: '0.72rem' }} />
                    </Box>
                    {p.text && (
                      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{p.text}</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {quand(p.occurred_at)}
                      {p.created_by ? ` · par ${p.created_by}` : ''}
                      {!p.registered && p.phone ? ` · ${p.phone}` : ''}
                    </Typography>
                  </Box>
                  {peutSupprimer(p) && (
                    <Tooltip title="Supprimer ce passage">
                      <IconButton size="small" onClick={() => setASupprimer(p)} aria-label="Supprimer">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
          {nbPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination count={nbPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </Box>
      )}

      <Dialog open={Boolean(aSupprimer)} onClose={() => !suppression && setASupprimer(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer ce passage ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le passage de <strong>{titre(aSupprimer?.name)}</strong> ({aSupprimer?.reason_label?.toLowerCase()}) sera effacé.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setASupprimer(null)} disabled={suppression}>Annuler</Button>
          <Button variant="contained" color="error" onClick={confirmerSuppression} disabled={suppression}
            startIcon={suppression ? <CircularProgress size={16} /> : <DeleteIcon />}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
