import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Stack,
  Chip,
  Button,
  Divider,
  Tooltip,
  Fade,
  Grow,
  Skeleton,
  Slide,
} from '@mui/material';
import {
  Close,
  Fullscreen,
  Download,
  Delete,
  BarChart,
  ShowChart,
  PieChart,
  Timeline,
  Refresh,
} from '@mui/icons-material';
import ChartRenderer from './ChartRenderer';

/**
 * Panel d'artifacts type Claude.ai pour afficher les visualisations
 * Permet de garder les graphiques accessibles pendant la conversation
 */
const ArtifactsPanel = ({ open, onClose, artifacts, onRemoveArtifact, onRefreshArtifact }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [fullscreenArtifact, setFullscreenArtifact] = useState(null);

  // Filtrer artifacts actifs vs historique
  const activeArtifacts = artifacts.filter((a) => !a.archived);
  const archivedArtifacts = artifacts.filter((a) => a.archived);
  const displayedArtifacts = tabIndex === 0 ? activeArtifacts : archivedArtifacts;

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleDownload = (artifact) => {
    // Export as PNG (simplified - in reality would use html2canvas or similar)
    const chartTitle = artifact.chart_title || 'chart';
    const filename = `${chartTitle.replace(/\s+/g, '_')}.png`;

    // For now, just show a message
    console.log('Download triggered for:', filename);
    // TODO: Implement actual chart export functionality
  };

  const handleFullscreen = (artifact) => {
    setFullscreenArtifact(artifact);
  };

  const closeFullscreen = () => {
    setFullscreenArtifact(null);
  };

  const getChartIcon = (chartType) => {
    switch (chartType) {
      case 'line':
        return <ShowChart />;
      case 'bar':
        return <BarChart />;
      case 'pie':
        return <PieChart />;
      case 'area':
        return <Timeline />;
      default:
        return <BarChart />;
    }
  };

  const getChartTypeLabel = (chartType) => {
    const labels = {
      line: 'Ligne',
      bar: 'Barres',
      pie: 'Camembert',
      area: 'Aire',
    };
    return labels[chartType] || chartType;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <>
      {/* Main Drawer */}
      <Drawer
        anchor="right"
        open={open}
        variant="temporary"
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400 },
            maxWidth: '100vw',
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
          },
        }}
      >
        {/* Header - Style Claude.ai */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <BarChart sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              Visualisations
            </Typography>
            <Chip
              label={activeArtifacts.length}
              size="small"
              color="primary"
              sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 2,
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              py: 1.5,
            },
          }}
        >
          <Tab
            label={`Actifs (${activeArtifacts.length})`}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', px: 2 }}
          />
          <Tab
            label={`Historique (${archivedArtifacts.length})`}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', px: 2 }}
          />
        </Tabs>

        {/* Artifacts List */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {displayedArtifacts.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2,
                color: 'text.secondary',
              }}
            >
              <BarChart sx={{ fontSize: 64, opacity: 0.3 }} />
              <Typography variant="body2">
                {tabIndex === 0
                  ? 'Aucune visualisation active'
                  : "Aucun élément dans l'historique"}
              </Typography>
              <Typography variant="caption" sx={{ textAlign: 'center', maxWidth: 300 }}>
                {tabIndex === 0
                  ? "Demandez à l'IA de générer des graphiques pour les voir apparaître ici"
                  : 'Les visualisations supprimées apparaîtront ici'}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {displayedArtifacts.map((artifact, index) => (
                <Grow
                  key={artifact.id}
                  in
                  timeout={300 + index * 100}
                  style={{ transformOrigin: '0 0 0' }}
                >
                  <Card
                    elevation={2}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: 2,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      },
                    }}
                  >
                  <CardContent sx={{ p: 2, pb: 1.5 }}>
                    {/* Header */}
                    <Box display="flex" alignItems="flex-start" gap={1} mb={1.5}>
                      <Box sx={{ color: 'primary.main', mt: 0.25 }}>
                        {React.cloneElement(getChartIcon(artifact.chart_type), { sx: { fontSize: 20 } })}
                      </Box>
                      <Box flexGrow={1} minWidth={0}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            mb: 0.5,
                            fontSize: '0.9rem',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {artifact.chart_title || 'Sans titre'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {getChartTypeLabel(artifact.chart_type)} • {formatTimestamp(artifact.timestamp)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Chart Preview */}
                    <Box
                      sx={{
                        height: 180,
                        mt: 1.5,
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <ChartRenderer
                        chartType={artifact.chart_type}
                        chartTitle="" // Hide title in preview
                        chartData={artifact.chart_data}
                        chartConfig={artifact.chart_config}
                      />
                    </Box>
                  </CardContent>

                  <Divider />

                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, py: 1, gap: 0.5 }}>
                    <Tooltip title="Plein écran">
                      <IconButton
                        size="small"
                        onClick={() => handleFullscreen(artifact)}
                      >
                        <Fullscreen sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Rafraîchir">
                      <IconButton
                        size="small"
                        onClick={() => onRefreshArtifact && onRefreshArtifact(artifact.id)}
                      >
                        <Refresh sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Télécharger">
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(artifact)}
                      >
                        <Download sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onRemoveArtifact && onRemoveArtifact(artifact.id)}
                      >
                        <Delete sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
                </Grow>
              ))}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Fullscreen Modal */}
      {fullscreenArtifact && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            p: 3,
          }}
        >
          {/* Fullscreen Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
              {fullscreenArtifact.chart_title}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Close />}
              onClick={closeFullscreen}
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Fermer
            </Button>
          </Box>

          {/* Fullscreen Chart */}
          <Box
            sx={{
              flexGrow: 1,
              bgcolor: 'white',
              borderRadius: 2,
              p: 3,
              overflow: 'auto',
            }}
          >
            <Box sx={{ height: '100%', minHeight: 500 }}>
              <ChartRenderer
                chartType={fullscreenArtifact.chart_type}
                chartTitle={fullscreenArtifact.chart_title}
                chartData={fullscreenArtifact.chart_data}
                chartConfig={fullscreenArtifact.chart_config}
              />
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

export default ArtifactsPanel;
