import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Chip, Link, Stack } from '@mui/material';
import Etiquettes from './Etiquettes';
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
  const [resume, setResume] = useState(null);
  const estAdmin = ['admin', 'manager', 'owner'].includes(user?.role) || Boolean(user?.is_superuser);

  const charger = useCallback(() => {
    if (!patient?.id) return;
    crmAPI.listContacts({ patient: patient.id }).then(setListe).catch(() => setListe(null));
  }, [patient]);

  const chargerResume = useCallback(() => {
    if (!patient?.id) return;
    crmAPI.getPatientSummary(patient.id).then(setResume).catch(() => setResume(null));
  }, [patient]);

  useEffect(() => { if (disponible) { charger(); chargerResume(); } }, [disponible, charger, chargerResume]);

  useEffect(() => {
    const surRelance = (e) => { if (!e.detail || e.detail.patientId === patient?.id) { charger(); chargerResume(); } };
    window.addEventListener('crm-relance-saved', surRelance);
    return () => window.removeEventListener('crm-relance-saved', surRelance);
  }, [patient, charger, chargerResume]);

  if (!disponible || !patient?.id) return null;
  const derniere = liste && liste[0];
  const etat = derniere ? ETATS[derniere.status] : null;

  const fmt = (n) => `${Math.round(n || 0).toLocaleString('fr-FR')} F`;

  return (
    <Box>
      {resume && (
        <Box sx={{ mb: 0.75 }}>
          <Etiquettes tags={resume.tags} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {resume.visits} visite{resume.visits > 1 ? 's' : ''}
            {resume.last_visit_days !== null ? ` · dernière ${ilYa(resume.last_visit_days)}` : ''}
            {resume.paid_total !== null ? ` · ${fmt(resume.paid_total)} payés` : ''}
            {resume.average_basket ? ` · panier moyen ${fmt(resume.average_basket)}` : ''}
          </Typography>
          {resume.quality && resume.quality.missing.length > 0 && (
            <Typography variant="caption" display="block" sx={{ color: 'warning.main', fontWeight: 600 }}>
              Fiche à compléter ({resume.quality.score}/{resume.quality.max}) : {resume.quality.missing
                .map((m) => (m.state === 'invalid' ? `${m.label.toLowerCase()} invalide` : m.label.toLowerCase())).join(', ')}
            </Typography>
          )}
          {resume.usual.length > 0 && (
            <Typography variant="caption" color="text.secondary" display="block">
              Prend souvent : {resume.usual.map((u) => u.label).join(' · ')}
            </Typography>
          )}
        </Box>
      )}
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
