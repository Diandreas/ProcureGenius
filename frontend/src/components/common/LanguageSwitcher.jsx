import React, { useState } from 'react';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { Check, Translate } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { LANGUES } from '../../i18n/config';
import { changeLanguage } from '../../store/slices/settingsSlice';

/**
 * Choix de la langue (en-tête de l'app et du site public).
 * Connecté : la langue est enregistrée dans le compte de la personne et la suit
 * sur tous ses appareils. Visiteur : gardée dans ce navigateur.
 */
export default function LanguageSwitcher({ sx }) {
  const { t, i18n } = useTranslation('navigation');
  const dispatch = useDispatch();
  const connecte = useSelector((state) => state.auth?.isAuthenticated);
  const [ancre, setAncre] = useState(null);
  const actuelle = (i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2);

  const choisir = (code) => {
    setAncre(null);
    if (code === actuelle) return;
    if (connecte) {
      dispatch(changeLanguage(code)); // applique et enregistre dans le compte
    } else {
      i18n.changeLanguage(code);
      try { localStorage.setItem('appLanguage', code); } catch { /* stockage bloqué */ }
    }
  };

  return (
    <>
      <Tooltip title={t('topBar.language')}>
        <Button
          onClick={(e) => setAncre(e.currentTarget)}
          startIcon={<Translate sx={{ fontSize: '18px !important' }} />}
          aria-label={t('topBar.language')}
          aria-haspopup="menu"
          sx={{
            minWidth: 0, px: 1, py: 0.5, borderRadius: '10px', color: 'text.secondary',
            fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase',
            '& .MuiButton-startIcon': { mr: 0.5 },
            ...sx,
          }}
        >
          {actuelle}
        </Button>
      </Tooltip>
      <Menu anchorEl={ancre} open={Boolean(ancre)} onClose={() => setAncre(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {LANGUES.map((l) => (
          <MenuItem key={l.code} selected={l.code === actuelle} onClick={() => choisir(l.code)} lang={l.code} sx={{ minWidth: 160 }}>
            <ListItemText primary={l.nom} />
            <ListItemIcon sx={{ minWidth: 0, ml: 2, visibility: l.code === actuelle ? 'visible' : 'hidden' }}>
              <Check fontSize="small" />
            </ListItemIcon>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
