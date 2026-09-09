import React from 'react';
import { Card, CardContent, Typography, Box, Stack, Divider, alpha } from '@mui/material';

// Carte de statistique avec sous-lignes imbriquées — pour un total qui EST composé
// de plusieurs sous-montants (ex: CA Laboratoire = Examens + Kits, dont Sous-traitance).
// Ne jamais l'utiliser pour deux montants indépendants : les enfants doivent être de
// vrais sous-ensembles du parent, sinon la carte donne l'illusion d'une inclusion
// qui n'existe pas en base.
const NestedStatCard = ({ title, value, icon, color, loading, breakdownItems = [], footnote }) => (
  <Box sx={{ height: '100%' }}>
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
          {icon && (
            <Box
              sx={{
                width: 32, height: 32, borderRadius: 2, flexShrink: 0,
                bgcolor: alpha(color, 0.1), color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                '& .MuiSvgIcon-root': { fontSize: 18 },
              }}
            >
              {icon}
            </Box>
          )}
          <Typography variant="subtitle2" color="text.secondary" fontWeight="600">
            {title}
          </Typography>
        </Box>

        {loading ? (
          <Typography variant="h4" fontWeight="700" color={color}>...</Typography>
        ) : (
          <>
            <Typography variant="h4" fontWeight="700" color={color}>
              {value}
            </Typography>

            {breakdownItems.length > 0 && (
              <>
                <Divider sx={{ my: 1.25 }} />
                <Stack spacing={0.5}>
                  {breakdownItems.map((child, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="caption" color="text.secondary">
                        {child.indent ? `↳ ${child.label}` : child.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {child.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            )}

            {footnote && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1} sx={{ fontStyle: 'italic' }}>
                {footnote}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  </Box>
);

export default NestedStatCard;
