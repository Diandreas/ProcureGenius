import React from 'react';
import { motion } from 'framer-motion';
import { Box, useTheme, CircularProgress } from '@mui/material';
import { pulseVariant, spinnerVariant, skeletonWave } from '../../animations/variants/loading';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';

export const NeumorphicSkeleton = ({ variant = 'card', width, height }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const baseStyle = {
    background: isDark ? '#1e2530' : '#e6e9ef',
    boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'inset'),
    borderRadius: variant === 'circular' ? '50%' : '12px',
    width: width || '100%',
    height: height || (variant === 'card' ? 200 : variant === 'text' ? 20 : 40),
  };

  return (
    <motion.div
      variants={skeletonWave}
      animate="wave"
      style={baseStyle}
    />
  );
};

export const NeumorphicSpinner = ({ size = 40 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div
      variants={spinnerVariant}
      animate="spin"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `4px solid transparent`,
        borderTopColor: isDark ? '#3b82f6' : '#2563eb',
        borderRightColor: isDark ? '#3b82f6' : '#2563eb',
        boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft'),
      }}
    />
  );
};

export const NeumorphicProgress = ({ value = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        width: '100%',
        height: 8,
        borderRadius: '8px',
        boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'inset'),
        position: 'relative',
        overflow: 'hidden',
        background: isDark ? '#1e2530' : '#e6e9ef',
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          height: '100%',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          borderRadius: '8px',
        }}
      />
    </Box>
  );
};

export const PulsingDot = ({ delay = 0 }) => {
  const theme = useTheme();

  return (
    <motion.div
      variants={pulseVariant}
      animate="pulse"
      transition={{ delay }}
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: theme.palette.primary.main,
      }}
    />
  );
};

export const LoadingDots = () => {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <PulsingDot delay={0} />
      <PulsingDot delay={0.15} />
      <PulsingDot delay={0.3} />
    </Box>
  );
};

// Loading overlay avec neumorphism
export const NeumorphicLoadingOverlay = ({ loading, children }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ position: 'relative' }}>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? 'rgba(30, 37, 48, 0.8)' : 'rgba(230, 233, 239, 0.8)',
            borderRadius: '20px',
            zIndex: 10,
            backdropFilter: 'blur(4px)',
          }}
        >
          <Box
            sx={{
              p: 3,
              borderRadius: '20px',
              boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'medium'),
              background: isDark ? '#1e2530' : '#e6e9ef',
            }}
          >
            <CircularProgress />
          </Box>
        </motion.div>
      )}
      {children}
    </Box>
  );
};

export default {
  NeumorphicSkeleton,
  NeumorphicSpinner,
  NeumorphicProgress,
  PulsingDot,
  LoadingDots,
  NeumorphicLoadingOverlay,
};
