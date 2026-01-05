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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const MessageContent = ({ content, actionResults }) => {
  const navigate = useNavigate();

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

  // Rendu compact des résultats d'actions
  const renderActionResults = () => {
    if (!actionResults || actionResults.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5 }}>
        {actionResults.map((result, index) => {
          const isSuccess = result.result?.success;
          const data = result.result?.data || {};
          const entityType = data.entity_type;

          const getEntityUrl = () => {
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

                  {/* Détails compacts */}
                  {isSuccess && data.name && (
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

                  {/* Boutons compacts */}
                  {isSuccess && entityUrl && (
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
                      {entityType === 'invoice' && (
                        <IconButton
                          size="small"
                          onClick={() => window.open(`/api/v1/invoices/${data.id}/pdf/`, '_blank')}
                          sx={{ p: 0.5 }}
                        >
                          <GetApp sx={{ fontSize: 16 }} />
                        </IconButton>
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

  return (
    <Box>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {renderActionResults()}
    </Box>
  );
};

export default MessageContent;
