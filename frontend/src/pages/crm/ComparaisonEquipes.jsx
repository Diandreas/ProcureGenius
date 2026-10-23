import React, { useMemo, useState } from 'react';
import { Box, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

const nombre = (n) => Math.round(n || 0).toLocaleString('fr-FR');
const franc = (n) => (n === null || n === undefined ? '—' : `${nombre(n)} F`);
const pc = (n) => (n === null || n === undefined ? '—' : `${n} %`);
const brut = (n) => (n === null || n === undefined ? '—' : String(n));

// [clé, libellé, format, montant ?, plus haut = mieux ?, groupe]
const LIGNES = [
  ['days', 'Jours à la caisse', brut, false, null, 'Présence'],
  ['invoices', 'Factures', brut, false, true, 'Présence'],
  ['invoices_per_day', 'Factures par jour', brut, false, true, 'Présence'],
  ['patients_per_day', 'Patients par jour', brut, false, true, 'Présence'],
  ['new_patients', 'Nouveaux patients', brut, false, true, 'Présence'],
  ['revenue', 'Encaissé', franc, true, true, 'Ce que dépensent ses patients'],
  ['revenue_per_day', 'Encaissé par jour de caisse', franc, true, true, 'Ce que dépensent ses patients'],
  ['basket', 'Panier moyen', franc, true, true, 'Ce que dépensent ses patients'],
  ['per_patient', 'Dépense par patient', franc, true, true, 'Ce que dépensent ses patients'],
  ['big_rate', 'Part de grosses factures', pc, false, true, 'Ce que dépensent ses patients'],
  ['upsold_rate', 'Montées en gamme', pc, false, true, 'Ce que dépensent ses patients'],
  ['unpaid', 'Factures non soldées', brut, false, false, 'Ce que dépensent ses patients'],
  ['sent', 'Messages de relance envoyés', brut, false, true, 'Relances'],
  ['answer_rate', 'Ont répondu', pc, false, true, 'Relances'],
  ['came_rate', "Sont venus (sur les d'accord)", pc, false, true, 'Relances'],
  ['overall_rate', 'Venus / messages envoyés', pc, false, true, 'Relances'],
  ['passage_rate', 'Passages transformés en achat', pc, false, true, 'Relances'],
];

/**
 * Comparer les personnes à la caisse côte à côte sur la période : on coche qui comparer,
 * chaque ligne est un chiffre, chaque colonne une personne ; la barre montre l'écart,
 * le vert le meilleur et l'orange le moins bon.
 */
export default function ComparaisonEquipes({ caisse, conversion, montants }) {
  const personnes = useMemo(() => {
    const par = {};
    (caisse?.rows || []).forEach((r) => { par[r.label] = { ...r }; });
    // Relances d'abord, chiffres de caisse par-dessus (« revenue » = encaissé à la caisse, pas après relance).
    (conversion || []).forEach((c) => { par[c.label] = { invoices: 0, ...c, ...(par[c.label] || {}) }; });
    return Object.values(par).filter((p) => (p.invoices || 0) > 0 || (p.sent || 0) > 0)
      .sort((a, b) => (b.invoices || 0) - (a.invoices || 0));
  }, [caisse, conversion]);

  const [choisis, setChoisis] = useState(null);
  const actifs = choisis || personnes.filter((p) => (p.days || 0) >= 2).slice(0, 4).map((p) => p.label);
  const colonnes = personnes.filter((p) => actifs.includes(p.label));
  const basculer = (nom) => setChoisis((l) => {
    const base = l || personnes.filter((p) => (p.days || 0) >= 2).slice(0, 4).map((p) => p.label);
    return base.includes(nom) ? base.filter((x) => x !== nom) : [...base, nom];
  });

  if (!personnes.length) return <Typography variant="body2" color="text.secondary">Aucune activité sur la période.</Typography>;

  let groupe = '';
  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {personnes.map((p) => {
          const on = actifs.includes(p.label);
          return (
            <Chip key={p.label} clickable label={p.label} onClick={() => basculer(p.label)}
              color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'} />
          );
        })}
      </Box>
      {colonnes.length < 2 ? (
        <Typography variant="body2" color="text.secondary">Choisissez au moins deux personnes à comparer.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }} />
                {colonnes.map((c) => <TableCell key={c.label} align="center" sx={{ fontWeight: 700, minWidth: 140 }}>{c.label}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {LIGNES.filter(([, , , m]) => montants || !m).flatMap(([cle, libelle, format, , mieuxHaut, g]) => {
                const valeurs = colonnes.map((c) => c[cle]).filter((v) => v !== null && v !== undefined);
                const max = valeurs.length ? Math.max(...valeurs) : 0;
                const min = valeurs.length ? Math.min(...valeurs) : 0;
                const lignes = [];
                if (g !== groupe) {
                  groupe = g;
                  lignes.push(
                    <TableRow key={`g-${g}`}>
                      <TableCell colSpan={colonnes.length + 1} sx={{ bgcolor: 'action.hover', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'primary.main' }}>{g}</TableCell>
                    </TableRow>,
                  );
                }
                lignes.push(
                  <TableRow key={cle}>
                    <TableCell>{libelle}</TableCell>
                    {colonnes.map((c) => {
                      const v = c[cle];
                      const ecart = valeurs.length > 1 && max !== min && mieuxHaut !== null;
                      const meilleur = ecart && v === (mieuxHaut ? max : min);
                      const moins = ecart && v === (mieuxHaut ? min : max);
                      return (
                        <TableCell key={c.label} align="center" sx={{
                          fontWeight: meilleur ? 700 : 400,
                          bgcolor: meilleur ? 'success.light' : moins ? 'warning.light' : undefined,
                          color: meilleur ? 'success.contrastText' : moins ? 'warning.contrastText' : undefined,
                        }}>
                          {format(v)}
                          {max > 0 && v !== null && v !== undefined && (
                            <Box sx={{ height: 4, mt: 0.5, borderRadius: 2, bgcolor: 'action.selected' }}>
                              <Box sx={{ height: 4, borderRadius: 2, width: `${Math.max(4, (100 * v) / max)}%`, bgcolor: meilleur ? 'success.dark' : 'primary.main', opacity: 0.8 }} />
                            </Box>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>,
                );
                return lignes;
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
