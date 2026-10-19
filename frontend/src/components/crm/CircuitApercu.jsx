import React, { useEffect, useState } from 'react';
import {
  Accordion, AccordionSummary, AccordionDetails, Box, Chip, CircularProgress, Stack, Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import crmAPI from '../../services/crmAPI';
import CircuitSchema from '../../pages/crm/CircuitSchema';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const CLE = 'crm-circuit-ouvert';

function lireOuvert() {
  try { return window.localStorage.getItem(CLE) !== '0'; } catch (e) { return true; }
}

/**
 * Sur la page Suivi patients : le circuit des actions des 6 derniers mois (par service, sans la
 * pharmacie), et les circuits les plus suivis. Le détail est dans Statistiques > Parcours patients.
 */
export default function CircuitApercu() {
  const [ouvert, setOuvert] = useState(lireOuvert);
  const [circuit, setCircuit] = useState(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (!ouvert || circuit) return undefined;
    let vivant = true;
    const fin = new Date();
    const debut = new Date();
    debut.setDate(debut.getDate() - 179);
    setChargement(true);
    crmAPI.getJourney({ start: iso(debut), end: iso(fin), level: 'service', pharmacy: '0' })
      .then((d) => { if (vivant) setCircuit(d.circuit); })
      .catch(() => { if (vivant) setCircuit({ columns: [] }); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [ouvert, circuit]);

  const basculer = (_, v) => {
    setOuvert(v);
    try { window.localStorage.setItem(CLE, v ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
  };

  return (
    <Accordion expanded={ouvert} onChange={basculer} disableGutters variant="outlined" sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>Circuit des actions des patients</Typography>
          <Typography variant="caption" color="text.secondary">
            6 derniers mois · 1re action, puis la 2e, la 3e… · détail dans Statistiques &gt; Parcours patients
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {chargement && <Box display="flex" justifyContent="center" p={3}><CircularProgress size={28} /></Box>}
        {!chargement && circuit && (
          <>
            <CircuitSchema circuit={circuit} />
            {(circuit.dominants || []).length > 0 && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>Circuits les plus suivis</Typography>
                {circuit.dominants.map((d) => (
                  <Box key={d.start} display="flex" gap={0.75} alignItems="center" flexWrap="wrap">
                    {d.steps.map((e, i) => (
                      <React.Fragment key={`${e.step}-${i}`}>
                        {i > 0 && <Typography variant="caption" color="text.secondary">→ {e.share} %</Typography>}
                        <Chip size="small" variant={i === 0 ? 'filled' : 'outlined'} color={i === 0 ? 'primary' : 'default'}
                          label={`${i + 1}. ${e.step} (${e.patients})`} />
                      </React.Fragment>
                    ))}
                  </Box>
                ))}
              </Stack>
            )}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
