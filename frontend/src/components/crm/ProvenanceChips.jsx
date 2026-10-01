import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, Link, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';

// Liste des provenances : une seule requête partagée par tous les composants de la page.
let cacheOrigines = null;
const chargerOrigines = async () => {
  if (!cacheOrigines) cacheOrigines = crmAPI.listOrigins().catch((e) => { cacheOrigines = null; throw e; });
  return cacheOrigines;
};

const INCONNUE = 'unknown';

/**
 * « Comment a-t-il connu le centre ? » — des pastilles à toucher, rien d'obligatoire.
 *
 * Deux usages, un seul composant :
 *  - avec `patientId` : le patient existe ; un tap enregistre aussitôt (facture, fiche).
 *    `masquerSiRenseigne` : sur la facture, on ne dérange pas pour un patient dont la
 *    provenance est connue (ou déduite : labo partenaire, prescripteur).
 *  - sans `patientId` : création du patient ; le parent garde `value` et l'envoie après
 *    la création (`value` = id de provenance, 'unknown' ou '').
 */
export default function ProvenanceChips({
  patientId, value, onChange, masquerSiRenseigne = false, titre = 'Comment a-t-il connu le centre ?',
  dense = false,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [origines, setOrigines] = useState([]);
  const [profil, setProfil] = useState(null);
  const [charge, setCharge] = useState(false);
  const [modifier, setModifier] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [indisponible, setIndisponible] = useState(false);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const liste = await chargerOrigines();
        if (vivant) setOrigines(liste);
      } catch (e) {
        if (vivant) setIndisponible(true);
      }
    })();
    return () => { vivant = false; };
  }, []);

  useEffect(() => {
    let vivant = true;
    setProfil(null);
    setModifier(false);
    if (!patientId) { setCharge(true); return undefined; }
    setCharge(false);
    crmAPI.getProfile(patientId)
      .then((p) => { if (vivant) { setProfil(p); setCharge(true); } })
      .catch(() => { if (vivant) { setIndisponible(true); setCharge(true); } });
    return () => { vivant = false; };
  }, [patientId]);

  // Un compte sans droit sur ces écrans, ou un serveur sans le module : on s'efface.
  if (indisponible || !charge) {
    return charge ? null : (patientId ? <CircularProgress size={14} /> : null);
  }

  const choisir = async (valeur) => {
    if (!patientId) { onChange?.(valeur === value ? '' : valeur); return; }
    setEnvoi(true);
    try {
      const corps = valeur === INCONNUE ? { unknown: true } : { origin_id: valeur };
      const maj = await crmAPI.saveProfile(patientId, corps);
      setProfil(maj);
      setModifier(false);
      onChange?.(valeur);
    } catch (e) {
      enqueueSnackbar("Impossible d'enregistrer la provenance", { variant: 'error' });
    } finally {
      setEnvoi(false);
    }
  };

  // Valeur actuellement affichée comme choisie.
  const courante = patientId
    ? (profil?.origin?.id || (profil?.unknown ? INCONNUE : (profil?.suggested?.id || '')))
    : (value || '');
  const etiquetteCourante = patientId
    ? (profil?.origin?.label || (profil?.unknown ? 'Inconnue' : profil?.suggested?.label || ''))
    : (value === INCONNUE ? 'Inconnue' : origines.find((o) => o.id === value)?.label || '');
  const renseigne = !!patientId && !!courante;

  if (patientId && renseigne && !modifier) {
    if (masquerSiRenseigne) return null;
    return (
      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
        Connu par : <strong>{etiquetteCourante}</strong>
        {profil?.suggested && !profil?.origin && !profil?.unknown && ' (déduit)'}
        <Link component="button" type="button" underline="always" onClick={() => setModifier(true)}>
          modifier
        </Link>
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {titre} <span style={{ opacity: 0.7 }}>(facultatif)</span>
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5, opacity: envoi ? 0.6 : 1 }}>
        {origines.map((o) => {
          const actif = courante === o.id;
          return (
            <Chip
              key={o.id} clickable disabled={envoi} label={o.label}
              color={actif ? 'primary' : 'default'} variant={actif ? 'filled' : 'outlined'}
              onClick={() => choisir(o.id)}
              sx={{ height: dense ? 32 : 40, fontSize: '0.875rem', fontWeight: actif ? 700 : 400 }}
            />
          );
        })}
        <Chip
          clickable disabled={envoi} label="Je ne sais pas"
          color={courante === INCONNUE ? 'primary' : 'default'}
          variant={courante === INCONNUE ? 'filled' : 'outlined'}
          onClick={() => choisir(INCONNUE)}
          sx={{ height: dense ? 32 : 40, fontSize: '0.875rem', fontStyle: 'italic' }}
        />
      </Box>
    </Box>
  );
}
