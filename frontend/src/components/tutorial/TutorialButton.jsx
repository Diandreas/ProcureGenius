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

const TutorialButton = ({
  variant = 'icon', // 'icon', 'button', 'menu-item'
  showBadge = false,
  size = 'medium',
  color = 'default',
}) => {
  const navigate = useNavigate();
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
        <ListItemText primary="Tutoriel" />
        {!tutorialCompleted && (
          <Badge color="primary" variant="dot" />
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
          Aide
          {!tutorialCompleted && (
            <Badge color="primary" variant="dot" />
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
              primary="Lancer le tutoriel"
              secondary="Visite guidée de l'application"
            />
          </MenuItem>
          
          {tutorialCompleted && (
            <MenuItem onClick={handleResetTutorial}>
              <ListItemIcon>
                <Refresh fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Revoir le tutoriel"
                secondary="Recommencer depuis le début"
              />
            </MenuItem>
          )}
          
          <Divider />

          <MenuItem onClick={() => { handleCloseMenu(); navigate('/help'); }}>
            <ListItemIcon>
              <MenuBook fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Documentation"
              secondary="Centre d'aide complet"
            />
          </MenuItem>

          <MenuItem onClick={() => { handleCloseMenu(); navigate('/help/faq'); }}>
            <ListItemIcon>
              <LiveHelp fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="FAQ" />
          </MenuItem>

          <MenuItem onClick={() => { handleCloseMenu(); navigate('/help/shortcuts'); }}>
            <ListItemIcon>
              <Keyboard fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Raccourcis clavier" />
          </MenuItem>

          <Divider />

          <MenuItem onClick={() => window.open('mailto:support@procuregenius.com', '_blank')}>
            <ListItemIcon>
              <Support fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Contacter le support" />
          </MenuItem>
        </Menu>
      </>
    );
  }

  // Version Icône (par défaut)
  return (
    <>
      <Tooltip title="Aide & Tutoriel">
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
            Besoin d'aide ?
          </Typography>
        </Box>
        
        <MenuItem onClick={handleStartTutorial}>
          <ListItemIcon>
            <PlayArrow fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Lancer le tutoriel
                {!tutorialCompleted && (
                  <Badge color="error" badgeContent="Nouveau" sx={{
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
            secondary="Visite guidée interactive"
          />
        </MenuItem>
        
        {tutorialCompleted && (
          <MenuItem onClick={handleResetTutorial}>
            <ListItemIcon>
              <Refresh fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Revoir le tutoriel"
              secondary="Recommencer la visite"
            />
          </MenuItem>
        )}
        
        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={() => { handleCloseMenu(); navigate('/help'); }}>
          <ListItemIcon>
            <MenuBook fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Documentation"
            secondary="Centre d'aide complet"
          />
        </MenuItem>

        <MenuItem onClick={() => { handleCloseMenu(); navigate('/help/faq'); }}>
          <ListItemIcon>
            <LiveHelp fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="FAQ" />
        </MenuItem>

        <MenuItem onClick={() => { handleCloseMenu(); navigate('/help/shortcuts'); }}>
          <ListItemIcon>
            <Keyboard fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Raccourcis clavier" />
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={() => { handleCloseMenu(); window.open('mailto:support@procuregenius.com', '_blank'); }}>
          <ListItemIcon>
            <Support fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Contacter le support" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default TutorialButton;

