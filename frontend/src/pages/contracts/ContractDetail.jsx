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
  FormControl,
  MenuItem
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
  Description,
  Download,
  PictureAsPdf,
  Receipt,
  Email,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { contractsAPI } from '../../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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

  // States pour la génération de document
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [contextData, setContextData] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  // States pour l'envoi d'email
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

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

  const handleOpenGenerateDialog = async () => {
    try {
      const response = await contractsAPI.templates.list({ is_active: true });
      setTemplates(response.data.results || response.data);
      setGenerateDialogOpen(true);
    } catch (err) {
      enqueueSnackbar("Erreur lors du chargement des modèles", { variant: 'error' });
    }
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) {
      enqueueSnackbar("Veuillez sélectionner un modèle", { variant: 'warning' });
      return;
    }

    setGenerating(true);
    try {
      let parsedContext = {};
      if (contextData.trim()) {
        try {
          parsedContext = JSON.parse(contextData);
        } catch (e) {
          enqueueSnackbar("Le contexte JSON est invalide", { variant: 'error' });
          setGenerating(false);
          return;
        }
      }
      const response = await contractsAPI.templates.generateDocument(selectedTemplate, {
        contract_id: id,
        context_data: parsedContext,
      });
      
      setGeneratedContent(response.data?.data?.generated_content || '');
      enqueueSnackbar("Document généré avec succès", { variant: 'success' });
    } catch (error) {
      enqueueSnackbar("Erreur lors de la génération", { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadGenerated = () => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `document_genere_${currentContract.contract_number}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async (templateType = 'contract') => {
    if (!generatedContent) {
      enqueueSnackbar("Veuillez d'abord générer le document", { variant: 'warning' });
      return;
    }
    try {
      setGenerating(true);
      const payload = {
        template_type: templateType,
        generated_content: generatedContent
      };
      const response = await contractsAPI.exportPDF(id, payload);
      // Construct blob from response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-${templateType}-${currentContract.contract_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('Export PDF réussi', { variant: 'success' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Erreur lors de l\'export PDF', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportWord = async (templateType = 'contract') => {
    if (!generatedContent) {
      enqueueSnackbar("Veuillez d'abord générer le document", { variant: 'warning' });
      return;
    }
    try {
      setGenerating(true);
      const payload = {
        template_type: templateType,
        generated_content: generatedContent
      };
      const response = await contractsAPI.exportWord(id, payload);
      const blob = new Blob([response.data], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-${templateType}-${currentContract.contract_number}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('Export Word réussi', { variant: 'success' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Erreur lors de l\'export Word', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDirectExportPDF = async () => {
    try {
      setGenerating(true);
      const response = await contractsAPI.exportPDF(id, { template_type: 'contract', generated_content: '' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrat-${currentContract.contract_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('Export PDF réussi', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'export PDF', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDirectExportWord = async () => {
    try {
      setGenerating(true);
      const response = await contractsAPI.exportWord(id, { template_type: 'contract', generated_content: '' });
      const blob = new Blob([response.data], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contrat-${currentContract.contract_number}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('Export Word réussi', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'export Word', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipient.trim()) {
      enqueueSnackbar('Email destinataire requis', { variant: 'warning' });
      return;
    }
    setSendingEmail(true);
    try {
      await contractsAPI.sendEmail(id, { recipient_email: emailRecipient, message: emailMessage });
      enqueueSnackbar('Email envoyé avec succès', { variant: 'success' });
      setEmailDialogOpen(false);
      setEmailRecipient('');
      setEmailMessage('');
    } catch (e) {
      enqueueSnackbar('Erreur lors de l\'envoi de l\'email', { variant: 'error' });
    } finally {
      setSendingEmail(false);
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
                  variant="outlined"
                  color="error"
                  startIcon={<PictureAsPdf />}
                  onClick={handleDirectExportPDF}
                  disabled={generating}
                >
                  PDF
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Description />}
                  onClick={handleDirectExportWord}
                  disabled={generating}
                >
                  Word
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={() => {
                    setEmailRecipient(currentContract.supplier_email || '');
                    setEmailDialogOpen(true);
                  }}
                >
                  Envoyer par email
                </Button>

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Receipt />}
                  onClick={() => navigate(`/invoices/new?contractId=${id}`)}
                >
                  {t('contracts:detail.actions.createInvoice', 'Créer une facture')}
                </Button>

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

        {/* Contenu du contrat */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              {/* Sections structurées (nouveau système) */}
              {currentContract.sections && currentContract.sections.length > 0 ? (
                <>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Sections du contrat
                    <Chip label={`${currentContract.sections.length} articles`} size="small" color="primary" variant="outlined" />
                  </Typography>
                  {currentContract.sections.map((section, idx) => (
                    <Accordion key={section.id || idx} defaultExpanded={idx === 0} sx={{ boxShadow: 'none', '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Chip label={`Art. ${section.order}`} size="small" sx={{ mr: 1.5, fontWeight: 700, minWidth: 55 }} />
                        <Typography variant="subtitle2" fontWeight={600}>{section.title}</Typography>
                        {section.is_ai_generated && (
                          <Chip label="IA" size="small" color="primary" variant="outlined" sx={{ ml: 1, fontSize: '0.65rem', height: 20 }} />
                        )}
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box
                          sx={{
                            fontSize: '0.9rem',
                            lineHeight: 1.7,
                            '& p': { mb: 1 },
                            '& ul, & ol': { pl: 3, mb: 1 },
                            '& strong': { fontWeight: 600 },
                          }}
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </>
              ) : (
                <>
                  {/* Fallback : ancien affichage */}
                  <Typography variant="h6" gutterBottom>
                    {t('contracts:detail.sections.description')}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {currentContract.description}
                  </Typography>

                  {currentContract.contract_body && (
                    <Box
                      className="ql-editor-view"
                      sx={{ typography: 'body1', '& p': { mb: 2 }, '& ul, & ol': { mb: 2, pl: 3 }, '& h2': { mt: 3, mb: 1.5 } }}
                      dangerouslySetInnerHTML={{ __html: currentContract.contract_body }}
                    />
                  )}

                  {currentContract.terms_and_conditions && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                        {t('contracts:detail.sections.terms')}
                      </Typography>
                      <Box
                        className="ql-editor-view"
                        sx={{ typography: 'body1', '& p': { mb: 2 }, '& ul, & ol': { mb: 2, pl: 3 } }}
                        dangerouslySetInnerHTML={{ __html: currentContract.terms_and_conditions }}
                      />
                    </>
                  )}

                  {currentContract.payment_terms && (
                    <>
                      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                        {t('contracts:detail.sections.paymentTerms')}
                      </Typography>
                      <Box
                        className="ql-editor-view"
                        sx={{ typography: 'body1', '& p': { mb: 2 }, '& ul, & ol': { mb: 2, pl: 3 } }}
                        dangerouslySetInnerHTML={{ __html: currentContract.payment_terms }}
                      />
                    </>
                  )}
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

      {/* Dialog génération de document */}
      <Dialog
        open={generateDialogOpen}
        onClose={() => !generating && setGenerateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Générer un document depuis un modèle</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <TextField
                select
                label="Sélectionner un modèle"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={generating}
              >
                {templates.map(tpl => (
                  <MenuItem key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.template_type})
                  </MenuItem>
                ))}
              </TextField>
            </FormControl>

            <TextField
              label="Contexte additionnel (JSON optionnel)"
              multiline
              rows={4}
              value={contextData}
              onChange={(e) => setContextData(e.target.value)}
              disabled={generating}
              placeholder='{"champ_supplementaire": "valeur"}'
              helperText="Les données du contrat seront automatiquement incluses."
            />

            {generating && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Génération du document en cours par l'IA...
                </Typography>
              </Box>
            )}

            {generatedContent && !generating && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Résultat :</Typography>
                <Box sx={{ p: 0, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Box sx={{ 
                    '.ql-editor': { minHeight: 400, fontSize: '1rem', fontFamily: 'inherit' },
                    '.ql-container': { borderRadius: '0 0 8px 8px', borderColor: 'divider' },
                    '.ql-toolbar': { borderRadius: '8px 8px 0 0', borderColor: 'divider' }
                  }}>
                    <ReactQuill
                      theme="snow"
                      value={generatedContent}
                      onChange={setGeneratedContent}
                    />
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button 
                    startIcon={<Download />} 
                    onClick={handleDownloadGenerated}
                    variant="outlined"
                  >
                    HTML
                  </Button>
                  <Button 
                    startIcon={<Description />} 
                    onClick={() => {
                        const tpl = templates.find(t => t.id === selectedTemplate);
                        handleExportWord(tpl ? tpl.template_type : 'contract');
                    }}
                    variant="contained"
                    color="primary"
                  >
                    Exporter en Word
                  </Button>
                  <Button 
                    startIcon={<PictureAsPdf />} 
                    onClick={() => {
                        const tpl = templates.find(t => t.id === selectedTemplate);
                        handleExportPDF(tpl ? tpl.template_type : 'contract');
                    }}
                    variant="contained"
                    color="error"
                  >
                    Exporter en PDF
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)} disabled={generating}>
            Fermer
          </Button>
          <Button
            onClick={handleGenerateDocument}
            variant="contained"
            color="primary"
            disabled={generating || !selectedTemplate}
            startIcon={<Psychology />}
          >
            {generating ? 'Génération...' : 'Générer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog envoi email */}
      <Dialog
        open={emailDialogOpen}
        onClose={() => !sendingEmail && setEmailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email color="primary" />
            Envoyer le contrat par email
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Email destinataire"
              type="email"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              disabled={sendingEmail}
              required
              placeholder="client@exemple.com"
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Message personnalisé (optionnel)"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              disabled={sendingEmail}
              placeholder="Bonjour, veuillez trouver ci-joint le contrat..."
            />
            {sendingEmail && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Envoi en cours...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)} disabled={sendingEmail}>
            Annuler
          </Button>
          <Button
            onClick={handleSendEmail}
            variant="contained"
            disabled={sendingEmail || !emailRecipient.trim()}
            startIcon={<Email />}
          >
            {sendingEmail ? 'Envoi...' : 'Envoyer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ContractDetail;
