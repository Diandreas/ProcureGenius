import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Typography, Chip, Paper, Button, Divider, IconButton, Fade, Grow, Tooltip, alpha, useMediaQuery, useTheme } from '@mui/material';
import {
  CheckCircle,
  Error,
  Visibility,
  Edit,
  GetApp,
  OpenInNew,
  List as ListIcon,
  Fullscreen,
  PushPin,
  BarChart,
  ShowChart,
  PieChart,
  Timeline,
  Close,
  ZoomIn,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleIn, fadeInUp } from '../../animations/variants/scroll-reveal';
import { hoverLift } from '../../animations/variants/micro-interactions';
import { getNeumorphicShadow } from '../../styles/neumorphism/mixins';
import ListModal from './ListModal';
import ChartRenderer from './ChartRenderer';
import ConfirmationModal from './ConfirmationModal';
import PreviewCard from './PreviewCard';

const MessageContent = ({ content, actionResults, actionButtons, onButtonClick, onAddArtifact }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [buttonsDisabled, setButtonsDisabled] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalData, setModalData] = React.useState({ items: [], entityType: '', title: '' });
  const [fullscreenChart, setFullscreenChart] = React.useState(null);

  // État pour la confirmation d'entité
  const [confirmationModalOpen, setConfirmationModalOpen] = React.useState(false);
  const [previewData, setPreviewData] = React.useState(null);
  const [showPreview, setShowPreview] = React.useState(false);

  // Helper pour l'icône du type de graphique
  const getChartIcon = (chartType) => {
    switch (chartType) {
      case 'line': return <ShowChart sx={{ fontSize: 16 }} />;
      case 'bar': return <BarChart sx={{ fontSize: 16 }} />;
      case 'pie': return <PieChart sx={{ fontSize: 16 }} />;
      case 'area': return <Timeline sx={{ fontSize: 16 }} />;
      default: return <BarChart sx={{ fontSize: 16 }} />;
    }
  };

  // Composant carte de visualisation style Claude.ai
  const VisualizationCard = ({ chartType, chartTitle, chartData, chartConfig }) => {
    const handleCardClick = () => {
      if (isMobile) {
        setFullscreenChart({ chartType, chartTitle, chartData, chartConfig });
      }
    };

    const isDark = theme.palette.mode === 'dark';

    return (
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={hoverLift}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <Paper
            elevation={0}
            onClick={handleCardClick}
            sx={{
              mt: 2,
              mb: 1,
              borderRadius: 3,
              overflow: 'hidden',
              border: 'none',
              bgcolor: 'background.paper',
              boxShadow: getNeumorphicShadow(isDark ? 'dark' : 'light', 'soft'),
              cursor: isMobile ? 'pointer' : 'default',
            }}
          >
          {/* Header du graphique */}
          <Box
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha('#3b82f6', 0.04),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
              <Box
                sx={{
                  width: { xs: 28, sm: 32 },
                  height: { xs: 28, sm: 32 },
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha('#3b82f6', 0.1),
                  color: '#3b82f6',
                  flexShrink: 0,
                }}
              >
                {getChartIcon(chartType)}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {chartTitle || 'Visualisation'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  {isMobile ? 'Appuyer pour agrandir' : `Graphique ${chartType === 'line' ? 'linéaire' : chartType === 'bar' ? 'en barres' : chartType === 'pie' ? 'circulaire' : 'en aires'}`}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
              {/* Bouton zoom sur mobile */}
              {isMobile && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenChart({ chartType, chartTitle, chartData, chartConfig });
                  }}
                  sx={{ color: '#3b82f6' }}
                >
                  <ZoomIn sx={{ fontSize: 20 }} />
                </IconButton>
              )}
              {/* Boutons desktop */}
              {!isMobile && (
                <>
                  <Tooltip title="Plein écran">
                    <IconButton
                      size="small"
                      onClick={() => setFullscreenChart({ chartType, chartTitle, chartData, chartConfig })}
                      sx={{ color: 'text.secondary' }}
                    >
                      <Fullscreen sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  {onAddArtifact && (
                    <Tooltip title="Épingler aux visualisations">
                      <IconButton
                        size="small"
                        onClick={() => onAddArtifact({ chartType, chartTitle, chartData, chartConfig })}
                        sx={{ color: '#3b82f6' }}
                      >
                        <PushPin sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}
            </Box>
          </Box>

          {/* Contenu du graphique */}
          <Box sx={{ p: { xs: 1, sm: 2 }, height: { xs: 200, sm: 280 }, position: 'relative' }}>
            <ChartRenderer
              chartType={chartType}
              chartTitle=""
              chartData={chartData}
              chartConfig={chartConfig}
            />
            {/* Overlay mobile pour indiquer qu'on peut cliquer */}
            {isMobile && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  bgcolor: 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.65rem',
                  fontWeight: 500,
                }}
              >
                <ZoomIn sx={{ fontSize: 14 }} />
                Agrandir
              </Box>
            )}
          </Box>
        </Paper>
        </motion.div>
      </motion.div>
    );
  };

  // Composants markdown compacts
  const components = {
    h1: ({ children }) => (
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 1, mb: 0.5, fontSize: '1rem' }}>
        {children}
      </Typography>
    ),
    h2: ({ children }) => (
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 1, mb: 0.5, fontSize: '0.95rem' }}>
        {children}
      </Typography>
    ),
    h3: ({ children }) => (
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 0.75, mb: 0.25, fontSize: '0.9rem' }}>
        {children}
      </Typography>
    ),
    p: ({ children }) => (
      <Typography variant="body2" paragraph sx={{ mb: 0.75, lineHeight: 1.5, fontSize: '0.875rem' }}>
        {children}
      </Typography>
    ),
    ul: ({ children }) => (
      <Box component="ul" sx={{ pl: 2.5, my: 0.5, '& li': { mb: 0.25 } }}>
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box component="ol" sx={{ pl: 2.5, my: 0.5, '& li': { mb: 0.25 } }}>
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Typography component="li" variant="body2" sx={{ fontSize: '0.875rem' }}>
        {children}
      </Typography>
    ),
    code: ({ inline, children }) => {
      if (inline) {
        return (
          <Chip
            label={children}
            size="small"
            sx={{
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              backgroundColor: 'grey.100',
              height: 'auto',
              py: 0.25,
              px: 0.5,
            }}
          />
        );
      }
      return (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            backgroundColor: 'grey.900',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            overflow: 'auto',
            my: 1,
            borderRadius: 1,
          }}
        >
          <code>{children}</code>
        </Paper>
      );
    },
    a: ({ href, children }) => (
      <Typography
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: 'primary.main',
          textDecoration: 'none',
          fontSize: 'inherit',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        {children}
      </Typography>
    ),
    blockquote: ({ children }) => (
      <Paper
        elevation={0}
        sx={{
          borderLeft: 3,
          borderColor: 'primary.main',
          pl: 1.5,
          py: 0.5,
          my: 1,
          backgroundColor: 'grey.50',
        }}
      >
        {children}
      </Paper>
    ),
    hr: () => <Divider sx={{ my: 1.5 }} />,
    strong: ({ children }) => (
      <Typography component="strong" sx={{ fontWeight: 600, fontSize: 'inherit' }}>
        {children}
      </Typography>
    ),
    em: ({ children }) => (
      <Typography component="em" sx={{ fontStyle: 'italic', fontSize: 'inherit' }}>
        {children}
      </Typography>
    ),
  };

  // Ouvrir le modal avec les données
  const openModal = (items, entityType, title) => {
    setModalData({ items, entityType, title });
    setModalOpen(true);
  };

  // Handlers pour la confirmation d'entité
  const handleShowPreview = (data) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const handleQuickConfirm = () => {
    if (previewData && onButtonClick) {
      // Inclure entity_type dans les données de confirmation
      const confirmData = {
        ...previewData.draft_data,
        entity_type: previewData.entity_type,
      };
      onButtonClick(0, confirmData);
    }
    setShowPreview(false);
    setPreviewData(null);
  };

  const handleModify = () => {
    setShowPreview(false);
    setConfirmationModalOpen(true);
  };

  const handleModalConfirm = (finalData) => {
    if (onButtonClick && previewData) {
      // Inclure entity_type dans les données de confirmation
      const confirmData = {
        ...finalData,
        entity_type: previewData.entity_type,
      };
      onButtonClick(0, confirmData);
    }
    setConfirmationModalOpen(false);
    setPreviewData(null);
  };

  const handleCancel = () => {
    setShowPreview(false);
    setConfirmationModalOpen(false);
    setPreviewData(null);
  };

  // Rendu compact des résultats d'actions
  const renderActionResults = () => {
    if (!actionResults || actionResults.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5 }}>
        {actionResults.map((result, index) => {
          const isSuccess = result.result?.success;
          const data = result.result?.data || {};
          const entityType = data.entity_type;
          const items = data.items || []; // Liste d'éléments si présente

          // DEBUG: Log pour comprendre la structure des données
          console.log('🔍 DEBUG actionResult:', {
            index,
            isSuccess,
            entityType,
            hasId: !!data.id,
            hasItems: items.length > 0,
            itemsCount: items.length,
            fullResult: result,
            fullData: data
          });

          const getEntityUrl = () => {
            if (!data.id) return null; // Pas d'URL si c'est une liste
            switch (entityType) {
              case 'supplier':
                return `/suppliers/${data.id}`;
              case 'invoice':
                return `/invoices/${data.id}`;
              case 'purchase_order':
                return `/purchase-orders/${data.id}`;
              case 'client':
                return `/clients/${data.id}`;
              default:
                return null;
            }
          };

          const entityUrl = getEntityUrl();

          // Déterminer le titre du modal selon le type
          const getModalTitle = () => {
            switch (entityType) {
              case 'client':
                return items.length > 1 ? 'Clients trouvés' : 'Client trouvé';
              case 'supplier':
                return items.length > 1 ? 'Fournisseurs trouvés' : 'Fournisseur trouvé';
              case 'invoice':
                return items.length > 1 ? 'Factures trouvées' : 'Facture trouvée';
              case 'purchase_order':
                return items.length > 1 ? 'Bons de commande trouvés' : 'Bon de commande trouvé';
              case 'product':
                return items.length > 1 ? 'Produits trouvés' : 'Produit trouvé';
              default:
                return 'Résultats';
            }
          };

          return (
            <Fade in timeout={400} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 1.5,
                  backgroundColor: (theme) =>
                    isSuccess
                      ? theme.palette.mode === 'dark'
                        ? alpha(theme.palette.success.main, 0.15)
                        : alpha(theme.palette.success.main, 0.1)
                      : theme.palette.mode === 'dark'
                        ? alpha(theme.palette.error.main, 0.15)
                        : alpha(theme.palette.error.main, 0.1),
                  border: 1,
                  borderColor: (theme) =>
                    isSuccess
                      ? theme.palette.mode === 'dark'
                        ? alpha(theme.palette.success.main, 0.3)
                        : alpha(theme.palette.success.main, 0.4)
                      : theme.palette.mode === 'dark'
                        ? alpha(theme.palette.error.main, 0.3)
                        : alpha(theme.palette.error.main, 0.4),
                  borderRadius: 2,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    boxShadow: (theme) =>
                      isSuccess
                        ? `0 4px 12px ${alpha(theme.palette.success.main, 0.2)}`
                        : `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  {isSuccess ? (
                    <CheckCircle sx={{ fontSize: 18, color: 'success.main', mt: 0.25 }} />
                  ) : (
                    <Error sx={{ fontSize: 18, color: 'error.main', mt: 0.25 }} />
                  )}

                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: isSuccess ? 'success.dark' : 'error.dark',
                        display: 'block',
                        mb: 0.5,
                        fontSize: '0.8rem',
                      }}
                    >
                      {isSuccess ? 'Succès' : 'Échec'}
                    </Typography>

                    <Box sx={{ mb: 1 }}>
                      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
                        {result.result?.message || result.result?.error || 'Action exécutée'}
                      </ReactMarkdown>
                    </Box>


                    {/* Confirmation d'entité - Preview Card + Modal */}
                    {result.result?.needs_confirmation && (
                      <Box sx={{ mt: 2 }}>
                        {!showPreview && !confirmationModalOpen && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleShowPreview(result.result)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.875rem',
                            }}
                          >
                            📝 Vérifier et Confirmer
                          </Button>
                        )}

                        {showPreview && previewData && (
                          <>
                            {/* Nested Preview Cards - e.g., new client when creating invoice */}
                            {result.result.nested_previews && result.result.nested_previews.length > 0 && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
                                  📦 Entités associées qui seront créées:
                                </Typography>
                                {result.result.nested_previews.map((nestedPreview, idx) => (
                                  <PreviewCard
                                    key={idx}
                                    entityType={nestedPreview.entity_type}
                                    draftData={nestedPreview.draft_data}
                                    isNested={true}
                                    nestedMessage={nestedPreview.message}
                                    // Nested previews are read-only, no actions
                                    onQuickConfirm={null}
                                    onModify={null}
                                    onCancel={null}
                                  />
                                ))}
                              </Box>
                            )}

                            {/* Main Entity Preview Card */}
                            <PreviewCard
                              entityType={result.result.entity_type}
                              draftData={result.result.draft_data}
                              onQuickConfirm={handleQuickConfirm}
                              onModify={handleModify}
                              onCancel={handleCancel}
                            />
                          </>
                        )}

                        {confirmationModalOpen && previewData && (
                          <ConfirmationModal
                            open={confirmationModalOpen}
                            onClose={handleCancel}
                            entityType={result.result.entity_type}
                            draftData={result.result.draft_data}
                            onConfirm={handleModalConfirm}
                          />
                        )}
                      </Box>
                    )}

                    {/* Si c'est une liste, afficher un bouton pour ouvrir le modal */}
                    {isSuccess && items.length > 0 && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<ListIcon sx={{ fontSize: 14 }} />}
                        onClick={() => openModal(items, entityType, getModalTitle())}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.8rem',
                          py: 0.75,
                          px: 2,
                          mb: 1,
                        }}
                      >
                        Voir les {items.length} résultat{items.length !== 1 ? 's' : ''}
                      </Button>
                    )}

                    {/* Graphique simple (visualization) - Style Claude.ai */}
                    {isSuccess && data.entity_type === 'visualization' && (
                      <VisualizationCard
                        chartType={data.chart_type}
                        chartTitle={data.chart_title}
                        chartData={data.chart_data}
                        chartConfig={data.chart_config}
                      />
                    )}

                    {/* Analyse business (insights + charts) */}
                    {isSuccess && data.entity_type === 'business_analysis' && (
                      <>
                        {/* Afficher les insights */}
                        {data.insights && data.insights.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            {data.insights.map((insight, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  borderLeft: 3,
                                  borderColor:
                                    insight.type === 'alert'
                                      ? 'error.main'
                                      : insight.type === 'warning'
                                        ? 'warning.main'
                                        : 'success.main',
                                  pl: 1.5,
                                  py: 1,
                                  mb: 1.5,
                                  backgroundColor: (theme) =>
                                    insight.type === 'alert'
                                      ? theme.palette.mode === 'dark'
                                        ? alpha(theme.palette.error.main, 0.15)
                                        : alpha(theme.palette.error.main, 0.1)
                                      : insight.type === 'warning'
                                        ? theme.palette.mode === 'dark'
                                          ? alpha(theme.palette.warning.main, 0.15)
                                          : alpha(theme.palette.warning.main, 0.1)
                                        : theme.palette.mode === 'dark'
                                          ? alpha(theme.palette.success.main, 0.15)
                                          : alpha(theme.palette.success.main, 0.1),
                                  borderRadius: 1,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600, fontSize: '0.85rem', mb: 0.5 }}
                                >
                                  {insight.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ fontSize: '0.8rem', color: 'text.secondary' }}
                                >
                                  {insight.message}
                                </Typography>
                                {insight.priority && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: '0.7rem',
                                      color: 'text.disabled',
                                      display: 'block',
                                      mt: 0.5,
                                    }}
                                  >
                                    Priorité: {insight.priority}/10
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Box>
                        )}

                        {/* Afficher les graphiques - Style Claude.ai */}
                        {data.charts && data.charts.length > 0 && (
                          <Box>
                            {data.charts.map((chart, idx) => (
                              <VisualizationCard
                                key={idx}
                                chartType={chart.chart_type}
                                chartTitle={chart.chart_title}
                                chartData={chart.chart_data}
                                chartConfig={chart.chart_config}
                              />
                            ))}
                          </Box>
                        )}
                      </>
                    )}

                    {/* Statistiques (stats + charts optionnels) */}
                    {isSuccess && data.entity_type === 'statistics' && (
                      <>
                        {/* Afficher les stats textuelles */}
                        {data.stats && (
                          <Box
                            sx={{
                              backgroundColor: '#f9fafb',
                              p: 1.5,
                              borderRadius: 1,
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              component="pre"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap',
                                margin: 0,
                              }}
                            >
                              {JSON.stringify(data.stats, null, 2)}
                            </Typography>
                          </Box>
                        )}

                        {/* Afficher les graphiques - Style Claude.ai */}
                        {data.charts && data.charts.length > 0 && (
                          <Box>
                            {data.charts.map((chart, idx) => (
                              <VisualizationCard
                                key={idx}
                                chartType={chart.chart_type}
                                chartTitle={chart.chart_title}
                                chartData={chart.chart_data}
                                chartConfig={chart.chart_config}
                              />
                            ))}
                          </Box>
                        )}
                      </>
                    )}

                    {/* Détails compacts pour un seul élément */}
                    {isSuccess && data.name && !items.length && (
                      <Box
                        sx={{
                          backgroundColor: 'white',
                          p: 1,
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {data.name}
                        </Typography>
                        {data.email && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                            {data.email}
                          </Typography>
                        )}
                        {data.invoice_number && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                            N° {data.invoice_number}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* Boutons compacts (seulement pour un seul élément, pas pour les listes) */}
                    {isSuccess && entityUrl && !items.length && (
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Visibility sx={{ fontSize: 14 }} />}
                          onClick={() => navigate(entityUrl)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            py: 0.5,
                            px: 1.5,
                            minHeight: 28,
                          }}
                        >
                          Voir
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit sx={{ fontSize: 14 }} />}
                          onClick={() => navigate(`${entityUrl}/edit`)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            py: 0.5,
                            px: 1.5,
                            minHeight: 28,
                          }}
                        >
                          Modifier
                        </Button>
                        {(entityType === 'invoice' || entityType === 'purchase_order') && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<GetApp sx={{ fontSize: 14 }} />}
                            onClick={() => {
                              const pdfUrl = entityType === 'invoice'
                                ? `/api/invoices/${data.id}/pdf/`
                                : `/api/purchase-orders/${data.id}/pdf/`;
                              window.open(pdfUrl, '_blank');
                            }}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              py: 0.5,
                              px: 1.5,
                              minHeight: 28,
                            }}
                          >
                            PDF
                          </Button>
                        )}
                      </Box>
                    )}

                    {/* Actions suggérées compactes */}
                    {isSuccess && result.result?.success_actions && result.result.success_actions.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                          Actions suggérées
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {result.result.success_actions.slice(0, 2).map((action, idx) => {
                            if (action.type === 'redirect_option') {
                              return (
                                <Button
                                  key={idx}
                                  size="small"
                                  variant="text"
                                  endIcon={<OpenInNew sx={{ fontSize: 12 }} />}
                                  onClick={() => navigate(action.url)}
                                  sx={{
                                    textTransform: 'none',
                                    fontSize: '0.7rem',
                                    py: 0.25,
                                    px: 1,
                                    minHeight: 24,
                                  }}
                                >
                                  {action.label}
                                </Button>
                              );
                            }
                            return null;
                          })}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Fade>
          );
        })}
      </Box>
    );
  };

  // Rendu des boutons d'action cliquables
  const renderActionButtons = () => {
    if (!actionButtons || actionButtons.length === 0) return null;

    const buttonStyleMap = {
      primary: { variant: 'contained', color: 'primary' },
      secondary: { variant: 'outlined', color: 'primary' },
      danger: { variant: 'outlined', color: 'error' },
    };

    return (
      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {actionButtons.map((btn, index) => {
          const styleConfig = buttonStyleMap[btn.style] || buttonStyleMap.primary;

          return (
            <Button
              key={index}
              variant={styleConfig.variant}
              color={styleConfig.color}
              size="small"
              disabled={buttonsDisabled}
              onClick={() => {
                setButtonsDisabled(true);
                onButtonClick && onButtonClick(index);
              }}
              sx={{
                textTransform: 'none',
                fontSize: '0.875rem',
                px: 2,
                py: 0.75,
              }}
            >
              {btn.label}
            </Button>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {renderActionResults()}
      {renderActionButtons()}

      {/* Modal pour afficher les listes */}
      <ListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        items={modalData.items}
        entityType={modalData.entityType}
      />

      {/* Modal Fullscreen pour les graphiques */}
      {fullscreenChart && (
        <Box
          onClick={() => setFullscreenChart(null)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 1, sm: 3 },
            cursor: 'pointer',
          }}
        >
          {/* Header Fullscreen */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: { xs: 1, sm: 2 },
              px: { xs: 1, sm: 0 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0, flex: 1 }}>
              <Box
                sx={{
                  width: { xs: 32, sm: 40 },
                  height: { xs: 32, sm: 40 },
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}
              >
                {getChartIcon(fullscreenChart.chartType)}
              </Box>
              <Typography
                variant="h5"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.5rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {fullscreenChart.chartTitle}
              </Typography>
            </Box>
            {/* Bouton fermer - IconButton sur mobile, Button sur desktop */}
            {isMobile ? (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenChart(null);
                }}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                <Close />
              </IconButton>
            ) : (
              <Button
                variant="outlined"
                startIcon={<Close />}
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenChart(null);
                }}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  flexShrink: 0,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Fermer
              </Button>
            )}
          </Box>

          {/* Graphique Fullscreen */}
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              flexGrow: 1,
              bgcolor: 'white',
              borderRadius: { xs: 2, sm: 3 },
              p: { xs: 1.5, sm: 4 },
              overflow: 'auto',
              cursor: 'default',
            }}
          >
            <Box sx={{ height: '100%', minHeight: { xs: 300, sm: 500 } }}>
              <ChartRenderer
                chartType={fullscreenChart.chartType}
                chartTitle={fullscreenChart.chartTitle}
                chartData={fullscreenChart.chartData}
                chartConfig={fullscreenChart.chartConfig}
              />
            </Box>
          </Box>

          {/* Instructions sur mobile */}
          {isMobile && (
            <Typography
              sx={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.6)',
                mt: 1,
                fontSize: '0.75rem',
              }}
            >
              Appuyez n'importe où pour fermer
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MessageContent;
