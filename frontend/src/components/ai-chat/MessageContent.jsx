import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Typography, Chip, Paper, Button, Divider, IconButton } from '@mui/material';
import {
  CheckCircle,
  Error,
  Visibility,
  Edit,
  GetApp,
  OpenInNew,
  List as ListIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ListModal from './ListModal';
import ChartRenderer from './ChartRenderer';

const MessageContent = ({ content, actionResults, actionButtons, onButtonClick }) => {
  const navigate = useNavigate();
  const [buttonsDisabled, setButtonsDisabled] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalData, setModalData] = React.useState({ items: [], entityType: '', title: '' });

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
            <Paper
              key={index}
              elevation={0}
              sx={{
                p: 1.5,
                mb: 1,
                backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2',
                border: 1,
                borderColor: isSuccess ? '#86efac' : '#fca5a5',
                borderRadius: 1.5,
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

                  <Typography variant="body2" sx={{ mb: 1, fontSize: '0.875rem' }}>
                    {result.result?.message || result.result?.error || 'Action exécutée'}
                  </Typography>

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

                  {/* Graphique simple (visualization) */}
                  {isSuccess && data.entity_type === 'visualization' && (
                    <ChartRenderer
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
                                    ? '#ef4444'
                                    : insight.type === 'warning'
                                    ? '#f59e0b'
                                    : '#10b981',
                                pl: 1.5,
                                py: 1,
                                mb: 1.5,
                                backgroundColor:
                                  insight.type === 'alert'
                                    ? '#fef2f2'
                                    : insight.type === 'warning'
                                    ? '#fffbeb'
                                    : '#f0fdf4',
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

                      {/* Afficher les graphiques */}
                      {data.charts && data.charts.length > 0 && (
                        <Box>
                          {data.charts.map((chart, idx) => (
                            <ChartRenderer
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

                      {/* Afficher les graphiques */}
                      {data.charts && data.charts.length > 0 && (
                        <Box>
                          {data.charts.map((chart, idx) => (
                            <ChartRenderer
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
    </Box>
  );
};

export default MessageContent;
