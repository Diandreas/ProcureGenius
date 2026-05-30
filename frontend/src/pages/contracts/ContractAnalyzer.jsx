import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Card, CardContent, Grid, Chip,
  CircularProgress, Alert, Divider, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { ExpandMore, Gavel, WarningAmber, FactCheck, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { contractsAPI } from '../../services/api';

const RISK_COLOR = { critical: 'error', high: 'error', medium: 'warning', low: 'success' };

export default function ContractAnalyzer() {
  const navigate = useNavigate();
  const { t } = useTranslation(['contracts', 'common']);
  const { enqueueSnackbar } = useSnackbar();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const riskLabel = (lvl) => ({
    critical: t('contracts:analyzer.risk.critical', 'Critique'),
    high: t('contracts:analyzer.risk.high', 'Élevé'),
    medium: t('contracts:analyzer.risk.medium', 'Moyen'),
    low: t('contracts:analyzer.risk.low', 'Faible'),
  }[lvl] || t('contracts:analyzer.risk.unknown', 'Non évalué'));

  const analyze = async () => {
    if (text.trim().length < 50) {
      enqueueSnackbar(t('contracts:analyzer.tooShort', 'Collez le texte complet du contrat (au moins quelques lignes).'), { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const res = await contractsAPI.analyzeExternal({ contract_text: text, language: 'fr' });
      setResult(res.data);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || t('contracts:analyzer.error', "Erreur lors de l'analyse."), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={{ xs: 2, md: 3 }} maxWidth={920} mx="auto">
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/contracts')} sx={{ mb: 2, textTransform: 'none' }}>
        {t('common:buttons.back', 'Retour')}
      </Button>

      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <FactCheck color="primary" />
        <Typography variant="h5" fontWeight={800}>
          {t('contracts:analyzer.title', 'Analyser un contrat')}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {t('contracts:analyzer.subtitle', "Collez un contrat reçu d'un tiers pour en étudier les clauses et les risques avant de l'accepter. Rien n'est enregistré.")}
      </Typography>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth multiline minRows={8}
            placeholder={t('contracts:analyzer.placeholder', 'Collez ici le texte intégral du contrat à étudier…')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              variant="contained" onClick={analyze} disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Gavel />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {loading ? t('contracts:analyzer.analyzing', 'Analyse en cours…') : t('contracts:analyzer.analyze', 'Analyser les clauses')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.summary && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>{t('contracts:analyzer.summary', 'Résumé')}</Typography>
              {result.summary}
            </Alert>
          )}

          {result.overall_risk_assessment && (
            <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700}>{t('contracts:analyzer.globalRisk', 'Évaluation globale du risque')}</Typography>
              {result.overall_risk_assessment}
            </Alert>
          )}

          {Object.keys(result.risk_summary || {}).length > 0 && (
            <Box display="flex" gap={1} flexWrap="wrap" mb={3}>
              {Object.entries(result.risk_summary).map(([lvl, n]) => (
                <Chip key={lvl} color={RISK_COLOR[lvl] || 'default'} label={`${riskLabel(lvl)} : ${n}`} />
              ))}
            </Box>
          )}

          <Typography variant="h6" fontWeight={700} mb={1.5}>
            {t('contracts:analyzer.clauses', 'Clauses détectées')} ({result.clauses?.length || 0})
          </Typography>

          {(result.clauses || []).map((c, i) => (
            <Accordion key={i} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' }, mb: 1, borderRadius: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1.5} flex={1}>
                  <Typography fontWeight={600} flex={1}>{c.title || c.clause_type}</Typography>
                  {c.risk_level && <Chip size="small" color={RISK_COLOR[c.risk_level] || 'default'} label={riskLabel(c.risk_level)} />}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {c.content && <Typography variant="body2" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }}>{c.content}</Typography>}
                {c.ai_analysis && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>{t('contracts:analyzer.analysis', 'Analyse')}</Typography>
                    <Typography variant="body2">{c.ai_analysis}</Typography>
                  </>
                )}
                {c.ai_recommendations && (
                  <>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mt: 1, display: 'block' }}>{t('contracts:analyzer.recommendation', 'Recommandation')}</Typography>
                    <Typography variant="body2">{c.ai_recommendations}</Typography>
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
    </Box>
  );
}
