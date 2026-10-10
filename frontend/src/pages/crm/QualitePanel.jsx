import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Chip, Paper, Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Alert,
  Stack, LinearProgress, Tooltip, Pagination,
} from '@mui/material';
import crmAPI from '../../services/crmAPI';

const PERIODES = [
  { jours: 30, label: 'Créées sur 30 jours' },
  { jours: 90, label: '3 mois' },
  { jours: 365, label: '1 an' },
  { jours: 0, label: 'Toutes les fiches' },
];

const titre = (nom) => (nom || '')
  .toLowerCase().replace(/(^|\s|-)(\S)/g, (_, a, b) => a + b.toUpperCase());
const pc = (n) => (n === null || n === undefined ? '—' : `${n} %`);
const couleur = (taux) => (taux === null || taux === undefined ? 'inherit' : taux >= 95 ? 'success' : taux >= 80 ? 'warning' : 'error');
const couleurTexte = (taux) => (taux === null || taux === undefined ? 'text.secondary'
  : taux >= 95 ? 'success.main' : taux >= 80 ? 'warning.main' : 'error.main');

const SOURCE = {
  exact: '',
  mixed: ' (en partie déduit)',
  deduced: ' (déduit : 1re facture)',
  unknown: '',
};

function Kpi({ valeur, libelle, couleurValeur, aide }) {
  const corps = (
    <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center', flex: '1 1 140px', minWidth: 130 }}>
      <Typography variant="h5" fontWeight={800} color={couleurValeur || 'primary.main'} lineHeight={1.1}>{valeur}</Typography>
      <Typography variant="caption" color="text.secondary">{libelle}</Typography>
    </Paper>
  );
  return aide ? <Tooltip title={aide}>{corps}</Tooltip> : corps;
}

function Carte({ titre: t, note, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, overflowX: 'auto' }}>
      <Typography variant="subtitle2" fontWeight={700} mb={0.75}>{t}</Typography>
      {children}
      {note && <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>{note}</Typography>}
    </Paper>
  );
}

/**
 * Qualité des fiches patients : ce qui est bien renseigné, ce qui manque, et — pour les
 * administrateurs — qui a créé les fiches incomplètes. Un clic sur une information ou une
 * personne filtre la liste des fiches à compléter.
 */
export default function QualitePanel({ peutOuvrirDossier, onOuvrirPatient }) {
  const [jours, setJours] = useState(90);
  const [critere, setCritere] = useState('');
  const [agent, setAgent] = useState('');
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const params = { days: jours, page };
      if (critere) params.criterion = critere;
      if (agent) params.agent = agent;
      setDonnees(await crmAPI.getQuality(params));
    } catch (e) {
      setErreur('Impossible de charger la qualité des fiches.');
    } finally {
      setChargement(false);
    }
  }, [jours, critere, agent, page]);

  useEffect(() => { charger(); }, [charger]);

  const filtrer = (patch) => { setPage(1); if ('critere' in patch) setCritere(patch.critere); if ('agent' in patch) setAgent(patch.agent); };

  if (chargement && !donnees) return <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>;
  if (erreur && !donnees) return <Alert severity="error">{erreur}</Alert>;
  if (!donnees) return null;

  const d = donnees;
  const libelleCritere = (c) => (d.criteria.find((x) => x.code === c) || {}).label || c;
  const libelleAgent = (a) => ((d.by_agent || []).find((x) => x.id === a) || {}).label || 'cette personne';
  const nbPages = Math.max(Math.ceil(d.to_fix.count / d.to_fix.page_size), 1);

  return (
    <Stack spacing={1.5} sx={{ opacity: chargement ? 0.6 : 1, transition: 'opacity .15s' }}>
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
        {PERIODES.map((p) => (
          <Chip key={p.jours} clickable label={p.label} onClick={() => { setJours(p.jours); setPage(1); }}
            color={jours === p.jours ? 'primary' : 'default'} variant={jours === p.jours ? 'filled' : 'outlined'} />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Kpi valeur={d.total} libelle="fiches créées" />
        <Kpi valeur={pc(d.complete_rate)} libelle="fiches complètes" couleurValeur={couleurTexte(d.complete_rate)}
          aide={`${d.complete} fiche(s) sans aucun manque`} />
        <Kpi valeur={pc(d.score_rate)} libelle="des informations renseignées" couleurValeur={couleurTexte(d.score_rate)} />
        <Kpi valeur={d.to_fix.count} libelle={critere || agent ? 'à compléter (filtre)' : 'fiches à compléter'} couleurValeur="warning.main" />
        <Kpi valeur={d.duplicates_count} libelle="doublons possibles" couleurValeur={d.duplicates_count ? 'error.main' : 'success.main'} />
      </Box>

      <Carte
        titre="Ce qui est bien renseigné, ce qui manque"
        note={`Touchez une ligne pour voir les fiches concernées. La provenance ne compte que pour les fiches créées depuis le ${new Date(d.provenance_since).toLocaleDateString('fr-FR')}. ${d.approximate_birthdates} date(s) de naissance au 1er janvier : souvent une date approximative.`}
      >
        <Stack spacing={0.75}>
          {d.criteria.map((c) => {
            const actif = critere === c.code;
            return (
              <Box key={c.code} display="flex" alignItems="center" gap={1}
                onClick={() => c.applicable && filtrer({ critere: actif ? '' : c.code })}
                sx={{ cursor: c.applicable ? 'pointer' : 'default', borderRadius: 1, px: 0.5,
                  bgcolor: actif ? 'action.selected' : 'transparent', '&:hover': { bgcolor: c.applicable ? 'action.hover' : 'transparent' } }}>
                <Typography variant="body2" sx={{ width: 160, flexShrink: 0, fontWeight: actif ? 700 : 400 }}>{c.label}</Typography>
                {c.applicable ? (
                  <>
                    <LinearProgress variant="determinate" value={c.rate || 0} color={couleur(c.rate)} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
                    <Typography variant="body2" fontWeight={700} sx={{ width: 70, textAlign: 'right', flexShrink: 0 }}>{pc(c.rate)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 150, flexShrink: 0 }}>
                      {c.missing ? `${c.missing} manquant${c.missing > 1 ? 's' : ''}` : ''}
                      {c.missing && c.invalid ? ' · ' : ''}
                      {c.invalid ? `${c.invalid} invalide${c.invalid > 1 ? 's' : ''}` : ''}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">pas encore concernée sur cette période</Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      </Carte>

      {d.by_agent && (
        <Carte
          titre="Par qui ?"
          note="Qui a créé la fiche. Pour les fiches anciennes, c'est déduit de la personne qui a fait la première facture du patient ; à partir de maintenant, l'auteur exact est enregistré. Touchez une personne pour voir ses fiches à compléter."
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Personne</TableCell>
                <TableCell align="right">Fiches</TableCell>
                <TableCell align="right">Complètes</TableCell>
                <TableCell align="right">Infos renseignées</TableCell>
                {d.criteria.filter((c) => c.applicable).map((c) => (
                  <TableCell key={c.code} align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={`${c.label} : nombre de fiches où c'est manquant ou invalide`}><span>{c.label.split(' ')[0]}</span></Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {d.by_agent.map((a) => {
                const actif = agent === a.id;
                return (
                  <TableRow key={a.id} hover selected={actif} sx={{ cursor: 'pointer' }}
                    onClick={() => filtrer({ agent: actif ? '' : a.id })}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{a.label}</Typography>
                      {SOURCE[a.source] && <Typography variant="caption" color="text.secondary">{SOURCE[a.source].trim()}</Typography>}
                    </TableCell>
                    <TableCell align="right">{a.fiches}</TableCell>
                    <TableCell align="right" sx={{ color: couleurTexte(a.complete_rate), fontWeight: 700 }}>{pc(a.complete_rate)}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                        <LinearProgress variant="determinate" value={a.score_rate || 0} color={couleur(a.score_rate)} sx={{ width: 70, height: 8, borderRadius: 4 }} />
                        <Typography variant="body2" fontWeight={700} sx={{ color: couleurTexte(a.score_rate), minWidth: 52, textAlign: 'right' }}>{pc(a.score_rate)}</Typography>
                      </Box>
                    </TableCell>
                    {d.criteria.filter((c) => c.applicable).map((c) => (
                      <TableCell key={c.code} align="right" sx={{ color: a.missing[c.code] ? 'error.main' : 'text.disabled', fontWeight: a.missing[c.code] ? 700 : 400 }}>
                        {a.missing[c.code] || '·'}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Carte>
      )}

      <Carte titre="Fiches à compléter" note={peutOuvrirDossier ? 'Touchez un nom pour ouvrir la fiche et la compléter.' : null}>
        {(critere || agent) && (
          <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
            {critere && <Chip size="small" color="primary" label={`Manque : ${libelleCritere(critere)}`} onDelete={() => filtrer({ critere: '' })} />}
            {agent && <Chip size="small" color="primary" label={`Créées par ${libelleAgent(agent)}`} onDelete={() => filtrer({ agent: '' })} />}
          </Stack>
        )}
        {d.to_fix.results.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Aucune fiche à compléter. 👍</Typography>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Créée le</TableCell>
                  {d.by_agent && <TableCell>Par</TableCell>}
                  <TableCell>Note</TableCell>
                  <TableCell>Ce qui manque</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {d.to_fix.results.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}
                        sx={{ cursor: peutOuvrirDossier ? 'pointer' : 'default', '&:hover': peutOuvrirDossier ? { textDecoration: 'underline' } : {} }}
                        onClick={peutOuvrirDossier ? () => onOuvrirPatient(p.id) : undefined}>
                        {titre(p.name)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{[p.patient_number, p.phone].filter(Boolean).join(' · ')}</Typography>
                    </TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString('fr-FR')}</TableCell>
                    {d.by_agent && (
                      <TableCell>
                        {p.created_by}
                        {p.created_by_source === 'deduced' && <Typography variant="caption" color="text.secondary" display="block">déduit</Typography>}
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 700, color: p.score / p.max >= 0.8 ? 'warning.main' : 'error.main' }}>{p.score}/{p.max}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {p.missing.map((m) => (
                          <Chip key={m.code} size="small" color={m.state === 'invalid' ? 'warning' : 'error'} variant="outlined"
                            label={m.state === 'invalid' ? `${m.label} invalide` : m.label} sx={{ height: 20, fontSize: '0.68rem' }} />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {nbPages > 1 && (
              <Box display="flex" justifyContent="center" mt={1.5}>
                <Pagination count={nbPages} page={page} onChange={(_, v) => setPage(v)} color="primary" size="small" />
              </Box>
            )}
          </>
        )}
      </Carte>

      <Carte titre="Doublons possibles" note="Mêmes nom et prénom (même dans le désordre). La fusion de deux fiches se fait depuis la liste des patients.">
        {d.duplicates.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Aucun doublon repéré.</Typography>
        ) : (
          <Stack spacing={1}>
            {d.duplicates.map((g) => (
              <Box key={g.key} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {g.patients.map((p) => (
                  <Box key={p.id} display="flex" gap={1.5} flexWrap="wrap" alignItems="baseline">
                    <Typography variant="body2" fontWeight={600}
                      sx={{ cursor: peutOuvrirDossier ? 'pointer' : 'default' }}
                      onClick={peutOuvrirDossier ? () => onOuvrirPatient(p.id) : undefined}>
                      {titre(p.name)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[p.patient_number, p.phone, `créée le ${new Date(p.created_at).toLocaleDateString('fr-FR')}`].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ))}
          </Stack>
        )}
      </Carte>
    </Stack>
  );
}
