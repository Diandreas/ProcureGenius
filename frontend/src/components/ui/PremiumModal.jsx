import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  useTheme,
  alpha,
  Fade,
  Slide,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />;
});

const PremiumModal = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  fullScreen = false,
  showCloseButton = true,
  headerActions,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : { xs: '20px', sm: '28px' },
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: isDark
            ? '0 24px 48px rgba(0,0,0,0.5), 0 12px 24px rgba(0,0,0,0.3)'
            : '0 24px 48px rgba(0,0,0,0.12), 0 12px 24px rgba(0,0,0,0.06)',
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          overflow: 'hidden',
        },
      }}
      sx={{
        backdropFilter: 'blur(8px)',
        '& .MuiBackdrop-root': {
          bgcolor: alpha(isDark ? '#000' : '#0f172a', 0.4),
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        {/* Header Gradient Accent */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            zIndex: 1,
          }}
        />

        <DialogTitle
          sx={{
            m: 0,
            p: { xs: 2, sm: 3 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              color: 'text.primary',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {headerActions}
            {showCloseButton && (
              <IconButton
                onClick={onClose}
                sx={{
                  color: 'text.secondary',
                  bgcolor: alpha(theme.palette.action.hover, 0.05),
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: 'error.main',
                    transform: 'rotate(90deg)',
                  },
                }}
              >
                <Close />
              </IconButton>
            )}
          </Box>
        </DialogTitle>

        <DialogContent
          sx={{
            p: { xs: 2, sm: 3 },
            // Scrollbar minimaliste
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              background: alpha(theme.palette.divider, 0.1),
              borderRadius: '10px',
              '&:hover': { background: alpha(theme.palette.divider, 0.2) },
            },
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </DialogContent>
      </Box>
    </Dialog>
  );
};

export default PremiumModal;
