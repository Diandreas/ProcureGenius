import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { NotificationsActive as AttenteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import useCrmDisponible from './useCrmDisponible';
import { libelleIssue, ilYa } from './crmData';

/**
 * « On l'avait relancé pour … » : à la facturation, rappelle les relances auxquelles ce patient
 * a peut-être répondu en venant, et permet de confirmer d'un tap « c'est pour ça ».
 *
 * - création de facture : `value` / `onChange` gardent l'id de la relance choisie ; le parent
 *   la relie à la facture une fois créée (crmAPI.linkContactToInvoice) ;
 * - facture existante : `invoiceId` — le lien est enregistré tout de suite.
 *
 * Rien ne s'affiche s'il n'y a aucune relance en attente. Les relances dont la facture a déjà
 * été reconnue automatiquement (mot-clé du motif) n'apparaissent pas : il n'y a rien à faire.
 */
export default function RelancesEnAttente({ patientId, value, onChange, invoiceId }) {
  const disponible = useCrmDisponible();
  const { enqueueSnackbar } = useSnackbar();
  const [liste, setListe] = useState([]);

  const charger = useCallback(() => {
    if (!patientId) { setListe([]); return; }
    crmAPI.listContacts({ patient: patientId, pending: 1 })
      .then((l) => setListe(l.filter((r) => ['agreed', 'sent', 'callback'].includes(r.outcome))))
      .catch(() => setListe([]));
  }, [patientId]);

  useEffect(() => { if (disponible) charger(); }, [disponible, charger]);

  if (!disponible || !liste.length) return null;

  const choisir = async (r) => {
    if (invoiceId) {
      try {
        await crmAPI.updateContact(r.id, { came_invoice_id: invoiceId });
        enqueueSnackbar('Noté : il est venu suite à la relance', { variant: 'success' });
        charger();
      } catch (e) {
        enqueueSnackbar("Impossible d'enregistrer le lien", { variant: 'error' });
      }
      return;
    }
    if (onChange) onChange(value === r.id ? '' : r.id);
  };

  return (
    <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'action.hover', borderLeft: '3px solid', borderColor: 'info.main' }}>
      <Typography variant="caption" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
        <AttenteIcon sx={{ fontSize: 15 }} /> On l'avait relancé : est-il venu pour ça ?
      </Typography>
      <Stack spacing={0.75} mt={0.75}>
        {liste.map((r) => {
          const actif = value === r.id;
          return (
            <Box key={r.id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="body2" sx={{ flex: 1, minWidth: 180 }}>
                {r.reason ? r.reason.label : 'Relance'}{r.campaign ? ` (${r.campaign.name})` : ''} · {ilYa(r.days)} · {libelleIssue(r.outcome).toLowerCase()}
              </Typography>
              <Chip
                clickable size="small" label={actif ? 'Oui, c\'est pour ça ✓' : "C'est pour ça"} onClick={() => choisir(r)}
                color={actif ? 'success' : 'default'} variant={actif ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, height: 30 }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
