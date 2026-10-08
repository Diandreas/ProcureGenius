import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, Link, TextField, Button } from '@mui/material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import { chargerQuartiers, viderCacheQuartiers } from './crmData';

/**
 * Quartier en pastilles (Makepè, Bepanda…) — l'adresse libre de la fiche reste inchangée.
 *
 * - création de patient : `value` / `onChange`, enregistré après la création ;
 * - fiche patient : `patientId`, un tap enregistre. Si rien n'a été choisi mais que l'adresse
 *   permet de reconnaître le quartier, on l'affiche (« reconnu dans l'adresse »).
 */
export default function QuartierChips({ patientId, value, onChange, dense = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [quartiers, setQuartiers] = useState([]);
  const [profil, setProfil] = useState(null);
  const [disponible, setDisponible] = useState(false);
  const [modifier, setModifier] = useState(false);
  const [autre, setAutre] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let vivant = true;
    chargerQuartiers().then((l) => { if (vivant) { setQuartiers(l); setDisponible(true); } }).catch(() => {});
    return () => { vivant = false; };
  }, []);

  useEffect(() => {
    let vivant = true;
    setModifier(false);
    if (!patientId) return undefined;
    crmAPI.getProfile(patientId).then((p) => { if (vivant) setProfil(p); }).catch(() => {});
    return () => { vivant = false; };
  }, [patientId]);

  if (!disponible || (patientId && !profil)) return null;

  const courant = patientId ? (profil.quartier || '') : (value || '');

  const choisir = async (nom) => {
    const valeur = nom === courant ? '' : nom;
    setAutre(false);
    setSaisie('');
    if (!patientId) { onChange?.(valeur); return; }
    setEnvoi(true);
    try {
      setProfil(await crmAPI.saveProfile(patientId, { quartier: valeur }));
      setModifier(false);
      if (valeur && !quartiers.includes(valeur)) viderCacheQuartiers();
    } catch (e) {
      enqueueSnackbar("Impossible d'enregistrer le quartier", { variant: 'error' });
    } finally {
      setEnvoi(false);
    }
  };

  if (patientId && !modifier) {
    const affiche = profil.quartier || profil.quartier_guess;
    return (
      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
        Quartier : {affiche ? <strong>{affiche}</strong> : <em>non renseigné</em>}
        {!profil.quartier && profil.quartier_guess && ' (reconnu dans l\'adresse)'}
        <Link component="button" type="button" underline="always" onClick={() => setModifier(true)}>
          {affiche ? 'modifier' : 'choisir'}
        </Link>
      </Typography>
    );
  }

  const liste = courant && !quartiers.includes(courant) ? [...quartiers, courant] : quartiers;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Quartier <span style={{ opacity: 0.7 }}>(facultatif)</span>
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5, opacity: envoi ? 0.6 : 1 }}>
        {liste.map((q) => {
          const actif = courant === q;
          return (
            <Chip key={q} clickable disabled={envoi} label={q} onClick={() => choisir(q)}
              color={actif ? 'primary' : 'default'} variant={actif ? 'filled' : 'outlined'}
              sx={{ height: dense ? 32 : 36, fontWeight: actif ? 700 : 400 }} />
          );
        })}
        <Chip clickable disabled={envoi} label="Autre…" variant="outlined" onClick={() => setAutre(!autre)}
          sx={{ height: dense ? 32 : 36, fontStyle: 'italic' }} />
      </Box>
      {autre && (
        <Box display="flex" gap={1} mt={1} alignItems="center">
          <TextField size="small" autoFocus placeholder="Nom du quartier" value={saisie}
            onChange={(e) => setSaisie(e.target.value)} inputProps={{ maxLength: 80 }}
            onKeyDown={(e) => { if (e.key === 'Enter' && saisie.trim()) { e.preventDefault(); choisir(saisie.trim()); } }} />
          <Button size="small" variant="outlined" disabled={!saisie.trim() || envoi} onClick={() => choisir(saisie.trim())}>OK</Button>
        </Box>
      )}
    </Box>
  );
}
