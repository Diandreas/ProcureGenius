import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  CheckCircle,
  PlayArrow,
  Stop,
  Autorenew,
  Psychology,
  ExpandMore,
  VerifiedUser,
  Warning,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchContract,
  approveContract,
  activateContract,
  terminateContract,
  extractClauses,
  verifyClause,
} from '../../store/slices/contractsSlice';
import LoadingState from '../../components/LoadingState';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

function ContractDetail() {
  const { t } = useTranslation(['contracts', 'common']);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const { currentContract, loading, extractionResult } = useSelector((state) => state.contracts);

  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [contractText, setContractText] = useState('');
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    dispatch(fetchContract(id));
  }, [id, dispatch]);

  const handleApprove = async () => {
    try {
      await dispatch(approveContract({ id, notes: '' })).unwrap();
      enqueueSnackbar(t('contracts:messages.approveSuccess'), { variant: 'success' });
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar(t('contracts:messages.approveError'), { variant: 'error' });
    }
  };

  const handleActivate = async () => {
    try {
      await dispatch(activateContract(id)).unwrap();
      enqueueSnackbar(t('contracts:messages.activateSuccess'), { variant: 'success' });
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar(t('contracts:messages.activateError'), { variant: 'error' });
    }
  };

  const handleTerminate = async () => {
    try {
      await dispatch(terminateContract(id)).unwrap();
      enqueueSnackbar(t('contracts:messages.terminateSuccess'), { variant: 'success' });
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar(t('contracts:messages.terminateError'), { variant: 'error' });
    }
  };

  const handleExtractClauses = async () => {
    if (!contractText.trim()) {
      enqueueSnackbar(t('contracts:messages.enterContractText'), { variant: 'warning' });
      return;
    }

    setExtracting(true);
    try {
      await dispatch(extractClauses({ id, contractText, language: 'fr' })).unwrap();
      enqueueSnackbar(t('contracts:messages.extractSuccess'), { variant: 'success' });
      setExtractDialogOpen(false);
      setContractText('');
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar(t('contracts:messages.extractError'), { variant: 'error' });
    } finally {
      setExtracting(false);
    }
  };

  const handleVerifyClause = async (clauseId) => {
    try {
      await dispatch(verifyClause(clauseId)).unwrap();
      enqueueSnackbar(t('contracts:messages.verifySuccess'), { variant: 'success' });
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar(t('contracts:messages.verifyError'), { variant: 'error' });
    }
  };

  const getRiskChip = (riskLevel) => {
    const riskConfig = {
      low: { label: t('contracts:risk.low'), color: 'success', icon: <Info /> },
      medium: { label: t('contracts:risk.medium'), color: 'warning', icon: <Warning /> },
      high: { label: t('contracts:risk.high'), color: 'error', icon: <Warning /> },
      critical: { label: t('contracts:risk.critical'), color: 'error', icon: <ErrorIcon /> },
    };

    const config = riskConfig[riskLevel] || { label: t('contracts:risk.notEvaluated'), color: 'default' };
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
      />
    );
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      draft: { label: t('contracts:contractStatus.draft'), color: 'default' },
      pending_review: { label: t('contracts:contractStatus.pending_review'), color: 'info' },
      pending_approval: { label: t('contracts:contractStatus.pending_approval'), color: 'warning' },
      approved: { label: t('contracts:contractStatus.approved'), color: 'success' },
      active: { label: t('contracts:contractStatus.active'), color: 'primary' },
      expiring_soon: { label: t('contracts:contractStatus.expiring_soon'), color: 'warning' },
      expired: { label: t('contracts:contractStatus.expired'), color: 'error' },
      terminated: { label: t('contracts:contractStatus.terminated'), color: 'error' },
      renewed: { label: t('contracts:contractStatus.renewed'), color: 'default' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  if (loading || !currentContract) {
    return <LoadingState message={t('contracts:messages.loading', 'Chargement du contrat...')} />;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 2, display: { xs: 'none', md: 'block' } }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/contracts')}
          sx={{ mb: 2 }}
        >
          {t('common:back')}
        </Button>
      </Box>

      {/* Actions Mobile - Affiché uniquement sur mobile */}
      <Box sx={{ mb: 2, display: { xs: 'block', md: 'none' } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/contracts')}
            size="small"
          >
            {t('common:back')}
          </Button>
          <Typography variant="h6" noWrap sx={{ flex: 1, ml: 1 }}>
            {currentContract.title}
          </Typography>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" component="h1" gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
                    {currentContract.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                    {currentContract.contract_number} • {currentContract.supplier_name}
                  </Typography>
                </Box>
                <Box>{getStatusChip(currentContract.status)}</Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {currentContract.status === 'draft' && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => navigate(`/contracts/${id}/edit`)}
                    >
                      {t('contracts:detail.actions.edit')}
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<CheckCircle />}
                      onClick={handleApprove}
                    >
                      {t('contracts:detail.actions.approve')}
                    </Button>
                  </>
                )}

                {currentContract.status === 'approved' && (
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={handleActivate}
                  >
                    {t('contracts:detail.actions.activate')}
                  </Button>
                )}

                {currentContract.status === 'active' && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Autorenew />}
                      onClick={() => navigate(`/contracts/${id}/renew`)}
                    >
                      {t('contracts:detail.actions.renew')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Stop />}
                      onClick={handleTerminate}
                    >
                      {t('contracts:detail.actions.terminate')}
                    </Button>
                  </>
                )}

                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Psychology />}
                  onClick={() => setExtractDialogOpen(true)}
                >
                  {t('contracts:detail.actions.extractClauses')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations générales */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('contracts:detail.sections.description')}
              </Typography>
              <Typography variant="body1" paragraph>
                {currentContract.description}
              </Typography>

              {currentContract.terms_and_conditions && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    {t('contracts:detail.sections.terms')}
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-line' }}>
                    {currentContract.terms_and_conditions}
                  </Typography>
                </>
              )}

              {currentContract.payment_terms && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    {t('contracts:detail.sections.paymentTerms')}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {currentContract.payment_terms}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Informations clés */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('contracts:detail.sections.keyInformation')}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('contracts:detail.sections.contractType')}
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentContract.contract_type === 'purchase' ? t('contracts:detail.sections.purchase') :
                   currentContract.contract_type === 'service' ? t('contracts:detail.sections.service') :
                   currentContract.contract_type}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('contracts:detail.sections.startDate')}
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(currentContract.start_date)}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('contracts:detail.sections.endDate')}
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(currentContract.end_date)}
                </Typography>
              </Box>

              {currentContract.days_until_expiry !== null && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('contracts:detail.sections.daysUntilExpiry')}
                  </Typography>
                  <Typography
                    variant="h5"
                    color={currentContract.days_until_expiry < 30 ? 'error' : 'primary'}
                  >
                    {currentContract.days_until_expiry}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('contracts:detail.sections.totalValue')}
                </Typography>
                <Typography variant="h5" color="primary">
                  {parseFloat(currentContract.total_value).toLocaleString()} {currentContract.currency}
                </Typography>
              </Box>

              {currentContract.auto_renewal && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t('contracts:detail.sections.autoRenewal')}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Clauses extraites par IA */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('contracts:clauses.title')} ({currentContract.clauses?.length || 0})
                </Typography>
                {currentContract.clauses?.some(c => c.extracted_by_ai) && (
                  <Chip
                    icon={<Psychology />}
                    label={t('contracts:clauses.extractionIA')}
                    color="secondary"
                    size="small"
                  />
                )}
              </Box>

              {currentContract.clauses?.length === 0 ? (
                <Alert severity="info">
                  {t('contracts:clauses.noClauses')}
                </Alert>
              ) : (
                currentContract.clauses?.map((clause, index) => (
                  <Accordion key={clause.id}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography sx={{ flexGrow: 1 }}>
                          {clause.title}
                          {clause.section_reference && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({clause.section_reference})
                            </Typography>
                          )}
                        </Typography>
                        {clause.risk_level && getRiskChip(clause.risk_level)}
                        {clause.verified && (
                          <Chip icon={<VerifiedUser />} label={t('contracts:clauses.verified')} color="success" size="small" />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box>
                        <Typography variant="body2" paragraph>
                          {clause.content}
                        </Typography>

                        {clause.ai_analysis && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {t('contracts:clauses.aiAnalysis')}
                            </Typography>
                            <Typography variant="body2">{clause.ai_analysis}</Typography>
                          </Alert>
                        )}

                        {clause.ai_recommendations && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {t('contracts:clauses.recommendations')}
                            </Typography>
                            <Typography variant="body2">{clause.ai_recommendations}</Typography>
                          </Alert>
                        )}

                        {clause.ai_confidence_score && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              {t('contracts:clauses.aiConfidence')} {clause.ai_confidence_score}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={clause.ai_confidence_score}
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        )}

                        {!clause.verified && (
                          <Box sx={{ mt: 2 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VerifiedUser />}
                              onClick={() => handleVerifyClause(clause.id)}
                            >
                              {t('contracts:clauses.verifyClause')}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Jalons */}
        {currentContract.milestones?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('contracts:milestones.title')} ({currentContract.milestones.length})
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('contracts:labels.title')}</TableCell>
                        <TableCell>{t('contracts:milestones.dueDate')}</TableCell>
                        <TableCell>{t('contracts:milestones.amount')}</TableCell>
                        <TableCell>{t('contracts:milestones.status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentContract.milestones.map((milestone) => (
                        <TableRow key={milestone.id}>
                          <TableCell>{milestone.title}</TableCell>
                          <TableCell>{formatDate(milestone.due_date)}</TableCell>
                          <TableCell>
                            {milestone.payment_amount
                              ? `${parseFloat(milestone.payment_amount).toLocaleString()} $`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                milestone.status === 'pending' ? t('contracts:milestones.pending') :
                                milestone.status === 'completed' ? t('contracts:milestones.completed') :
                                milestone.status === 'delayed' ? t('contracts:milestones.delayed') :
                                t('contracts:milestones.cancelled')
                              }
                              size="small"
                              color={
                                milestone.status === 'completed' ? 'success' :
                                milestone.status === 'delayed' ? 'error' :
                                'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Dialog extraction IA */}
      <Dialog
        open={extractDialogOpen}
        onClose={() => !extracting && setExtractDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology color="secondary" />
            {t('contracts:extraction.title')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('contracts:extraction.info')}
          </Alert>

          <TextField
            fullWidth
            multiline
            rows={12}
            label={t('contracts:extraction.contractText')}
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            disabled={extracting}
            placeholder={t('contracts:extraction.placeholder')}
          />

          {extracting && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {t('contracts:extraction.extracting')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtractDialogOpen(false)} disabled={extracting}>
            {t('contracts:extraction.cancel')}
          </Button>
          <Button
            onClick={handleExtractClauses}
            variant="contained"
            color="secondary"
            disabled={extracting || !contractText.trim()}
            startIcon={<Psychology />}
          >
            {extracting ? t('contracts:extraction.extracting_button') : t('contracts:extraction.extract')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ContractDetail;
