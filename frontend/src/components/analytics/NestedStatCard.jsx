import React from 'react';
import { Card, CardContent, Typography, Box, Stack, Divider, alpha } from '@mui/material';
import { motion } from 'framer-motion';

// Carte de statistique avec sous-lignes imbriquées — pour un total qui EST composé
// de plusieurs sous-montants (ex: CA Laboratoire = Examens + Kits, dont Sous-traitance).
// Ne jamais l'utiliser pour deux montants indépendants : les enfants doivent être de
// vrais sous-ensembles du parent, sinon la carte donne l'illusion d'une inclusion
// qui n'existe pas en base.
const NestedStatCard = ({ title, value, icon, color, loading, breakdownItems = [], footnote }) => (
  <motion.div whileHover={{ scale: 1.01 }} style={{ height: '100%' }}>
    <Card
      sx={{
        height: '100%',
        background: theme => `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: '1.5px solid transparent',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && (
            <Box sx={{ color, mr: 1, display: 'flex', alignItems: 'center' }}>
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
  </motion.div>
);

export default NestedStatCard;
