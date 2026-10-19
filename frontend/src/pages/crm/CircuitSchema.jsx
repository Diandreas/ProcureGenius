import React, { useMemo, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * Schéma du circuit des actions : colonne 1 = 1re action du patient, colonne 2 = la suivante, etc.
 * Chaque bloc est une action (hauteur = nombre de patients, même échelle partout : on voit qui
 * continue) ; les bandes montrent qui passe de quelle action à quelle autre.
 * Couleur = l'action (la même d'une colonne à l'autre), jamais son rang ; « Autres » en gris.
 */
const CLAIR = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const SOMBRE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
const RANG = ['1re', '2e', '3e', '4e', '5e'];

const L = 980;          // largeur logique (viewBox)
const HAUT = 340;       // hauteur de la colonne la plus pleine
const ECART = 8;        // espace entre deux blocs d'une colonne
const BARRE = 14;       // largeur d'un bloc
const ENTETE = 46;
const LIGNE = 16;       // place minimale d'un bloc : son libellé ne chevauche jamais le suivant

export default function CircuitSchema({ circuit }) {
  const theme = useTheme();
  const sombre = theme.palette.mode === 'dark';
  const [survol, setSurvol] = useState(null);

  const plan = useMemo(() => {
    const cols = circuit?.columns || [];
    if (!cols.length) return null;
    const couleurs = {};
    let i = 0;
    cols.forEach((c) => c.nodes.forEach((n) => {
      if (n.step !== 'Autres' && !(n.step in couleurs)) {
        couleurs[n.step] = i < CLAIR.length ? i : null;
        i += 1;
      }
    }));
    const plein = Math.max(...cols.map((c) => c.nodes.reduce((t, n) => t + n.patients, 0)));
    const nbBlocs = Math.max(...cols.map((c) => c.nodes.length));
    const echelle = (HAUT - (ECART + LIGNE) * (nbBlocs - 1)) / plein;
    const pas = L / cols.length;
    const blocs = {};
    cols.forEach((c, k) => {
      let y = ENTETE;
      c.nodes.forEach((n) => {
        const h = Math.max(3, n.patients * echelle);
        blocs[`${k}|${n.step}`] = { x: k * pas + 4, y, h, n, sortie: 0, entree: 0, k };
        y += Math.max(h, LIGNE) + ECART;
      });
    });
    const bandes = [];
    (circuit.flows || []).forEach((f) => {
      const a = blocs[`${f.position - 1}|${f.from}`];
      const b = blocs[`${f.position}|${f.to}`];
      if (!a || !b) return;
      const ep = Math.max(1, f.patients * echelle);
      const y1 = a.y + a.sortie;
      const y2 = b.y + b.entree;
      a.sortie += ep;
      b.entree += ep;
      bandes.push({ ...f, x1: a.x + BARRE, x2: b.x, y1, y2, ep });
    });
    const hauteur = Math.max(...Object.values(blocs).map((b) => b.y + Math.max(b.h, LIGNE))) + 12;
    return { cols, couleurs, blocs, bandes, hauteur, pas };
  }, [circuit]);

  if (!plan) return <Typography variant="body2" color="text.secondary">Pas encore assez de passages.</Typography>;

  const palette = sombre ? SOMBRE : CLAIR;
  const gris = sombre ? '#6b6b68' : '#a3a3a0';
  const couleur = (step) => (step === 'Autres' || plan.couleurs[step] == null ? gris : palette[plan.couleurs[step]]);
  const encre = theme.palette.text.primary;
  const encre2 = theme.palette.text.secondary;

  const chemin = (b) => {
    const mx = (b.x1 + b.x2) / 2;
    return `M${b.x1},${b.y1} C${mx},${b.y1} ${mx},${b.y2} ${b.x2},${b.y2}`
      + ` L${b.x2},${b.y2 + b.ep} C${mx},${b.y2 + b.ep} ${mx},${b.y1 + b.ep} ${b.x1},${b.y1 + b.ep} Z`;
  };

  return (
    <Box sx={{ position: 'relative', overflowX: 'auto' }} onMouseLeave={() => setSurvol(null)}>
      <svg viewBox={`0 0 ${L} ${plan.hauteur}`} style={{ width: '100%', minWidth: 760, display: 'block' }}
        role="img" aria-label="Circuit des actions des patients, de la 1re à la 5e action">
        {plan.cols.map((c, k) => (
          <g key={c.position}>
            <text x={k * plan.pas + 4} y={16} fontSize={13} fontWeight={700} fill={encre}>
              {RANG[k]} action
            </text>
            <text x={k * plan.pas + 4} y={33} fontSize={11} fill={encre2}>
              {c.patients} patients{c.stopped_here ? ` · ${c.stopped_here} s'arrêtent là` : ''}
            </text>
          </g>
        ))}
        {plan.bandes.map((b) => {
          const actif = survol && survol.cle === `${b.position}|${b.from}|${b.to}`;
          return (
            <path key={`${b.position}|${b.from}|${b.to}`} d={chemin(b)} fill={couleur(b.from)}
              fillOpacity={actif ? 0.6 : 0.28}
              onMouseMove={(e) => setSurvol({
                cle: `${b.position}|${b.from}|${b.to}`, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY,
                texte: `${b.from} → ${b.to} : ${b.patients} patient${b.patients > 1 ? 's' : ''}`,
              })} />
          );
        })}
        {Object.values(plan.blocs).map((b) => (
          <g key={`${b.k}|${b.n.step}`}
            onMouseMove={(e) => setSurvol({
              cle: `n${b.k}|${b.n.step}`, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY,
              texte: `${RANG[b.k]} action : ${b.n.step} — ${b.n.patients} patient${b.n.patients > 1 ? 's' : ''}`,
            })}>
            <rect x={b.x} y={b.y} width={BARRE} height={b.h} rx={3} fill={couleur(b.n.step)}
              stroke={theme.palette.background.paper} strokeWidth={1} />
            <text x={b.x + BARRE + 6} y={b.y + Math.min(b.h / 2, 12) + 4} fontSize={11.5} fill={encre}>
              {b.n.step.length > 26 ? `${b.n.step.slice(0, 25)}…` : b.n.step}
              <tspan fill={encre2}>{` ${b.n.patients}`}</tspan>
            </text>
          </g>
        ))}
      </svg>
      {survol && (
        <Box sx={{
          position: 'absolute', left: survol.x + 12, top: survol.y + 12, pointerEvents: 'none',
          bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.5,
          boxShadow: 2, fontSize: 12, maxWidth: 280,
        }}>
          {survol.texte}
        </Box>
      )}
    </Box>
  );
}
