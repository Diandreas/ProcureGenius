import React, { useState, useEffect, useRef } from 'react';
import { Box, Chip, Typography, Link, CircularProgress, Autocomplete, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import crmAPI from '../../services/crmAPI';
import { chargerCampagnesActives } from './crmData';

// Liste des provenances : une seule requête partagée par tous les composants de la page.
let cacheOrigines = null;
const chargerOrigines = async () => {
  if (!cacheOrigines) cacheOrigines = crmAPI.listOrigins().catch((e) => { cacheOrigines = null; throw e; });
  return cacheOrigines;
};

export const viderCacheOrigines = () => { cacheOrigines = null; };

const INCONNUE = 'unknown';
const BOUCHE_A_OREILLE = 'word_of_mouth';

const titreNom = (nom) => (nom || '')
  .toLowerCase().replace(/(^|\s|-)(\S)/g, (_, a, b) => a + b.toUpperCase());

/** « Envoyé par quel patient ? » : recherche par nom, téléphone ou numéro. */
function ParrainPicker({ valeur, onChoisir, desactive }) {
  const [recherche, setRecherche] = useState('');
  const [options, setOptions] = useState([]);
  const [chargement, setChargement] = useState(false);
  const dernier = useRef(0);

  useEffect(() => {
    if (recherche.trim().length < 2) { setOptions([]); return undefined; }
    const numero = ++dernier.current;
    setChargement(true);
    const t = setTimeout(async () => {
      try {
        const liste = await crmAPI.searchReferrers(recherche.trim());
        if (numero === dernier.current) setOptions(liste);
      } catch (e) {
        if (numero === dernier.current) setOptions([]);
      } finally {
        if (numero === dernier.current) setChargement(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [recherche]);

  return (
    <Autocomplete
      size="small" options={options} loading={chargement} value={valeur || null} disabled={desactive}
      onChange={(_, v) => onChoisir(v)} inputValue={recherche} onInputChange={(_, v) => setRecherche(v)}
      filterOptions={(x) => x} getOptionLabel={(o) => titreNom(o.name)}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      noOptionsText={recherche.trim().length < 2 ? 'Écrivez au moins 2 lettres' : 'Aucun patient trouvé'}
      renderOption={(props, o) => (
        <li {...props} key={o.id}>
          <Box>
            <Typography variant="body2" fontWeight={600}>{titreNom(o.name)}</Typography>
            <Typography variant="caption" color="text.secondary">{[o.phone, o.patient_number].filter(Boolean).join(' · ')}</Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} label="Envoyé par quel patient ? (facultatif)" placeholder="Nom ou téléphone" />
      )}
      sx={{ maxWidth: 380, mt: 1 }}
    />
  );
}

/**
 * « Comment a-t-il connu le centre ? » — des pastilles à toucher, rien d'obligatoire.
 *
 * Deux usages, un seul composant :
 *  - avec `patientId` : le patient existe ; un tap enregistre aussitôt (facture, fiche).
 *    `masquerSiRenseigne` : sur la facture, on ne dérange pas pour un patient dont la
 *    provenance est connue (ou déduite : labo partenaire, prescripteur).
 *  - sans `patientId` : création du patient ; le parent garde `value` (id de provenance,
 *    'unknown' ou ''), `campaign` et `referrer`, et les envoie après la création.
 * Bouche-à-oreille : on peut désigner le patient qui l'a envoyé (parrain).
 */
export default function ProvenanceChips({
  patientId, value, onChange, masquerSiRenseigne = false, titre = 'Comment a-t-il connu le centre ?',
  dense = false, campaign = '', onCampaignChange, referrer = null, onReferrerChange,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [origines, setOrigines] = useState([]);
  const [profil, setProfil] = useState(null);
  const [charge, setCharge] = useState(false);
  const [modifier, setModifier] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [indisponible, setIndisponible] = useState(false);
  const [campagnes, setCampagnes] = useState([]);

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
    chargerCampagnesActives().then((l) => { if (vivant) setCampagnes(l); }).catch(() => {});
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

  const enregistrer = async (corps, messageErreur) => {
    setEnvoi(true);
    try {
      const maj = await crmAPI.saveProfile(patientId, corps);
      setProfil(maj);
      return maj;
    } catch (e) {
      enqueueSnackbar(messageErreur, { variant: 'error' });
      return null;
    } finally {
      setEnvoi(false);
    }
  };

  const choisir = async (valeur) => {
    if (!patientId) { onChange?.(valeur === value ? '' : valeur); return; }
    const maj = await enregistrer(valeur === INCONNUE ? { unknown: true } : { origin_id: valeur },
      "Impossible d'enregistrer la provenance");
    if (maj) {
      const code = maj.origin?.code;
      // Bouche-à-oreille : on laisse le champ « envoyé par » ouvert juste en dessous.
      if (code !== BOUCHE_A_OREILLE) setModifier(false);
      onChange?.(valeur);
    }
  };

  const choisirCampagne = async (id) => {
    if (!patientId) { onCampaignChange?.(campaign === id ? '' : id); return; }
    const maj = await enregistrer({ campaign_id: profil?.campaign?.id === id ? null : id },
      "Impossible d'enregistrer la campagne");
    if (maj) onChange?.(maj.origin ? maj.origin.id : '');
  };

  const choisirParrain = async (p) => {
    if (!patientId) { onReferrerChange?.(p); return; }
    const maj = await enregistrer({ referred_by_id: p ? p.id : null }, "Impossible d'enregistrer le parrain");
    if (maj && p) setModifier(false);
  };

  const campagneCourante = patientId ? (profil?.campaign?.id || '') : (campaign || '');

  // Valeur actuellement affichée comme choisie.
  const courante = patientId
    ? (profil?.origin?.id || (profil?.unknown ? INCONNUE : (profil?.suggested?.id || '')))
    : (value || '');
  const etiquetteCourante = patientId
    ? (profil?.origin?.label || (profil?.unknown ? 'Inconnue' : profil?.suggested?.label || ''))
    : (value === INCONNUE ? 'Inconnue' : origines.find((o) => o.id === value)?.label || '');
  const codeCourant = patientId
    ? profil?.origin?.code
    : origines.find((o) => o.id === value)?.code;
  const renseigne = !!patientId && !!courante;
  const parrainCourant = patientId ? profil?.referred_by : referrer;

  if (patientId && renseigne && !modifier) {
    if (masquerSiRenseigne) return null;
    return (
      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
        Connu par : <strong>{etiquetteCourante}</strong>
        {profil?.suggested && !profil?.origin && !profil?.unknown && ' (déduit)'}
        {profil?.referred_by && <> · envoyé par <strong>{titreNom(profil.referred_by.name)}</strong></>}
        {profil?.campaign && <> · campagne <strong>{profil.campaign.name}</strong></>}
        {codeCourant === BOUCHE_A_OREILLE && !profil?.referred_by ? (
          <Link component="button" type="button" underline="always" onClick={() => setModifier(true)}>
            qui l'a envoyé ?
          </Link>
        ) : (
          <Link component="button" type="button" underline="always" onClick={() => setModifier(true)}>
            modifier
          </Link>
        )}
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
      {codeCourant === BOUCHE_A_OREILLE && (
        <ParrainPicker valeur={parrainCourant} onChoisir={choisirParrain} desactive={envoi} />
      )}
      {campagnes.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Venu d'une campagne ? <span style={{ opacity: 0.7 }}>(facultatif)</span>
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5, opacity: envoi ? 0.6 : 1 }}>
            {campagnes.map((c) => {
              const actif = campagneCourante === c.id;
              return (
                <Chip
                  key={c.id} clickable disabled={envoi} label={c.name}
                  color={actif ? 'secondary' : 'default'} variant={actif ? 'filled' : 'outlined'}
                  onClick={() => choisirCampagne(c.id)}
                  sx={{ height: dense ? 32 : 40, fontSize: '0.875rem', fontWeight: actif ? 700 : 400 }}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
