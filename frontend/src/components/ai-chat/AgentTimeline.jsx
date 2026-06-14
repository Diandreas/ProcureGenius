import React, { useState } from 'react';
import { Box, Typography, Collapse, CircularProgress, alpha, useTheme } from '@mui/material';
import { CheckCircle, ErrorOutline, ExpandMore, AutoAwesome } from '@mui/icons-material';

/**
 * Timeline des étapes de la boucle agentique IA (façon Claude.ai).
 *
 * Pendant le streaming (working=true) : déroulée, avec l'étape active en
 * "shimmer" et un spinner sur l'outil en cours. Une fois terminée : repliée
 * en une ligne "Raisonnement · N étapes" cliquable.
 *
 * steps : [{ kind: 'thought'|'tool', label, content, summary,
 *            status: 'running'|'done'|'error', success }]
 * (les étapes persistées en base portent `success` au lieu de `status`).
 */
const AgentTimeline = ({ steps = [], working = false, statusLabel = '' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [expanded, setExpanded] = useState(false);

  const hasSteps = steps.length > 0;
  if (!working && !hasSteps) return null;

  const isOpen = working || expanded;

  const stepStatus = (step) => {
    if (step.status) return step.status;
    if (step.kind === 'thought') return 'done';
    return step.success === false ? 'error' : 'done';
  };

  const runningStep = steps.find((s) => stepStatus(s) === 'running');
  const activeLabel = runningStep?.label || statusLabel || 'Réflexion en cours';

  const shimmerSx = {
    fontWeight: 500,
    background: isDark
      ? 'linear-gradient(90deg, #6b7280 25%, #e5e7eb 50%, #6b7280 75%)'
      : 'linear-gradient(90deg, #9ca3af 25%, #1f2937 50%, #9ca3af 75%)',
    backgroundSize: '200% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'agent-shimmer 2s linear infinite',
    '@keyframes agent-shimmer': {
      '0%': { backgroundPosition: '200% 0' },
      '100%': { backgroundPosition: '-200% 0' },
    },
  };

  const accent = '#6366f1';

  return (
    <Box
      sx={{
        mb: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.06),
        bgcolor: isDark ? alpha('#fff', 0.02) : alpha(accent, 0.02),
        overflow: 'hidden',
      }}
    >
      {/* En-tête : statut animé pendant le travail, résumé repliable après */}
      <Box
        onClick={() => !working && setExpanded((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.875,
          cursor: working ? 'default' : 'pointer',
          userSelect: 'none',
          '&:hover': working ? {} : { bgcolor: isDark ? alpha('#fff', 0.03) : alpha(accent, 0.04) },
        }}
      >
        <AutoAwesome sx={{ fontSize: 14, color: accent, flexShrink: 0 }} />
        {working ? (
          <Typography variant="caption" sx={{ fontSize: '0.75rem', ...shimmerSx }}>
            {activeLabel}
          </Typography>
        ) : (
          <>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}
            >
              Raisonnement · {steps.length} étape{steps.length > 1 ? 's' : ''}
            </Typography>
            <ExpandMore
              sx={{
                fontSize: 16,
                ml: 'auto',
                color: 'text.disabled',
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </>
        )}
      </Box>

      <Collapse in={isOpen} timeout={250}>
        <Box sx={{ px: 1.5, pb: 1.25, pt: 0.25 }}>
          {steps.map((step, idx) => {
            const status = stepStatus(step);
            const isLast = idx === steps.length - 1;

            return (
              <Box key={idx} sx={{ display: 'flex', gap: 1.25, position: 'relative' }}>
                {/* Colonne indicateur + ligne de liaison */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 16,
                    flexShrink: 0,
                    pt: 0.5,
                  }}
                >
                  {status === 'running' ? (
                    <CircularProgress size={11} thickness={5} sx={{ color: accent }} />
                  ) : status === 'error' ? (
                    <ErrorOutline sx={{ fontSize: 13, color: 'error.main' }} />
                  ) : step.kind === 'thought' ? (
                    <Box
                      sx={{
                        width: 6, height: 6, borderRadius: '50%', mt: 0.4,
                        bgcolor: isDark ? alpha('#fff', 0.25) : alpha('#000', 0.2),
                      }}
                    />
                  ) : (
                    <CheckCircle sx={{ fontSize: 13, color: 'success.main' }} />
                  )}
                  {!isLast && (
                    <Box
                      sx={{
                        width: '1px',
                        flexGrow: 1,
                        minHeight: 8,
                        my: 0.4,
                        bgcolor: isDark ? alpha('#fff', 0.08) : alpha('#000', 0.08),
                      }}
                    />
                  )}
                </Box>

                {/* Contenu de l'étape */}
                <Box sx={{ pb: isLast ? 0 : 1, minWidth: 0 }}>
                  {step.kind === 'thought' ? (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontStyle: 'italic',
                        color: 'text.secondary',
                        lineHeight: 1.45,
                      }}
                    >
                      {step.content}
                    </Typography>
                  ) : (
                    <>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          lineHeight: 1.45,
                          color: status === 'error' ? 'error.main' : 'text.primary',
                          ...(status === 'running' ? shimmerSx : {}),
                        }}
                      >
                        {step.label || step.name}
                      </Typography>
                      {step.summary && status !== 'running' && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontSize: '0.7rem',
                            color: 'text.disabled',
                            lineHeight: 1.4,
                          }}
                        >
                          {step.summary}
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              </Box>
            );
          })}

          {/* Travail en cours mais aucune étape encore : point d'attente */}
          {working && steps.length === 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 0.25 }}>
              <CircularProgress size={11} thickness={5} sx={{ color: accent }} />
              <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                Préparation…
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default AgentTimeline;
