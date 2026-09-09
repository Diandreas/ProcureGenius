import React, { isValidElement } from 'react';
import { Card, CardContent, Typography, Box, alpha } from '@mui/material';
import { motion } from 'framer-motion';

// Carte de statistique.
// Epuration : la carte est une surface neutre (blanche), et la couleur ne sert
// plus de lavis de fond sur toute la carte mais d'accent porte par l'icone et
// la valeur. Le code couleur par indicateur est donc conserve a l'identique
// (on reconnait toujours "CA Laboratoire" a son rouge), mais 12 aplats pastels
// ne se disputent plus l'ecran sur le tableau de bord.
const StatCard = ({ title, value, icon, color, onClick, subtitle, loading }) => {
  const content = (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': onClick ? { borderColor: alpha(color, 0.4) } : {},
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
          {icon && (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                flexShrink: 0,
                bgcolor: alpha(color, 0.1),
                color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
          <Typography variant="h4" fontWeight="700" color={color}>
            ...
          </Typography>
        ) : (
          <>
            {typeof value === 'string' || typeof value === 'number' ? (
              <Typography variant="h4" fontWeight="700" color={color}>
                {value}
              </Typography>
            ) : isValidElement(value) ? (
              <Box sx={{ display: 'flex', alignItems: 'center', color, fontSize: '2rem', fontWeight: 700 }}>
                {value}
              </Box>
            ) : null}
            {subtitle && (
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {subtitle}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  // On n'anime que ce qui est reellement cliquable : une carte purement
  // informative qui grossit au survol n'apporte rien et agite la page.
  return onClick ? (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} style={{ height: '100%' }}>
      {content}
    </motion.div>
  ) : (
    <Box sx={{ height: '100%' }}>{content}</Box>
  );
};

export default StatCard;
