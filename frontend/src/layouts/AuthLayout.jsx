import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

function AuthLayout() {
  const location = useLocation();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent',
        '& > *': { flex: 1 },
      }}
    >
      {/* initial actif : on veut l'animation d'entree meme au 1er montage
          (ex. en arrivant de la landing page). */}
      <AnimatePresence mode="wait" initial={true}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}

export default AuthLayout;
