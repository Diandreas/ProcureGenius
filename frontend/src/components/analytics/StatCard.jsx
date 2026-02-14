import React from 'react';
import { Card, CardContent, Typography, Box, alpha } from '@mui/material';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, color, onClick, subtitle, loading }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    style={{ height: '100%' }}
  >
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
        background: theme => `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: '1.5px solid',
        borderColor: 'transparent',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? {
          borderColor: color,
          boxShadow: `0 8px 20px ${alpha(color, 0.15)}`
        } : {}
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && <Box sx={{ color, mr: 1, fontSize: 28 }}>{icon}</Box>}
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
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', color, fontSize: '2rem', fontWeight: 700 }}>
                {value}
              </Box>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {subtitle}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export default StatCard;
