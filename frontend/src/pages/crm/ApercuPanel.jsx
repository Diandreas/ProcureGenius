import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Alert,
  FormControlLabel, Checkbox, TextField, Button, IconButton, MenuItem,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import crmAPI from '../../services/crmAPI';
import CircuitSchema from './CircuitSchema';

// Date locale AAAA-MM-JJ (toISOString passerait en UTC et décalerait d'un jour).
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const lundi = (t) => { const d = new Date(t); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const decale = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Périodes à cocher (plusieurs à la fois) : chacune devient une colonne.
const CHOIX = [
  { code: 'jour', label: "Aujourd'hui", calc: (t) => [t, t] },
  { code: 'hier', label: 'Hier', calc: (t) => [decale(t, -1), decale(t, -1)] },
  { code: 'semaine', label: 'Semaine en cours', calc: (t) => [lundi(t), t] },
  { code: 'semaine_derniere', label: 'Semaine dernière', calc: (t) => [decale(lundi(t), -7), decale(lundi(t), -1)] },
  { code: 'mois', label: 'Mois en cours', calc: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t] },
  { code: 'mois_dernier', label: 'Mois dernier', calc: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)] },
  { code: 'annee', label: 'Année en cours', calc: (t) => [new Date(t.getFullYear(), 0, 1), t] },
];

const nombre = (n) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('fr-FR'));
const franc = (n) => (n === null || n === undefined ? '—' : `${nombre(n)} F`);
const court = (s) => s.split('-').reverse().slice(0, 2).join('/');

// Lignes du tableau : [clé, libellé, format, montant ?, aide]
const LIGNES = [
  ['revenue_paid', "Chiffre d'affaires encaissé", franc, true, 'Factures payées, comme le tableau de bord'],
  ['revenue_invoiced', 'Chiffre d\'affaires facturé', franc, true, 'Toutes les factures (payées ou non)'],
  ['to_collect', 'Reste à encaisser', franc, true],
  ['revenue_per_day', 'CA moyen par jour', franc, true, 'Sur les jours écoulés : compare équitablement une semaine en cours'],
  ['average_basket', 'Panier moyen (par passage)', franc, true, 'CA encaissé ÷ passages payés'],
  ['revenue_per_patient', 'Dépense moyenne par patient', franc, true],
  ['patients', 'Patients venus', nombre, false, 'Patients du centre (hors labos partenaires)'],
  ['new_patients', 'Nouveaux patients (fiches créées)', nombre, false],
  ['returning_patients', 'Patients déjà connus', nombre, false],
  ['loyal_rate', 'Part de patients déjà connus', (n) => (n === null || n === undefined ? '—' : `${n} %`), false, 'Fidélité : venus avant cette période'],
  ['visits', 'Passages (patient venu un jour)', nombre, false],
  ['patients_per_day', 'Moyenne de passages par jour', (n) => (n ?? '—'), false],
  ['external_patients', 'Patients de labos partenaires', nombre, false],
  ['invoices', 'Factures', nombre, false],
  ['contacts', 'Relances faites', nombre, false],
  ['walk_ins', 'Passages notés (bouton vert)', nombre, false],
  ['lost_sales', 'Repartis sans acheter', nombre, false],
];

function Evolution({ a, b }) {
  if (a === null || a === undefined || b === null || b === undefined || b === 0) return null;
  const pct = Math.round(((a - b) / b) * 100);
  if (!Number.isFinite(pct)) return null;
  return (
    <Typography component="span" variant="caption" sx={{ ml: 0.75, fontWeight: 700, color: pct >= 0 ? 'success.main' : 'error.main' }}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)} %
    </Typography>
  );
}

export default function ApercuPanel() {
  const [coches, setCoches] = useState(['semaine', 'semaine_derniere']);
  const [plages, setPlages] = useState([]);   // dates précises ajoutées
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  // Schéma du circuit : une des périodes cochées
  const [colSchema, setColSchema] = useState(0);
  const [circuit, setCircuit] = useState(null);
  const [chargeCircuit, setChargeCircuit] = useState(false);

  const colonnes = useMemo(() => {
    const t = new Date();
    const liste = CHOIX.filter((c) => coches.includes(c.code)).map((c) => {
      const [d, f] = c.calc(t);
      return { label: c.label, start: iso(d), end: iso(f) };
    });
    plages.filter((p) => p.start && p.end && p.start <= p.end)
      .forEach((p) => liste.push({ label: `Du ${court(p.start)} au ${court(p.end)}`, start: p.start, end: p.end }));
    return liste;
  }, [coches, plages]);

  useEffect(() => {
    if (!colonnes.length) { setDonnees(null); return undefined; }
    let vivant = true;
    setChargement(true);
    setErreur('');
    crmAPI.getOverview(colonnes.map((c) => `${c.start}:${c.end}`))
      .then((d) => { if (vivant) setDonnees(d); })
      .catch(() => { if (vivant) setErreur('Impossible de charger les chiffres.'); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [colonnes]);

  const periodeSchema = colonnes[Math.min(colSchema, colonnes.length - 1)];
  useEffect(() => {
    if (!periodeSchema) { setCircuit(null); return undefined; }
    let vivant = true;
    setChargeCircuit(true);
    crmAPI.getJourney({ start: periodeSchema.start, end: periodeSchema.end, level: 'service', pharmacy: '0' })
      .then((d) => { if (vivant) setCircuit(d.circuit); })
      .catch(() => { if (vivant) setCircuit(null); })
      .finally(() => { if (vivant) setChargeCircuit(false); });
    return () => { vivant = false; };
  }, [periodeSchema?.start, periodeSchema?.end]); // eslint-disable-line react-hooks/exhaustive-deps

  const basculer = (code) => setCoches((l) => (l.includes(code) ? l.filter((x) => x !== code) : [...l, code]));
  const montants = Boolean(donnees?.amounts_visible);
  const periodes = donnees?.periods || [];
  const cles = (champ) => {
    const noms = new Set();
    periodes.forEach((p) => Object.keys(p[champ] || {}).forEach((k) => noms.add(k)));
    return [...noms];
  };
  const services = useMemo(() => cles('by_service'), [periodes]); // eslint-disable-line react-hooks/exhaustive-deps
  const servicesPatients = useMemo(() => cles('patients_by_service'), [periodes]); // eslint-disable-line react-hooks/exhaustive-deps
  const modes = useMemo(() => cles('by_payment'), [periodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bloc de lignes « détail » (par service, par mode de paiement) avec l'évolution
  const bloc = (titre, champ, noms, format) => (noms.length > 0 ? (
    <React.Fragment key={champ}>
      <TableRow>
        <TableCell colSpan={periodes.length + 1} sx={{ bgcolor: 'action.hover', fontWeight: 700 }}>{titre}</TableCell>
      </TableRow>
      {noms.map((s) => (
        <TableRow key={`${champ}-${s}`} hover>
          <TableCell sx={{ pl: 3 }}>{s}</TableCell>
          {periodes.map((p, i) => (
            <TableCell key={i} align="right" sx={{ whiteSpace: 'nowrap' }}>
              {format(p[champ]?.[s] ?? 0)}
              <Evolution a={p[champ]?.[s] ?? 0} b={comparable(i) ? (periodes[i + 1][champ]?.[s] ?? 0) : undefined} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </React.Fragment>
  ) : null);
  const lignes = LIGNES.filter((l) => !l[3] || montants);
  // Évolution : chaque colonne comparée à celle qui la suit (ex. semaine en cours vs semaine dernière).
  // Évolution seulement entre deux périodes de même durée (semaine / semaine, mois / mois).
  const comparable = (i) => i + 1 < periodes.length && periodes[i + 1].days === periodes[i].days;
  const suivante = (i, cle) => (comparable(i) ? periodes[i + 1][cle] : undefined);

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Périodes à comparer (cochez-en plusieurs)</Typography>
        <Box display="flex" flexWrap="wrap" columnGap={1}>
          {CHOIX.map((c) => (
            <FormControlLabel key={c.code} label={c.label}
              control={<Checkbox size="small" checked={coches.includes(c.code)} onChange={() => basculer(c.code)} />} />
          ))}
        </Box>
        {plages.map((p, i) => (
          <Box key={i} display="flex" gap={1} alignItems="center" mt={1} flexWrap="wrap">
            <TextField type="date" size="small" label="Du" value={p.start} InputLabelProps={{ shrink: true }}
              onChange={(e) => setPlages(plages.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
            <TextField type="date" size="small" label="Au" value={p.end} InputLabelProps={{ shrink: true }}
              error={Boolean(p.start && p.end && p.start > p.end)}
              onChange={(e) => setPlages(plages.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
            <IconButton size="small" onClick={() => setPlages(plages.filter((_, j) => j !== i))} aria-label="Retirer"><CloseIcon fontSize="small" /></IconButton>
          </Box>
        ))}
        <Button size="small" sx={{ mt: 1 }} disabled={colonnes.length >= 8}
          onClick={() => setPlages([...plages, { start: iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), end: iso(new Date()) }])}>
          + Ajouter des dates précises
        </Button>
      </Paper>

      {!colonnes.length && <Alert severity="info">Cochez au moins une période.</Alert>}
      {chargement && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
      {erreur && <Alert severity="error">{erreur}</Alert>}
      {!chargement && !erreur && periodes.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Indicateur</TableCell>
                {periodes.map((p, i) => (
                  <TableCell key={i} align="right" sx={{ fontWeight: 700, minWidth: 150 }}>
                    {colonnes[i]?.label}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {court(p.start)} → {court(p.end)}{p.days_elapsed < p.days ? ` · ${p.days_elapsed}/${p.days} j écoulés` : ` · ${p.days} j`}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {lignes.map(([cle, libelle, format, , aide]) => (
                <TableRow key={cle} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={cle === 'revenue_paid' || cle === 'patients' ? 700 : 400}>{libelle}</Typography>
                    {aide && <Typography variant="caption" color="text.secondary">{aide}</Typography>}
                  </TableCell>
                  {periodes.map((p, i) => (
                    <TableCell key={i} align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {format(p[cle])}
                      <Evolution a={p[cle]} b={suivante(i, cle)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {bloc('Patients venus par service', 'patients_by_service', servicesPatients, nombre)}
              {montants && bloc("Chiffre d'affaires encaissé par service", 'by_service', services, franc)}
              {montants && bloc('Encaissé par mode de paiement', 'by_payment', modes, franc)}
            </TableBody>
          </Table>
        </Paper>
      )}
      {colonnes.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Circuit des actions des patients</Typography>
              <Typography variant="caption" color="text.secondary">
                Patients venus sur la période, depuis leur toute première facture : 1re action, puis la 2e, la 3e…
                {montants ? ' Sous chaque action : patients et encaissé (survol : panier moyen).' : ''}
              </Typography>
            </Box>
            {colonnes.length > 1 && (
              <TextField select size="small" label="Période du schéma" value={Math.min(colSchema, colonnes.length - 1)}
                onChange={(e) => setColSchema(Number(e.target.value))} sx={{ minWidth: 200 }}>
                {colonnes.map((c, i) => <MenuItem key={i} value={i}>{c.label}</MenuItem>)}
              </TextField>
            )}
          </Box>
          {chargeCircuit ? <Box display="flex" justifyContent="center" p={3}><CircularProgress size={28} /></Box>
            : circuit && <CircuitSchema circuit={circuit} />}
        </Paper>
      )}
      {!montants && periodes.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Les montants (chiffre d&apos;affaires, panier moyen) sont réservés aux administrateurs.
        </Typography>
      )}
      {periodes.length > 1 && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          ▲▼ : évolution par rapport à la colonne de droite, quand elle a la même durée (semaine / semaine, mois / mois). Pour une période en cours, regardez surtout les moyennes par jour.
        </Typography>
      )}
    </Box>
  );
}
