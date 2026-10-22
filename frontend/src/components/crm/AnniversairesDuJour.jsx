import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertTitle, Box, Button, Chip, Typography, IconButton, Tooltip, Collapse } from '@mui/material';
import { Cake as CakeIcon, WhatsApp as WhatsAppIcon, Close as CloseIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import useCurrentUser from '../../hooks/useCurrentUser';
import useCrmDisponible from './useCrmDisponible';
import { chargerMotifs } from './crmData';

const titre = (nom) => (nom || '').toLowerCase().replace(/(^|\s|-)(\S)/g, (_, a, b) => a + b.toUpperCase());
const cleMasque = () => `crm-anniv-masque-${new Date().toISOString().slice(0, 10)}`;
const lire = (cle) => { try { return window.localStorage.getItem(cle); } catch (e) { return null; } };
const ecrire = (cle, v) => { try { window.localStorage.setItem(cle, v); } catch (e) { /* sans gravité */ } };

/**
 * Rappel en haut de la liste des factures : les patients dont c'est l'anniversaire
 * aujourd'hui (et ceux d'hier pas encore souhaités), avec un bouton WhatsApp qui
 * note les vœux dans le Suivi patients — on voit tout de suite qui les a déjà envoyés.
 */
export default function AnniversairesDuJour() {
  const disponible = useCrmDisponible();
  const { user } = useCurrentUser();
  const { enqueueSnackbar } = useSnackbar();
  const [patients, setPatients] = useState([]);
  const [masque, setMasque] = useState(() => Boolean(lire(cleMasque())));
  const [ouvert, setOuvert] = useState(true);
  const nomCentre = user?.organization?.name || user?.organization_name || 'le centre';

  const charger = useCallback(async () => {
    try {
      const [cette, passee] = await Promise.all([
        crmAPI.listPatients({ segment: 'birthday_week', page_size: 100 }),
        crmAPI.listPatients({ segment: 'birthday_last_week', page_size: 100 }),
      ]);
      const aujourdhui = (cette.results || []).filter((p) => p.birthday_in === 0);
      const hier = (passee.results || []).filter((p) => p.birthday_since === 1 && !p.birthday_wished);
      setPatients([...aujourdhui.map((p) => ({ ...p, quand: 'today' })), ...hier.map((p) => ({ ...p, quand: 'yesterday' }))]);
    } catch (e) {
      setPatients([]);
    }
  }, []);

  useEffect(() => { if (disponible) charger(); }, [disponible, charger]);

  if (!disponible || masque || patients.length === 0) return null;

  const aSouhaiter = patients.filter((p) => !p.birthday_wished).length;

  const souhaiter = async (p) => {
    const texte = (p.quand === 'yesterday'
      ? "Bonjour {nom}, avec un petit retard, toute l'équipe de {centre} vous souhaite un joyeux anniversaire !"
      : "Bonjour {nom}, toute l'équipe de {centre} vous souhaite un joyeux anniversaire !")
      .split('{nom}').join(titre(p.name)).split('{centre}').join(nomCentre);
    if (p.whatsapp_url) window.open(`${p.whatsapp_url}?text=${encodeURIComponent(texte)}`, '_blank');
    try {
      const motifs = await chargerMotifs();
      const motif = (motifs || []).find((m) => /anniv/i.test(m.label));
      await crmAPI.createContact({
        patient_id: p.id, channel: 'whatsapp', reason_id: motif ? motif.id : null, outcome: 'sent', message: texte,
      });
      enqueueSnackbar(`Vœux notés pour ${titre(p.name)}`, { variant: 'success' });
      charger();
    } catch (e) {
      enqueueSnackbar("Le message est parti, mais les vœux n'ont pas pu être notés", { variant: 'warning' });
    }
  };

  return (
    <Alert
      icon={<CakeIcon />}
      severity={aSouhaiter ? 'warning' : 'success'}
      sx={{ mb: 2, alignItems: 'flex-start', '& .MuiAlert-message': { width: '100%' } }}
      action={(
        <Box sx={{ display: 'flex' }}>
          <IconButton size="small" onClick={() => setOuvert(!ouvert)} aria-label={ouvert ? 'Replier' : 'Déplier'}>
            {ouvert ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
          <Tooltip title="Masquer jusqu'à demain">
            <IconButton size="small" onClick={() => { ecrire(cleMasque(), '1'); setMasque(true); }} aria-label="Masquer">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    >
      <AlertTitle sx={{ fontWeight: 700, mb: 0 }}>
        {aSouhaiter
          ? `${aSouhaiter} anniversaire${aSouhaiter > 1 ? 's' : ''} à souhaiter`
          : 'Tous les anniversaires du jour ont été souhaités'}
      </AlertTitle>
      <Collapse in={ouvert}>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {patients.map((p) => (
            <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: { sm: 200 } }}>
                {titre(p.name)}{p.age != null ? ` · ${p.age} ans` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {p.quand === 'yesterday' ? 'anniversaire hier' : "aujourd'hui"}{p.phone ? ` · ${p.phone}` : ''}
              </Typography>
              {p.birthday_wished ? (
                <Chip size="small" color="success" label={`Vœux envoyés${p.birthday_wished.by ? ` par ${p.birthday_wished.by}` : ''}`} sx={{ height: 22 }} />
              ) : p.whatsapp_url ? (
                <Button size="small" variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={() => souhaiter(p)}
                  sx={{ py: 0.25, textTransform: 'none' }}>
                  Souhaiter
                </Button>
              ) : (
                <Chip size="small" variant="outlined" label="Pas de numéro WhatsApp" sx={{ height: 22 }} />
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Alert>
  );
}
