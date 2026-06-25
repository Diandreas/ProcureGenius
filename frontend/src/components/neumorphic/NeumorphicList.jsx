import React from 'react';
import { Box, Grid, Typography, IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, Close } from '@mui/icons-material';
import { motion } from 'framer-motion';

// ─── Ombres neumorphiques partagées (charte #cdd4e0 / #fff) ──────────────────
const shadowRaised = (th) => th.palette.mode === 'light'
  ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff'
  : '6px 6px 16px #14191f, -6px -6px 16px #283041';
const shadowRaisedSm = (th) => th.palette.mode === 'light'
  ? '5px 5px 14px #cdd4e0, -5px -5px 14px #ffffff'
  : '5px 5px 14px #14191f, -5px -5px 14px #283041';
const shadowHover = (th) => th.palette.mode === 'light'
  ? '10px 10px 24px #c4cddc, -10px -10px 24px #ffffff'
  : '10px 10px 24px #11161c, -10px -10px 24px #2a3344';
const shadowInset = (th) => th.palette.mode === 'light'
  ? 'inset 4px 4px 10px #cdd4e0, inset -4px -4px 10px #ffffff'
  : 'inset 4px 4px 10px #14191f, inset -4px -4px 10px #283041';

/**
 * Rangée de tuiles KPI neumorphiques cliquables (filtres rapides).
 * kpis: [{ key, label, value, sub, color }] — key '' = tuile "total" (pleine largeur mobile)
 */
export function NeumorphicKpis({ kpis, activeKey, onSelect }) {
  return (
    <Grid container spacing={{ xs: 1.25, sm: 2 }} sx={{ mb: 2.5 }}>
      {kpis.map((kpi) => {
        const isTotal = kpi.key === '';
        const active = activeKey === kpi.key && !isTotal;
        return (
          <Grid item xs={isTotal ? 12 : 3} sm={4} md={isTotal ? 4 : 2} key={kpi.label}>
            <Box
              onClick={() => !isTotal && onSelect?.(kpi.key)}
              sx={{
                cursor: isTotal ? 'default' : 'pointer',
                p: { xs: 1.1, sm: 2 },
                borderRadius: { xs: 3, sm: 4 },
                textAlign: { xs: 'center', sm: 'left' },
                bgcolor: 'background.paper',
                transition: 'box-shadow 0.25s, transform 0.25s',
                boxShadow: (th) => active ? shadowInset(th) : shadowRaisedSm(th),
                '&:hover': !isTotal && !active ? { transform: 'translateY(-2px)' } : {},
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: { xs: 0.5, sm: 1 }, mb: { xs: 0.4, sm: 0.75 } }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: kpi.color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.7rem' }, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {kpi.label}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.6rem' }, lineHeight: 1, color: 'text.primary', letterSpacing: '-0.01em' }}>
                {kpi.value}
              </Typography>
              {kpi.sub && (
                // La tuile "total" affiche son sous-titre (ex. nombre total de
                // commandes) y compris sur mobile ; les petites tuiles de statut
                // le masquent en xs pour rester compactes.
                <Typography sx={{ display: { xs: isTotal ? 'block' : 'none', sm: 'block' }, fontSize: { xs: '0.62rem', sm: '0.68rem' }, color: 'text.disabled', mt: 0.5 }}>{kpi.sub}</Typography>
              )}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

/** Barre de recherche neumorphique (inset, pilule). `right` = contenu optionnel à droite. */
export function NeumorphicSearch({ value, onChange, placeholder = 'Rechercher…', right = null }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2.5, flexWrap: 'wrap' }}>
      <Box sx={{
        flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 1,
        px: 2, py: 1, borderRadius: 999, bgcolor: 'background.paper',
        boxShadow: (th) => shadowInset(th),
      }}>
        <Search sx={{ fontSize: 20, color: 'text.disabled' }} />
        <Box
          component="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          sx={{
            flex: 1, border: 'none', outline: 'none', bgcolor: 'transparent',
            fontSize: '0.9rem', color: 'text.primary', fontFamily: 'inherit',
            '&::placeholder': { color: 'text.disabled' },
          }}
        />
        {value && (
          <IconButton size="small" onClick={() => onChange('')} sx={{ p: 0.25 }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
      {right}
    </Box>
  );
}

/**
 * Carte d'entité neumorphique générique (même look que les factures).
 * Props: accentColor, code, status:{label,color}, title, subtitle, amount,
 *        footer, actions (node), onClick, index
 */
export function NeumorphicCard({ accentColor = '#94a3b8', code, status, title, subtitle, amount, footer, actions, badge, onClick, index = 0 }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.035, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      style={{ height: '100%' }}
    >
      <Box
        onClick={onClick}
        sx={{
          cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column',
          p: { xs: 1.5, sm: 2.25 }, borderRadius: { xs: 3, sm: 4 },
          bgcolor: 'background.paper', position: 'relative', overflow: 'hidden',
          transition: 'box-shadow 0.3s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: (th) => shadowRaised(th),
          '&:hover': { boxShadow: (th) => shadowHover(th), '& .neu-actions': { opacity: 1 } },
        }}
      >
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: accentColor, opacity: 0.9 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 1.5 }, mt: 0.5, gap: 1 }}>
          {code != null && (
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: { xs: '0.68rem', sm: '0.78rem' }, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {code}
            </Typography>
          )}
          {/* Badge (ex. "a synchroniser") : toujours visible, meme sur mobile. */}
          {badge && <Box sx={{ ml: code != null ? 0 : 'auto', flexShrink: 0 }}>{badge}</Box>}
          {status && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: { xs: 0.6, sm: 1 }, py: 0.3, borderRadius: 999, bgcolor: alpha(status.color, 0.12), flexShrink: 0, ml: 'auto' }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: status.color }} />
              <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.62rem', fontWeight: 700, color: status.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {status.label}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, mb: { xs: 1, sm: 1.5 } }}>
          <Typography sx={{ fontWeight: 600, fontSize: { xs: '0.82rem', sm: '0.95rem' }, color: 'text.primary', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {amount != null && (
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.45rem' }, color: 'text.primary', lineHeight: 1, mb: { xs: 0.75, sm: 1.25 }, letterSpacing: '-0.01em' }}>
            {amount}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: { xs: 0.75, sm: 1.25 }, borderTop: (th) => `1px solid ${alpha(th.palette.divider, 0.5)}` }}>
          <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {footer}
          </Typography>
          {actions && (
            <Box className="neu-actions" sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, opacity: 0, transition: 'opacity 0.2s' }}>
              {actions}
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
}

/**
 * Panneau neumorphique générique (pour les pages de détail) — conteneur surélevé,
 * coins arrondis, ombre douce. `accent` ajoute une fine barre de couleur en haut.
 */
export function NeumorphicPanel({ children, accent, sx = {}, ...props }) {
  return (
    <Box
      {...props}
      sx={{
        position: 'relative', borderRadius: 4, bgcolor: 'background.paper',
        p: { xs: 2, sm: 2.5 }, overflow: 'hidden',
        boxShadow: (th) => shadowRaised(th),
        ...sx,
      }}
    >
      {accent && <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: accent, opacity: 0.9 }} />}
      {children}
    </Box>
  );
}

export const neuShadows = { shadowRaised, shadowRaisedSm, shadowHover, shadowInset };
