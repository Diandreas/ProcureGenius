import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Chip, Link, Stack } from '@mui/material';
import { ChatBubbleOutline as RelanceIcon } from '@mui/icons-material';
import crmAPI from '../../services/crmAPI';
import RelanceDialog, { LigneRelance } from './RelanceDialog';
import useCrmDisponible from './useCrmDisponible';
import useCurrentUser from '../../hooks/useCurrentUser';
import { ETATS, libelleIssue, ilYa } from './crmData';

/**
 * Sur la fiche patient : quand a-t-on relancé cette personne pour la dernière fois, et que
 * s'est-il passé ensuite ? Un bouton pour noter une nouvelle relance.
 */
export default function RelancesPatient({ patient }) {
  const disponible = useCrmDisponible();
  const { user } = useCurrentUser();
  const [liste, setListe] = useState(null);
  const [ouvert, setOuvert] = useState(false);
  const [historique, setHistorique] = useState(false);
  const estAdmin = ['admin', 'manager', 'owner'].includes(user?.role) || Boolean(user?.is_superuser);

  const charger = useCallback(() => {
    if (!patient?.id) return;
    crmAPI.listContacts({ patient: patient.id }).then(setListe).catch(() => setListe(null));
  }, [patient]);

  useEffect(() => { if (disponible) charger(); }, [disponible, charger]);

  useEffect(() => {
    const surRelance = (e) => { if (!e.detail || e.detail.patientId === patient?.id) charger(); };
    window.addEventListener('crm-relance-saved', surRelance);
    return () => window.removeEventListener('crm-relance-saved', surRelance);
  }, [patient, charger]);

  if (!disponible || !patient?.id) return null;
  const derniere = liste && liste[0];
  const etat = derniere ? ETATS[derniere.status] : null;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button size="small" variant="outlined" startIcon={<RelanceIcon />} onClick={() => setOuvert(true)}>
          Noter une relance
        </Button>
        {liste === null ? null : derniere ? (
          <Typography variant="body2" color="text.secondary" component="span">
            Dernière relance {ilYa(derniere.days)} · {derniere.channel_label}
            {derniere.reason ? ` · ${derniere.reason.label}` : ''} · {libelleIssue(derniere.outcome).toLowerCase()}
            {etat && etat.label ? (
              <Chip size="small" color={etat.color} variant={derniere.status === 'came' ? 'filled' : 'outlined'}
                label={etat.label} sx={{ ml: 0.75, height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
            ) : null}
            {liste.length > 1 && (
              <Link component="button" type="button" underline="always" sx={{ ml: 1 }} onClick={() => setHistorique(!historique)}>
                {historique ? 'masquer' : `historique (${liste.length})`}
              </Link>
            )}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">Jamais relancé</Typography>
        )}
      </Stack>
      {historique && liste && (
        <Box sx={{ mt: 0.5, pl: 0.5 }}>
          {liste.map((r) => (
            <LigneRelance key={r.id} relance={r}
              onChange={(maj) => setListe((l) => l.map((x) => (x.id === maj.id ? maj : x)))} />
          ))}
        </Box>
      )}
      <RelanceDialog open={ouvert} patient={patient} onClose={() => setOuvert(false)} estAdmin={estAdmin} onSaved={charger} />
    </Box>
  );
}
