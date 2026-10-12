/**
 * TutorialButton - Bouton pour lancer le tutoriel interactif
 * 
 * Peut être placé dans le menu, le header ou n'importe où dans l'interface.
 */
import React, { useState, useEffect } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import {
  School as TutorialIcon,
  PlayArrow,
  Refresh,
  HelpOutline,
  VideoLibrary,
  MenuBook,
  Support,
  Keyboard,
  LiveHelp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TutorialButton = ({
  variant = 'icon', // 'icon', 'button', 'menu-item'
  showBadge = false,
  size = 'medium',
  color = 'default',
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const [anchorEl, setAnchorEl] = useState(null);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('tutorial_completed') === 'true';
    setTutorialCompleted(completed);
  }, []);

  const handleStartTutorial = () => {
    setAnchorEl(null);
    // Déclencher l'événement pour le TutorialProvider
    window.dispatchEvent(new CustomEvent('start-tutorial'));
  };

  const handleResetTutorial = () => {
    setAnchorEl(null);
    localStorage.removeItem('tutorial_completed');
    localStorage.removeItem('getting_started_dismissed');
    setTutorialCompleted(false);
    // Recharger pour réinitialiser les états
    window.location.reload();
  };

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Version Menu Item (pour le menu déroulant)
  if (variant === 'menu-item') {
    return (
      <MenuItem onClick={handleStartTutorial}>
        <ListItemIcon>
          <TutorialIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={t('onboarding:tutorial.button.tutorial')} />
        {!tutorialCompleted && (
          <Badge color="primary" variant="dot" sx={{ ml: 1 }} />
        )}
      </MenuItem>
    );
  }

  // Version Bouton texte
  if (variant === 'button') {
    return (
      <>
        <Button
          variant="outlined"
          startIcon={<TutorialIcon />}
          onClick={handleOpenMenu}
          size={size}
          color={color}
        >
          {t('onboarding:tutorial.button.help')}
          {!tutorialCompleted && (
            <Badge color="primary" variant="dot" sx={{ ml: 1 }} />
          )}
        </Button>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleStartTutorial}>
            <ListItemIcon>
              <PlayArrow fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary={t('onboarding:tutorial.button.launch')}
              secondary={t('onboarding:tutorial.button.guidedTour')}
            />
          </MenuItem>
          
          {tutorialCompleted && (
            <MenuItem onClick={handleResetTutorial}>
              <ListItemIcon>
                <Refresh fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={t('onboarding:tutorial.button.replay')}
                secondary={t('onboarding:tutorial.button.restartFromStart')}
              />
            </MenuItem>
          )}
          
          <Divider />

          <MenuItem onClick={() => { handleCloseMenu(); navigate('/help'); }}>
            <ListItemIcon>
              <MenuBook fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={t('onboarding:tutorial.button.documentation')}
              secondary={t('onboarding:tutorial.button.helpCenter')}
            />
          </MenuItem>

          <MenuItem onClick={() => { handleCloseMenu(); navigate('/help/faq'); }}>
            <ListItemIcon>
              <LiveHelp fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('onboarding:tutorial.button.faq')} />
          </MenuItem>

          <MenuItem onClick={() => { handleCloseMenu(); navigate('/help/shortcuts'); }}>
            <ListItemIcon>
              <Keyboard fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('onboarding:tutorial.button.shortcuts')} />
          </MenuItem>

          <Divider />

          <MenuItem onClick={() => window.open('mailto:support@procuregenius.com', '_blank')}>
            <ListItemIcon>
              <Support fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('onboarding:tutorial.button.contactSupport')} />
          </MenuItem>
        </Menu>
      </>
    );
  }

  // Version Icône (par défaut)
  return (
    <>
      <Tooltip title={t('onboarding:tutorial.button.tooltip')}>
        <IconButton
          onClick={handleOpenMenu}
          size={size}
          color={color}
          data-tutorial="help-button"
          sx={{
            p: { xs: 0.75, sm: 1 },
            borderRadius: { xs: '10px', sm: '12px' },
          }}
        >
          <Badge
            color="primary"
            variant="dot"
            invisible={tutorialCompleted}
          >
            <HelpOutline sx={{ fontSize: { xs: 18, sm: 22 } }} />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { minWidth: 250 }
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('onboarding:tutorial.button.needHelp')}
          </Typography>
        </Box>
        
        <MenuItem onClick={handleStartTutorial}>
          <ListItemIcon>
            <PlayArrow fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {t('onboarding:tutorial.button.launch')}
                {!tutorialCompleted && (
                  <Badge color="error" badgeContent={t('onboarding:tutorial.button.new')} sx={{ 
                    '& .MuiBadge-badge': { 
                      fontSize: '0.6rem', 
                      height: 16, 
                      minWidth: 16,
                      right: -30,
                    } 
                  }} />
                )}
              </Box>
            }
            secondary={t('onboarding:tutorial.button.interactiveTour')}
          />
        </MenuItem>
        
        {tutorialCompleted && (
          <MenuItem onClick={handleResetTutorial}>
            <ListItemIcon>
              <Refresh fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary={t('onboarding:tutorial.button.replay')}
              secondary={t('onboarding:tutorial.button.restartTour')}
            />
          </MenuItem>
        )}
        
        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={() => { handleCloseMenu(); navigate('/help'); }}>
          <ListItemIcon>
            <MenuBook fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={t('onboarding:tutorial.button.documentation')}
            secondary={t('onboarding:tutorial.button.helpCenter')}
          />
        </MenuItem>

        <MenuItem onClick={() => { handleCloseMenu(); navigate('/help/faq'); }}>
          <ListItemIcon>
            <LiveHelp fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('onboarding:tutorial.button.faq')} />
        </MenuItem>

        <MenuItem onClick={() => { handleCloseMenu(); navigate('/help/shortcuts'); }}>
          <ListItemIcon>
            <Keyboard fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('onboarding:tutorial.button.shortcuts')} />
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={() => { handleCloseMenu(); window.open('mailto:support@procuregenius.com', '_blank'); }}>
          <ListItemIcon>
            <Support fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('onboarding:tutorial.button.contactSupport')} />
        </MenuItem>
      </Menu>
    </>
  );
};

export default TutorialButton;

