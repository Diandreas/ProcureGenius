import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Alert,
  Stack, LinearProgress, Tooltip, TextField,
} from '@mui/material';
import crmAPI from '../../services/crmAPI';
import ProfilDepensesPanel from './ProfilDepensesPanel';
import ParcoursPanel from './ParcoursPanel';
import ApercuPanel from './ApercuPanel';

// Date locale au format AAAA-MM-JJ (toISOString passerait en UTC et décalerait d'un jour).
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const PERIODES = [
  { code: 'semaine', label: 'Semaine en cours', calc: (t) => { const d = new Date(t); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [d, t]; } },
  {
    code: 'semaine_derniere', label: 'Semaine dernière',
    calc: (t) => {
      const lundi = new Date(t); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7) - 7);
      const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
      return [lundi, dimanche];
    },
  },
  { code: 'mois', label: 'Mois en cours', calc: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t] },
  { code: 'mois_dernier', label: 'Mois dernier', calc: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)] },
  { code: '30', label: '30 jours', calc: (t) => { const d = new Date(t); d.setDate(d.getDate() - 29); return [d, t]; } },
  { code: '90', label: '3 mois', calc: (t) => { const d = new Date(t); d.setDate(d.getDate() - 89); return [d, t]; } },
  { code: '180', label: '6 mois', calc: (t) => { const d = new Date(t); d.setDate(d.getDate() - 179); return [d, t]; } },
  { code: '365', label: '1 an', calc: (t) => { const d = new Date(t); d.setDate(d.getDate() - 364); return [d, t]; } },
  { code: 'plage', label: 'Dates précises…' },
];

const SECTIONS = [
  { value: 'ensemble', label: "Vue d'ensemble" },
  { value: 'equipe', label: 'Équipe : qui convertit ?' },
  { value: 'relances', label: 'Relances' },
  { value: 'campagnes', label: 'Campagnes' },
  { value: 'provenance', label: 'Provenance' },
  { value: 'montee', label: 'Montée en gamme' },
  { value: 'fidelite', label: 'Fidélité' },
  { value: 'pertes', label: 'Ventes perdues' },
  { value: 'parcours', label: 'Parcours patients' },
  { value: 'depenses', label: 'Qui dépense ?', montants: true },
];

const iso = (d) => d.toISOString().slice(0, 10);
const nombre = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const fmt = (n) => (n === null || n === undefined ? '—' : `${nombre(n)} F`);
const pc = (n) => (n === null || n === undefined ? '—' : `${n} %`);

function Kpi({ valeur, libelle, couleur, aide }) {
  const corps = (
    <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center', flex: '1 1 130px', minWidth: 120 }}>
      <Typography variant="h5" fontWeight={800} color={couleur || 'primary.main'} lineHeight={1.1}>{valeur}</Typography>
      <Typography variant="caption" color="text.secondary">{libelle}</Typography>
    </Paper>
  );
  return aide ? <Tooltip title={aide}>{corps}</Tooltip> : corps;
}

function Carte({ titre, children, note }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, overflowX: 'auto' }}>
      <Typography variant="subtitle2" fontWeight={700} mb={0.75}>{titre}</Typography>
      {children}
      {note && <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>{note}</Typography>}
    </Paper>
  );
}

function TableauRelances({ lignes, premiere, montants }) {
  if (!lignes.length) return <Typography variant="body2" color="text.secondary">Aucune donnée sur la période.</Typography>;
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{premiere}</TableCell>
          <TableCell align="right">Relances</TableCell>
          <TableCell align="right">D'accord</TableCell>
          <TableCell align="right">Venus</TableCell>
          <TableCell align="right">Pas venus</TableCell>
          <TableCell align="right">Attendus</TableCell>
          <TableCell align="right">Ont tenu parole</TableCell>
          {montants && <TableCell align="right">CA</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {lignes.map((l) => (
          <TableRow key={l.label}>
            <TableCell>{l.label}</TableCell>
            <TableCell align="right">{l.contacts}</TableCell>
            <TableCell align="right">{l.agreed}</TableCell>
            <TableCell align="right"><strong>{l.came}</strong></TableCell>
            <TableCell align="right">{l.missed}</TableCell>
            <TableCell align="right">{l.waiting}</TableCell>
            <TableCell align="right">{pc(l.came_rate)}</TableCell>
            {montants && <TableCell align="right">{fmt(l.revenue)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Une étape de l'entonnoir : nombre + taux par rapport à l'étape précédente ; le meilleur taux
// de chaque étape (au moins 5 personnes à l'étape précédente) est mis en avant.
const ETAPES = [
  { n: 'sent', label: 'Messages envoyés' },
  { n: 'answered', t: 'answer_rate', label: 'Ont répondu', base: 'sent' },
  { n: 'agreed', t: 'agree_rate', label: "D'accord pour venir", base: 'answered' },
  { n: 'came', t: 'came_rate', label: 'Sont venus', base: 'agreed' },
  { n: 'retained', t: 'retained_rate', label: 'Sont revenus ensuite', base: 'came' },
];

function TableauEquipe({ lignes, montants }) {
  const actifs = lignes.filter((l) => l.sent > 0 || l.passages > 0 || l.upsold > 0);
  if (!actifs.length) return <Typography variant="body2" color="text.secondary">Aucune action sur la période.</Typography>;
  const meilleur = {};
  ETAPES.filter((e) => e.t).forEach((e) => {
    const candidats = actifs.filter((l) => l[e.base] >= 5 && l[e.t] != null);
    if (candidats.length > 1) meilleur[e.t] = Math.max(...candidats.map((l) => l[e.t]));
  });
  const passagesOk = actifs.filter((l) => l.passages >= 5 && l.passage_rate != null);
  if (passagesOk.length > 1) meilleur.passage_rate = Math.max(...passagesOk.map((l) => l.passage_rate));
  const cellule = (l, n, t) => {
    const top = t && meilleur[t] != null && l[t] === meilleur[t];
    return (
      <TableCell align="right" sx={{ whiteSpace: 'nowrap', ...(top ? { bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 700 } : {}) }}>
        {l[n]}{t && l[t] != null && <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.85 }}>({l[t]} %)</Typography>}
      </TableCell>
    );
  };
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Personne</TableCell>
            {ETAPES.map((e) => <TableCell key={e.n} align="right">{e.label}</TableCell>)}
            <TableCell align="right">Venus / envoyés</TableCell>
            {montants && <TableCell align="right">Encaissé après relance</TableCell>}
            <TableCell align="right">Passages → achat</TableCell>
            <TableCell align="right">Montées en gamme</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {actifs.map((l) => (
            <TableRow key={l.label}>
              <TableCell><strong>{l.label}</strong></TableCell>
              {ETAPES.map((e) => <React.Fragment key={e.n}>{cellule(l, e.n, e.t)}</React.Fragment>)}
              <TableCell align="right"><strong>{pc(l.overall_rate)}</strong></TableCell>
              {montants && <TableCell align="right">{fmt(l.revenue)}</TableCell>}
              {cellule({ ...l, pb: `${l.passages_bought} / ${l.passages}` }, 'pb', 'passage_rate')}
              <TableCell align="right">{l.upsold}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

// « Qui est à la caisse » : ce que rapportent les patients selon la personne qui fait la facture.
function TableauCaisse({ donnees, montants }) {
  const lignes = (donnees?.rows || []).filter((l) => l.invoices > 0);
  if (!lignes.length) return <Typography variant="body2" color="text.secondary">Aucune facture sur la période.</Typography>;
  const meilleur = (cle) => {
    const v = lignes.filter((l) => l.days >= 2 && l[cle] != null).map((l) => l[cle]);
    return v.length > 1 ? Math.max(...v) : null;
  };
  const top = { revenue_per_day: meilleur('revenue_per_day'), basket: meilleur('basket'), per_patient: meilleur('per_patient'),
    patients_per_day: meilleur('patients_per_day'), upsold_rate: meilleur('upsold_rate') };
  const vert = (l, cle) => (top[cle] != null && l[cle] === top[cle]
    ? { bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 700, whiteSpace: 'nowrap' } : { whiteSpace: 'nowrap' });
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>À la caisse</TableCell>
            <TableCell align="right">Jours</TableCell>
            <TableCell align="right">Factures</TableCell>
            <TableCell align="right">Patients / jour</TableCell>
            <TableCell align="right">Nouveaux patients</TableCell>
            {montants && <TableCell align="right">Encaissé</TableCell>}
            {montants && <TableCell align="right">Encaissé / jour</TableCell>}
            {montants && <TableCell align="right">Panier moyen</TableCell>}
            {montants && <TableCell align="right">Par patient</TableCell>}
            <TableCell align="right">Grosses factures</TableCell>
            <TableCell align="right">Montées en gamme</TableCell>
            <TableCell align="right">Non soldées</TableCell>
            <TableCell>Ce qu'elle facture le plus</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.map((l) => (
            <TableRow key={l.label}>
              <TableCell><strong>{l.label}</strong></TableCell>
              <TableCell align="right">{l.days}</TableCell>
              <TableCell align="right">{l.invoices}</TableCell>
              <TableCell align="right" sx={vert(l, 'patients_per_day')}>{l.patients_per_day ?? '—'}</TableCell>
              <TableCell align="right">{l.new_patients}{l.files_created ? <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.8 }}>({l.files_created} fiches créées)</Typography> : null}</TableCell>
              {montants && <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{fmt(l.revenue)}</TableCell>}
              {montants && <TableCell align="right" sx={vert(l, 'revenue_per_day')}>{fmt(l.revenue_per_day)}</TableCell>}
              {montants && <TableCell align="right" sx={vert(l, 'basket')}>{fmt(l.basket)}</TableCell>}
              {montants && <TableCell align="right" sx={vert(l, 'per_patient')}>{fmt(l.per_patient)}</TableCell>}
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{l.big_invoices} <Typography component="span" variant="caption">({pc(l.big_rate)})</Typography></TableCell>
              <TableCell align="right" sx={vert(l, 'upsold_rate')}>{l.upsold} <Typography component="span" variant="caption">({pc(l.upsold_rate)})</Typography></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{l.unpaid}{montants && l.due ? <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>({fmt(l.due)})</Typography> : null}</TableCell>
              <TableCell><Typography variant="caption">{(l.top_services || []).map((s) => s.label).join(', ')}</Typography></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function Semaines({ points }) {
  if (!points.length) return null;
  const max = Math.max(...points.map((p) => p.contacts), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 90, overflowX: 'auto', pb: 2.5 }}>
      {points.map((p) => (
        <Tooltip key={p.week} title={`Semaine du ${new Date(p.week).toLocaleDateString('fr-FR')} : ${p.contacts} relance(s), ${p.came} venu(s)`}>
          <Box sx={{ flex: '0 0 22px', position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <Box sx={{ width: '100%', height: `${(p.contacts / max) * 100}%`, bgcolor: 'grey.400', borderRadius: 0.5, position: 'relative', minHeight: 2 }}>
              <Box sx={{ position: 'absolute', bottom: 0, width: '100%', height: `${p.contacts ? (p.came / p.contacts) * 100 : 0}%`, bgcolor: 'success.main', borderRadius: 0.5 }} />
            </Box>
            <Typography variant="caption" sx={{ position: 'absolute', bottom: -18, left: 0, fontSize: '0.6rem', color: 'text.secondary' }}>
              {new Date(p.week).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}

export default function StatsPanel({ peutVoirMontants }) {
  const [choix, setChoix] = useState('90');
  const [plage, setPlage] = useState(() => {
    const t = new Date();
    return { start: isoLocal(new Date(t.getFullYear(), t.getMonth(), 1)), end: isoLocal(t) };
  });
  const [section, setSection] = useState('ensemble');
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const periode = useMemo(() => {
    if (choix === 'plage') return plage.start && plage.end && plage.start <= plage.end ? { ...plage } : null;
    const [debut, fin] = PERIODES.find((x) => x.code === choix).calc(new Date());
    return { start: isoLocal(debut), end: isoLocal(fin) };
  }, [choix, plage]);

  useEffect(() => {
    if (['depenses', 'parcours', 'ensemble'].includes(section) || !periode) return undefined;
    let vivant = true;
    setChargement(true);
    setErreur('');
    crmAPI.getStats(periode)
      .then((d) => { if (vivant) setDonnees(d); })
      .catch(() => { if (vivant) setErreur('Impossible de charger les statistiques.'); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [periode, section]);

  const montants = Boolean(donnees?.amounts_visible);
  const o = donnees?.overview;

  const relances = donnees && (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Kpi valeur={o.contacts} libelle="relances" aide="Contacts notés sur la période" />
        <Kpi valeur={o.patients_contacted} libelle="patients contactés" />
        <Kpi valeur={o.agreed} libelle="d'accord pour venir" />
        <Kpi valeur={o.came} libelle="venus ensuite" couleur="success.main" aide="Une facture suit la relance, pour le bon motif" />
        <Kpi valeur={pc(o.came_rate)} libelle="ont tenu parole" couleur="success.main" aide="Venus ÷ (venus + pas venus). Les attendus ne comptent pas encore." />
        <Kpi valeur={o.missed} libelle="pas venus" couleur="warning.main" aide="Le délai de 30 jours est écoulé" />
        <Kpi valeur={o.waiting} libelle="encore attendus" couleur="info.main" />
        <Kpi valeur={o.median_days_to_come === null ? '—' : `${o.median_days_to_come} j`} libelle="délai médian avant la venue" />
        {montants && <Kpi valeur={fmt(o.revenue_after_contact)} libelle="encaissé après relance" couleur="success.main" />}
      </Box>

      <Carte
        titre="Les patients qui ne reviennent plus : a-t-on essayé de les rappeler ?"
        note="« Pas revenus depuis 60 jours » = ceux qui avaient déjà une facture. Une relance dans les 30 derniers jours compte comme essayé."
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <LinearProgress variant="determinate" value={o.dormant_contacted_rate || 0} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
          <Typography variant="body2" fontWeight={700}>
            {o.dormant_contacted_30d} / {o.dormant_patients} ({pc(o.dormant_contacted_rate)})
          </Typography>
        </Box>
      </Carte>

      <Carte titre="Relances par semaine" note="Gris : relances. Vert : celles qui ont été suivies d'une venue.">
        {donnees.timeline.length ? <Semaines points={donnees.timeline} /> : <Typography variant="body2" color="text.secondary">Aucune relance sur la période.</Typography>}
      </Carte>

      <Carte titre="Par motif"><TableauRelances lignes={donnees.by_reason} premiere="Motif" montants={montants} /></Carte>
      <Carte titre="Par moyen de contact"><TableauRelances lignes={donnees.by_channel} premiere="Moyen" montants={montants} /></Carte>
      <Carte titre="Par personne"><TableauRelances lignes={donnees.by_agent} premiere="Qui a relancé" montants={montants} /></Carte>

      <Carte titre="Réponses obtenues">
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {donnees.by_outcome.map((r) => <Chip key={r.code} label={`${r.label} · ${r.count}`} variant="outlined" />)}
        </Stack>
      </Carte>

      <Carte titre="Promis, à surveiller" note="Les patients qui ont dit « d'accord » et pour qui il n'y a pas encore de facture.">
        {donnees.to_follow.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Personne en attente.</Typography>
        ) : (
          <Table size="small">
            <TableBody>
              {donnees.to_follow.map((p, i) => (
                <TableRow key={`${p.patient_id}-${i}`}>
                  <TableCell>{(p.name || '').toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase())}</TableCell>
                  <TableCell>{p.reason || '—'}{p.campaign ? ` · ${p.campaign}` : ''}</TableCell>
                  <TableCell align="right">il y a {p.days} j</TableCell>
                  <TableCell align="right">
                    <Chip size="small" color={p.status === 'missed' ? 'warning' : 'info'} variant="outlined"
                      label={p.status === 'missed' ? 'Pas venu' : 'Attendu'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Carte>
    </Stack>
  );

  const campagnes = donnees && (
    <Carte titre="Campagnes" note="Chiffres depuis le début de chaque campagne. « CA des patients » = encaissé par les patients rattachés, depuis le début de la campagne.">
      {donnees.campaigns.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Aucune campagne créée.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Campagne</TableCell>
              <TableCell align="right">Patients</TableCell>
              <TableCell align="right">Relances</TableCell>
              <TableCell align="right">D'accord</TableCell>
              <TableCell align="right">Venus</TableCell>
              <TableCell align="right">Ont tenu parole</TableCell>
              {montants && <TableCell align="right">CA des patients</TableCell>}
              {montants && <TableCell align="right">Budget</TableCell>}
              {montants && <TableCell align="right">Coût / patient</TableCell>}
              {montants && <TableCell align="right">CA ÷ budget</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {donnees.campaigns.map((c) => (
              <TableRow key={c.id} sx={{ opacity: c.is_active ? 1 : 0.55 }}>
                <TableCell>{c.label}<Typography variant="caption" color="text.secondary" display="block">{c.kind}</Typography></TableCell>
                <TableCell align="right"><strong>{c.patients}</strong></TableCell>
                <TableCell align="right">{c.contacts}</TableCell>
                <TableCell align="right">{c.agreed}</TableCell>
                <TableCell align="right">{c.came}</TableCell>
                <TableCell align="right">{pc(c.came_rate)}</TableCell>
                {montants && <TableCell align="right">{fmt(c.revenue_patients)}</TableCell>}
                {montants && <TableCell align="right">{fmt(c.budget)}</TableCell>}
                {montants && <TableCell align="right">{fmt(c.cost_per_patient)}</TableCell>}
                {montants && <TableCell align="right">{c.roi === null ? '—' : `× ${c.roi}`}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Carte>
  );

  const provenance = donnees && (
    <Stack spacing={1.5}>
      <Carte titre="Provenance renseignée" note="Plus ce chiffre est haut, plus les statistiques ci-dessous sont fiables.">
        <Box display="flex" alignItems="center" gap={1.5}>
          <LinearProgress variant="determinate" value={donnees.provenance_coverage.rate || 0} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
          <Typography variant="body2" fontWeight={700}>
            {donnees.provenance_coverage.with_origin} / {donnees.provenance_coverage.active_patients} patients actifs ({pc(donnees.provenance_coverage.rate)})
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
          Nouveaux patients sur la période : {donnees.provenance_coverage.new_patients}, dont {donnees.provenance_coverage.new_with_origin} avec une provenance.
        </Typography>
      </Carte>
      <Carte titre="Par quartier" note={`Quartier choisi en pastille, sinon reconnu dans l'adresse. ${donnees.quartiers_unknown} patient(s) sans quartier reconnu.`}>
        {donnees.quartiers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Aucun quartier reconnu.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Quartier</TableCell>
                <TableCell align="right">Patients</TableCell>
                <TableCell align="right">Nouveaux (période)</TableCell>
                <TableCell align="right">Actifs (période)</TableCell>
                <TableCell align="right">Reviennent</TableCell>
                {montants && <TableCell align="right">CA (période)</TableCell>}
                {montants && <TableCell align="right">Moyenne / actif</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {donnees.quartiers.slice(0, 15).map((q) => (
                <TableRow key={q.label}>
                  <TableCell>{q.label}</TableCell>
                  <TableCell align="right"><strong>{q.patients}</strong></TableCell>
                  <TableCell align="right">{q.new_patients}</TableCell>
                  <TableCell align="right">{q.active_patients}</TableCell>
                  <TableCell align="right">{pc(q.repeat_rate)}</TableCell>
                  {montants && <TableCell align="right">{fmt(q.revenue)}</TableCell>}
                  {montants && <TableCell align="right">{fmt(q.avg_per_active)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Carte>
      <Carte titre="Les patients qui vous en amènent d'autres" note="Saisi à la création du patient quand la provenance est « Bouche-à-oreille ». Pensez à les remercier.">
        {donnees.referrers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Personne pour l'instant. Quand un patient vient par bouche-à-oreille, notez qui l'a envoyé.
          </Typography>
        ) : (
          <Table size="small">
            <TableBody>
              {donnees.referrers.map((p) => (
                <TableRow key={p.patient_id}>
                  <TableCell>{(p.name || '').toLowerCase().replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase())}</TableCell>
                  <TableCell align="right"><strong>{p.referrals}</strong> patient{p.referrals > 1 ? 's' : ''} envoyé{p.referrals > 1 ? 's' : ''}</TableCell>
                  {montants && <TableCell align="right">{fmt(p.revenue_referred)} payés par eux</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Carte>
      <Carte titre="D'où viennent les patients, et ce qu'ils rapportent" note="« Reviennent » : au moins deux jours de visite depuis le début de l'historique.">
        {donnees.provenance.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Aucune provenance saisie pour l'instant.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Provenance</TableCell>
                <TableCell align="right">Patients</TableCell>
                <TableCell align="right">Nouveaux (période)</TableCell>
                <TableCell align="right">Actifs (période)</TableCell>
                <TableCell align="right">Reviennent</TableCell>
                <TableCell align="right">Visites / patient</TableCell>
                {montants && <TableCell align="right">CA (période)</TableCell>}
                {montants && <TableCell align="right">Moyenne / actif</TableCell>}
                {montants && <TableCell align="right">Rapporte par patient (depuis toujours)</TableCell>}
                {montants && <TableCell align="right">Panier moyen</TableCell>}
                <TableCell>Ce qu'ils prennent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {donnees.provenance.map((p) => (
                <TableRow key={p.label}>
                  <TableCell>{p.label}</TableCell>
                  <TableCell align="right"><strong>{p.patients}</strong></TableCell>
                  <TableCell align="right">{p.new_patients}</TableCell>
                  <TableCell align="right">{p.active_patients}</TableCell>
                  <TableCell align="right">{pc(p.repeat_rate)}</TableCell>
                  <TableCell align="right">{p.visits_per_patient ?? '—'}</TableCell>
                  {montants && <TableCell align="right">{fmt(p.revenue)}</TableCell>}
                  {montants && <TableCell align="right">{fmt(p.avg_per_active)}</TableCell>}
                  {montants && (
                    <TableCell align="right" sx={p.rank === 1 ? { bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 700 } : undefined}>
                      {fmt(p.revenue_per_patient)}{p.rank ? <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>#{p.rank}</Typography> : null}
                    </TableCell>
                  )}
                  {montants && <TableCell align="right">{fmt(p.basket)}</TableCell>}
                  <TableCell>
                    <Typography variant="caption">{(p.top_services || []).map((x) => x.label).join(', ') || '—'}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Carte>
    </Stack>
  );

  const u = donnees?.upsell;
  const montee = donnees && (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Kpi valeur={u.upsold} libelle="montées en gamme" couleur="success.main" />
        <Kpi valeur={pc(u.upsold_rate)} libelle="des factures de la période" aide={`${u.upsold} sur ${u.invoices_period} factures`} />
        <Kpi valeur={u.invoices_with_info} libelle="factures avec une info de suivi" />
        {montants && <Kpi valeur={fmt(u.extra_total)} libelle="gagnés en plus du prévu" couleur="success.main"
          aide={`Calculé sur ${u.with_planned_amount} facture(s) où le prix prévu est connu`} />}
        {montants && <Kpi valeur={fmt(u.extra_avg)} libelle="de plus par montée en gamme" />}
      </Box>
      <Carte titre="Pour quoi venaient-ils au départ ?">
        {u.came_for.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Rien de saisi. Sur la facture, « Il a pris plus que prévu » permet de noter ce qu'il venait chercher.
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {u.came_for.map((c) => <Chip key={c.label} variant="outlined" label={`${c.label} · ${c.count}`} />)}
          </Stack>
        )}
      </Carte>
      {u.by_agent.length > 0 && (
        <Carte titre="Par personne">
          <Table size="small">
            <TableBody>
              {u.by_agent.map((a) => (
                <TableRow key={a.label}>
                  <TableCell>{a.label}</TableCell>
                  <TableCell align="right">{a.count} montée{a.count > 1 ? 's' : ''} en gamme</TableCell>
                  {montants && <TableCell align="right">{fmt(a.extra)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Carte>
      )}
    </Stack>
  );

  const r = donnees?.retention;
  const tauxBarre = (lignes, vide) => (lignes.length === 0 ? (
    <Typography variant="body2" color="text.secondary">{vide || 'Pas assez de patients pour comparer.'}</Typography>
  ) : (
    <Stack spacing={0.75}>
      {lignes.map((l) => (
        <Box key={l.label} display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" sx={{ width: { xs: 96, sm: 150 }, flexShrink: 0 }}>{l.label}</Typography>
          <LinearProgress variant="determinate" value={Math.min(l.rate || 0, 100)} color={(l.rate || 0) >= 40 ? 'success' : (l.rate || 0) >= 25 ? 'warning' : 'error'}
            sx={{ flex: 1, height: 10, borderRadius: 5 }} />
          <Typography variant="body2" fontWeight={700} sx={{ width: { xs: 92, sm: 120 }, textAlign: 'right', flexShrink: 0 }}>
            {pc(l.rate)} <Typography component="span" variant="caption" color="text.secondary">({l.returned}/{l.patients})</Typography>
          </Typography>
        </Box>
      ))}
    </Stack>
  ));

  const fidelite = donnees && r && (
    <Stack spacing={1.5}>
      <Alert severity="info" sx={{ alignItems: 'center' }}>
        Une <strong>prise en charge</strong> regroupe les visites espacées de 14 jours au plus (les injections de plusieurs jours
        de suite ne sont pas des retours). Un <strong>retour</strong> est une nouvelle prise en charge après une pause.
        Seuls comptent les patients dont la première prise en charge est finie depuis plus de 45 jours.
      </Alert>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Kpi valeur={pc(r.rate)} libelle="reviennent après une prise en charge" couleur={r.rate >= 40 ? 'success.main' : 'warning.main'}
          aide={`${r.returned} patients sur ${r.mature} analysés`} />
        <Kpi valeur={r.median_gap_days === null ? '—' : `${r.median_gap_days} j`} libelle="délai médian avant le retour" />
        <Kpi valeur={pc(r.single_day_share)} libelle="des prises en charge durent un seul jour" />
        <Kpi valeur={r.patients} libelle="patients dans l'analyse" />
        {montants && <Kpi valeur={fmt(r.avg_first_episode)} libelle="payés en moyenne à la 1re prise en charge" />}
        {montants && <Kpi valeur={fmt(r.avg_next_episode)} libelle="payés en moyenne aux suivantes" />}
      </Box>
      <Carte titre="Contrôles prévus sur la facture (« À revoir dans … »)" note="Contrôles prévus sur la période choisie dans l'onglet Relances. Honoré = revenu au plus tard 10 jours après la date prévue.">
        {donnees.revisits.planned === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun contrôle prévu. Sur la facture, « À revoir dans : 1 semaine » met le patient dans la liste « Contrôle prévu » s'il ne revient pas.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Kpi valeur={donnees.revisits.planned} libelle="contrôles prévus" />
            <Kpi valeur={donnees.revisits.honored} libelle="revenus à temps" couleur="success.main" />
            <Kpi valeur={donnees.revisits.late} libelle="pas revenus" couleur="warning.main" />
            <Kpi valeur={donnees.revisits.upcoming} libelle="à venir" couleur="info.main" />
            <Kpi valeur={pc(donnees.revisits.rate)} libelle="tenus" couleur="success.main" />
          </Box>
        )}
      </Carte>
      <Carte titre="Quand reviennent ceux qui reviennent ?" note="Pause entre la fin d'une prise en charge et le début de la suivante. C'est avant 60 jours que ça se joue : relancez à 3-4 semaines.">
        {(() => {
          const total = r.gap_buckets.reduce((s, b) => s + b.count, 0);
          return total === 0 ? <Typography variant="body2" color="text.secondary">Pas encore de retour observé.</Typography> : (
            <Stack spacing={0.75}>
              {r.gap_buckets.map((b) => (
                <Box key={b.label} display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" sx={{ width: { xs: 96, sm: 150 }, flexShrink: 0 }}>{b.label}</Typography>
                  <LinearProgress variant="determinate" value={(100 * b.count) / total} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
                  <Typography variant="body2" fontWeight={700} sx={{ width: { xs: 76, sm: 90 }, textAlign: 'right', flexShrink: 0 }}>{b.count} ({Math.round((100 * b.count) / total)} %)</Typography>
                </Box>
              ))}
            </Stack>
          );
        })()}
      </Carte>
      <Carte titre="Selon le mois de la première visite" note="Les plus récents ont eu moins de temps pour revenir : comparez surtout les mois éloignés.">
        {tauxBarre(r.cohorts.map((c) => ({ ...c, label: new Date(`${c.month}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) })), 'Pas encore assez de recul.')}
      </Carte>
      <Carte titre="Selon la porte d'entrée" note="Par quoi le patient est entré la première fois.">{tauxBarre(r.by_entry)}</Carte>
      <Carte titre="Selon l'âge">{tauxBarre(r.by_age)}</Carte>
      <Carte titre="Selon le sexe">{tauxBarre(r.by_gender)}</Carte>
    </Stack>
  );

  const vp = donnees?.lost_sales;
  const pertes = donnees && vp && (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Kpi valeur={vp.lost} libelle="repartis sans acheter" couleur="warning.main" />
        <Kpi valeur={vp.passages} libelle="passages notés" />
        <Kpi valeur={pc(vp.rate)} libelle="des passages" />
      </Box>
      <Carte titre="Pourquoi sont-ils repartis sans acheter ?" note="Noté avec le bouton vert « Un patient est passé ».">
        {vp.lost === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Rien de noté sur la période. Quand quelqu'un repart sans rien, un tap sur la raison suffit.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {vp.by_reason.map((r) => (
              <Box key={r.code} display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" sx={{ width: { xs: 120, sm: 230 }, flexShrink: 0 }}>{r.label}</Typography>
                <LinearProgress variant="determinate" value={vp.lost ? (100 * r.count) / vp.lost : 0} color="warning"
                  sx={{ flex: 1, height: 10, borderRadius: 5 }} />
                <Typography variant="body2" fontWeight={700} sx={{ width: 40, textAlign: 'right' }}>{r.count}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Carte>
      <Carte titre="Ce qui manquait" note="Produits ou examens indisponibles, tels qu'écrits au comptoir : de quoi décider d'une commande.">
        {vp.missing.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Rien de noté.</Typography>
        ) : (
          <Table size="small">
            <TableBody>
              {vp.missing.map((m, i) => (
                <TableRow key={i}>
                  <TableCell>{new Date(m.date).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{m.text}</TableCell>
                  <TableCell align="right"><Typography variant="caption" color="text.secondary">{m.came_for}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Carte>
    </Stack>
  );

  return (
    <Box>
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={1}>
        {SECTIONS.filter((s) => !s.montants || peutVoirMontants).map((s) => (
          <Chip key={s.value} clickable label={s.label} onClick={() => setSection(s.value)}
            color={section === s.value ? 'primary' : 'default'} variant={section === s.value ? 'filled' : 'outlined'}
            sx={{ fontWeight: section === s.value ? 700 : 400 }} />
        ))}
      </Box>
      {!['depenses', 'fidelite', 'ensemble'].includes(section) && (
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={1.5}>
          <Typography variant="caption" color="text.secondary">Période :</Typography>
          {PERIODES.map((p) => (
            <Chip key={p.code} size="small" clickable label={p.label} onClick={() => setChoix(p.code)}
              color={choix === p.code ? 'secondary' : 'default'} variant={choix === p.code ? 'filled' : 'outlined'} />
          ))}
          {choix === 'plage' && (
            <>
              <TextField type="date" size="small" label="Du" value={plage.start} InputLabelProps={{ shrink: true }}
                onChange={(e) => setPlage({ ...plage, start: e.target.value })} sx={{ width: 160 }} />
              <TextField type="date" size="small" label="Au" value={plage.end} InputLabelProps={{ shrink: true }}
                onChange={(e) => setPlage({ ...plage, end: e.target.value })} sx={{ width: 160 }}
                error={Boolean(plage.start && plage.end && plage.start > plage.end)} />
            </>
          )}
          {periode && (
            <Typography variant="caption" color="text.secondary">
              du {periode.start.split('-').reverse().join('/')} au {periode.end.split('-').reverse().join('/')}
            </Typography>
          )}
        </Box>
      )}

      {section === 'ensemble' ? (
        <ApercuPanel />
      ) : section === 'depenses' ? (
        <ProfilDepensesPanel />
      ) : section === 'parcours' ? (
        periode ? <ParcoursPanel periode={periode} /> : <Alert severity="warning">Choisissez une date de début avant la date de fin.</Alert>
      ) : !periode ? (
        <Alert severity="warning">Choisissez une date de début avant la date de fin.</Alert>
      ) : (
        <>
          {chargement && <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}
          {erreur && <Alert severity="error">{erreur}</Alert>}
          {!chargement && !erreur && donnees && (
            <>
              {section === 'equipe' && (
                <Stack spacing={1.5}>
                  <Carte
                    titre="Qui convertit le mieux, étape par étape"
                    note="Chaque pourcentage se calcule sur l'étape d'avant (ex. « Sont venus » = venus / d'accord). En vert : le meilleur taux de l'étape (au moins 5 personnes à l'étape d'avant). « Sont revenus ensuite » : une nouvelle visite après celle obtenue par la relance. « Passages → achat » : patients passés au centre (bouton « un patient est passé ») qui ont acheté."
                  >
                    <TableauEquipe lignes={donnees.team_conversion || []} montants={montants} />
                  </Carte>
                  <Carte
                    titre="Qui est à la caisse : quels patients dépensent le plus selon l'équipe"
                    note={`Par personne qui a fait la facture, sur la période. « Jours » = jours où elle a facturé. « Encaissé » = factures payées. « Grosses factures » = parmi le 1/5 des plus grosses factures payées de la période${donnees.cashier?.big_threshold ? ` (${fmt(donnees.cashier.big_threshold)} et plus)` : ''}. En vert : le meilleur (au moins 2 jours de présence).`}
                  >
                    <TableauCaisse donnees={donnees.cashier} montants={montants} />
                  </Carte>
                </Stack>
              )}
              {section === 'relances' && relances}
              {section === 'campagnes' && campagnes}
              {section === 'provenance' && provenance}
              {section === 'montee' && montee}
              {section === 'fidelite' && fidelite}
              {section === 'pertes' && pertes}
            </>
          )}
        </>
      )}
    </Box>
  );
}
