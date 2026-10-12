import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Stack,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  alpha,
  useMediaQuery,
  useTheme,
  LinearProgress,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
} from '@mui/material';
import {
  Save,
  ArrowBack,
  ArrowForward,
  AutoAwesome,
  AutoFixHigh,
  SmartToy,
  Business,
  Person,
  CalendarToday,
  AttachMoney,
  Gavel,
  Draw,
  CloudUpload,
  CheckCircle,
  Description,
  PictureAsPdf,
  Article,
  ExpandMore,
  Refresh,
  Edit as EditIcon,
  Visibility,
  DoneAll,
  Token,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation, Trans } from 'react-i18next';
import {
  fetchContract,
  createContract,
  updateContract,
} from '../../store/slices/contractsSlice';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';
import { fetchClients } from '../../store/slices/clientsSlice';
import { aiChatAPI, contractsAPI } from '../../services/api';
import { useCurrency } from '../../hooks/useCurrency';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Modèles de contrats préconstruits
const BUILTIN_TEMPLATES = [
  {
    id: 'service',
    icon: '',
    type: 'service',
  },
  {
    id: 'purchase',
    icon: '',
    type: 'purchase',
  },
  {
    id: 'nda',
    icon: '',
    type: 'nda',
  },
  {
    id: 'maintenance',
    icon: '',
    type: 'maintenance',
  },
  {
    id: 'lease',
    icon: '',
    type: 'lease',
  },
  {
    id: 'partnership',
    icon: '',
    type: 'partnership',
  },
  {
    id: 'freelance',
    icon: '',
    type: 'service',
  },
  {
    id: 'distribution',
    icon: '',
    type: 'other',
  },
];

const STEPS = [
  { key: 'type', icon: <SmartToy /> },
  { key: 'info', icon: <Gavel /> },
  { key: 'articles', icon: <AutoAwesome /> },
  { key: 'finalize', icon: <CheckCircle /> },
];

// ===================================================================
// Étape 1 : Sélection template + description pour l'IA
// ===================================================================
function TemplateStep({ formData, setFormData, onNext, isEditMode }) {
  const { t } = useTranslation(['contracts', 'common']);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (formData.contract_type) {
      const tpl = BUILTIN_TEMPLATES.find(tp => tp.type === formData.contract_type);
      if (tpl) setSelectedTemplate(tpl);
    }
  }, [formData.contract_type]);

  const handleTemplateSelect = (tpl) => {
    setSelectedTemplate(tpl);
    setFormData(prev => ({ ...prev, contract_type: tpl.type }));
    setDescription(t(`contracts:wizard.templates.${tpl.id}.prompt`));
  };

  if (isEditMode) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        {t('contracts:wizard.template.editModeInfo')}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {t('contracts:wizard.template.selectType')}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5, mb: 3 }}>
        {BUILTIN_TEMPLATES.map(tpl => (
          <Card
            key={tpl.id}
            onClick={() => handleTemplateSelect(tpl)}
            sx={{
              cursor: 'pointer',
              border: '2px solid',
              borderColor: selectedTemplate?.id === tpl.id ? 'primary.main' : 'divider',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: 'primary.light', transform: 'translateY(-2px)' },
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" mb={0.5}>{tpl.icon}</Typography>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>{t(`contracts:wizard.templates.${tpl.id}.label`)}</Typography>
              <Typography variant="caption" color="text.secondary">{t(`contracts:wizard.templates.${tpl.id}.description`)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {selectedTemplate && (
        <Box sx={{ bgcolor: 'primary.50', borderRadius: 2, p: 2, border: '1px solid', borderColor: 'primary.light' }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            {selectedTemplate.icon} {t(`contracts:wizard.templates.${selectedTemplate.id}.label`)}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('contracts:wizard.template.describeDetails')}
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('contracts:wizard.template.descriptionPlaceholder')}
            sx={{ mb: 1.5 }}
          />
          <Button
            variant="contained"
            startIcon={<ArrowForward />}
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                contract_type: selectedTemplate.type,
                extra_instructions: description,
              }));
              onNext();
            }}
          >
            {t('contracts:wizard.template.nextToInfo')}
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ===================================================================
// Étape 3 : Sections du contrat (cœur de la refonte)
// ===================================================================
function SectionsStep({ formData, sections, setSections, isEditMode }) {
  const { t } = useTranslation(['contracts', 'common']);
  const { currency: orgCurrency } = useCurrency();
  const [generating, setGenerating] = useState(false);
  const [generatingSection, setGeneratingSection] = useState(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const [progress, setProgress] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

  // Charger les définitions de sections si on n'en a pas
  useEffect(() => {
    if (sections.length === 0 && formData.contract_type && !isEditMode) {
      loadSectionDefinitions();
    }
  }, [formData.contract_type]);

  const loadSectionDefinitions = async () => {
    try {
      const ctx = buildContext();
      // le texte standard reprend la contrepartie, les dates et le montant saisis à l'étape 2
      const res = await contractsAPI.sectionDefinitions(formData.contract_type, {
        counterpart_name: ctx.counterpart_name, client_id: ctx.client_id, supplier_id: ctx.supplier_id,
        start_date: ctx.start_date, end_date: ctx.end_date, total_value: ctx.total_value,
        currency: ctx.currency, payment_terms: ctx.payment_terms, description: ctx.description,
      });
      const defs = res.data.sections || [];
      setSections(defs.map((d, i) => ({
        section_type: d.type,
        title: d.title,
        content: d.default_content || '',
        order: i + 1,
        is_ai_generated: false,
        ai_tokens_used: 0,
      })));
    } catch (err) {
      console.error('Erreur chargement sections:', err);
    }
  };

  const buildContext = () => ({
    title: formData.title || '',
    contract_type: formData.contract_type || 'service',
    description: formData.description || formData.extra_instructions || '',
    language: formData.language || 'fr',
    counterpart_name: formData.party_type === 'client'
      ? (formData.client?.name || formData.client?.company_name || '')
      : formData.party_type === 'supplier'
        ? (formData.supplier?.name || '')
        : formData.counterpart_name || '',
    supplier_id: formData.party_type === 'supplier' ? formData.supplier?.id : undefined,
    client_id: formData.party_type === 'client' ? formData.client?.id : undefined,
    total_value: formData.total_value || '',
    currency: formData.currency || orgCurrency,
    start_date: formData.start_date || '',
    end_date: formData.end_date || '',
    payment_terms: formData.payment_terms || '',
    extra_instructions: formData.extra_instructions || '',
  });

  const handleGenerateAll = async () => {
    if (!formData.title && !formData.description && !formData.extra_instructions) {
      enqueueSnackbar(t('contracts:wizard.sections.fillTitleFirst'), { variant: 'warning' });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setTotalTokens(0);

    try {
      const res = await contractsAPI.generateAllSections({
        contract_type: formData.contract_type || 'service',
        context: buildContext(),
      });

      const generatedSections = res.data.sections || [];
      setSections(generatedSections.map(s => ({
        ...s,
        is_ai_generated: true,
      })));
      setTotalTokens(res.data.total_tokens || 0);
      setProgress(100);

      enqueueSnackbar(
        t('contracts:wizard.sections.generatedCount', { count: generatedSections.length, tokens: res.data.total_tokens }),
        { variant: 'success' }
      );
    } catch (err) {
      console.error(err);
      enqueueSnackbar(t('contracts:wizard.sections.generateError'), { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateSection = async (index) => {
    const section = sections[index];
    setGeneratingSection(index);

    try {
      const res = await contractsAPI.generateSection({
        section_type: section.section_type,
        section_title: section.title,
        context: buildContext(),
      });

      const updated = [...sections];
      updated[index] = {
        ...updated[index],
        content: res.data.content,
        is_ai_generated: true,
        ai_tokens_used: res.data.tokens_used || 0,
      };
      setSections(updated);
      setTotalTokens(prev => prev + (res.data.tokens_used || 0));

      enqueueSnackbar(t('contracts:wizard.sections.regenerated', { title: section.title }), { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(t('contracts:wizard.sections.regenerateError'), { variant: 'error' });
    } finally {
      setGeneratingSection(null);
    }
  };

  const handleSectionContentChange = (index, newContent) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], content: newContent };
    setSections(updated);
  };

  const allSectionsGenerated = sections.length > 0 && sections.every(s => s.content);

  return (
    <Box>
      {/* Header avec bouton générer tout */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {t('contracts:wizard.sections.title', { count: sections.length })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('contracts:wizard.sections.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
          onClick={handleGenerateAll}
          disabled={generating}
          color="primary"
        >
          {generating ? t('contracts:wizard.sections.personalizing') : sections.some(s => s.is_ai_generated) ? t('contracts:wizard.sections.repersonalizeAll') : t('contracts:wizard.sections.personalizeWithAI')}
        </Button>
      </Box>

      {/* Progress bar pendant la génération */}
      {generating && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress sx={{ borderRadius: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {t('contracts:wizard.sections.generatingCount', { count: sections.length })}
          </Typography>
        </Box>
      )}

      {/* Stats tokens */}
      {totalTokens > 0 && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} icon={<Token />}>
          {t('contracts:wizard.sections.totalTokens')} <strong>{totalTokens.toLocaleString()}</strong> — {t('contracts:wizard.sections.aiGeneratedCount', { done: sections.filter(s => s.is_ai_generated).length, total: sections.length })}
        </Alert>
      )}

      {/* Liste des sections */}
      {sections.length === 0 ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {t('contracts:wizard.sections.noSections')}
        </Alert>
      ) : (
        <Stack spacing={1}>
          {sections.map((section, index) => (
            <SectionEditor
              key={`${section.section_type}-${index}`}
              section={section}
              index={index}
              isRegenerating={generatingSection === index}
              onRegenerate={() => handleRegenerateSection(index)}
              onContentChange={(content) => handleSectionContentChange(index, content)}
            />
          ))}
        </Stack>
      )}

      {/* Notes internes */}
      {sections.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>{t('contracts:wizard.sections.internalNotes')}</Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            name="internal_notes"
            value={formData.internal_notes || ''}
            onChange={e => {/* handled by parent */}}
            placeholder={t('contracts:wizard.sections.internalNotesPlaceholder')}
            size="small"
          />
        </Box>
      )}
    </Box>
  );
}

// ===================================================================
// Éditeur individuel de section
// ===================================================================
function SectionEditor({ section, index, isRegenerating, onRegenerate, onContentChange }) {
  const { t } = useTranslation(['contracts', 'common']);
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const hasContent = Boolean(section.content && section.content.trim());

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{
        border: '1px solid',
        borderColor: hasContent ? 'success.light' : 'warning.light',
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        boxShadow: 'none',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5 },
          minHeight: 48,
        }}
      >
        <Chip
          label={t('contracts:wizard.editor.article', { order: section.order })}
          size="small"
          color={hasContent ? 'success' : 'default'}
          variant={hasContent ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700, minWidth: 60 }}
        />
        <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
          {section.title}
        </Typography>
        {hasContent && section.is_ai_generated && (
          <Chip label={t('contracts:wizard.editor.aiChip')} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
        {!hasContent && (
          <Chip label={t('contracts:wizard.editor.empty')} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        {/* Actions */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={isRegenerating ? <CircularProgress size={14} /> : <AutoFixHigh />}
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            disabled={isRegenerating}
          >
            {isRegenerating ? t('contracts:wizard.editor.aiRunning') : section.is_ai_generated ? t('contracts:wizard.editor.repersonalize') : t('contracts:wizard.sections.personalizeWithAI')}
          </Button>
          {hasContent && (
            <Button
              size="small"
              variant={editMode ? 'contained' : 'text'}
              startIcon={editMode ? <Visibility /> : <EditIcon />}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? t('common:buttons.preview', 'Aperçu') : t('common:buttons.edit', 'Modifier')}
            </Button>
          )}
        </Stack>

        {/* Contenu */}
        {hasContent ? (
          editMode ? (
            <Box sx={{
              '.ql-editor': { minHeight: 150, fontSize: '0.85rem' },
              '.ql-container': { borderRadius: '0 0 6px 6px' },
              '.ql-toolbar': { borderRadius: '6px 6px 0 0' }
            }}>
              <ReactQuill
                theme="snow"
                value={section.content}
                onChange={onContentChange}
              />
            </Box>
          ) : (
            <Box
              sx={{
                bgcolor: 'grey.50',
                borderRadius: 1.5,
                p: 2,
                fontSize: '0.85rem',
                lineHeight: 1.7,
                '& p': { mb: 1 },
                '& ul, & ol': { pl: 3, mb: 1 },
                '& strong': { fontWeight: 600 },
              }}
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )
        ) : (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              {t('contracts:wizard.editor.emptyHint')}
            </Typography>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ===================================================================
// Composant section signature
// ===================================================================
function SignatureSection({ formData, setFormData, onSignedPdfUpload }) {
  const { t } = useTranslation(['contracts', 'common']);
  const fileInputRef = useRef(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFileName(file.name);
      onSignedPdfUpload(file);
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Draw fontSize="small" color="primary" />
        {t('contracts:wizard.signatures.title')}
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ border: '1.5px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} color="primary">
              {t('contracts:wizard.signatures.ourOrganization')}
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.signed_by_us}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_us: e.target.checked }))}
                  />
                }
                label={t('contracts:wizard.signatures.signedByUs')}
              />
              {formData.signed_by_us && (
                <>
                  <TextField
                    label={t('contracts:wizard.signatures.signerName')}
                    size="small"
                    value={formData.signed_by_us_name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_us_name: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label={t('contracts:wizard.signatures.signatureDate')}
                    type="date"
                    size="small"
                    value={formData.signed_by_us_at ? formData.signed_by_us_at.split('T')[0] : ''}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_us_at: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </>
              )}
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ border: '1.5px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} color="secondary">
              {t('contracts:wizard.signatures.counterparty')}
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.signed_by_counterpart}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_counterpart: e.target.checked }))}
                  />
                }
                label={t('contracts:wizard.signatures.signedByCounterparty')}
              />
              {formData.signed_by_counterpart && (
                <>
                  <TextField
                    label={t('contracts:wizard.signatures.signerName')}
                    size="small"
                    value={formData.signed_by_counterpart_name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_counterpart_name: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label={t('contracts:wizard.signatures.signatureDate')}
                    type="date"
                    size="small"
                    value={formData.signed_by_counterpart_at ? formData.signed_by_counterpart_at.split('T')[0] : ''}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_counterpart_at: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </>
              )}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      {/* Upload PDF signé */}
      <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {uploadedFileName ? (
          <Box>
            <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} color="success.main">{uploadedFileName}</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              {t('contracts:wizard.signatures.pdfImported')}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()}>
              {t('contracts:wizard.signatures.replace')}
            </Button>
          </Box>
        ) : (
          <Box>
            <PictureAsPdf sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
              {t('contracts:wizard.signatures.importSignedPdf')}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              {t('contracts:wizard.signatures.acceptedFormats')}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => fileInputRef.current?.click()}
            >
              {t('contracts:wizard.signatures.browse')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ===================================================================
// COMPOSANT PRINCIPAL
// ===================================================================
function ContractForm() {
  const { t } = useTranslation(['contracts', 'common']);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const { currency: orgCurrency } = useCurrency();
  const [sections, setSections] = useState([]);

  const { currentContract, loading } = useSelector((state) => state.contracts);
  const { suppliers } = useSelector((state) => state.suppliers);
  const { clients } = useSelector((state) => state.clients);

  const isEditMode = Boolean(id);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formData, setFormData] = useState({
    title: '',
    contract_type: 'service',
    party_type: 'client',
    supplier: null,
    client: null,
    counterpart_name: '',
    description: '',
    terms_and_conditions: '',
    payment_terms: '',
    start_date: '',
    end_date: '',
    total_value: '',
    currency: '',
    language: 'fr',
    auto_renewal: false,
    renewal_notice_days: 30,
    alert_days_before_expiry: 30,
    internal_notes: '',
    signed_by_us: false,
    signed_by_us_name: '',
    signed_by_us_at: '',
    signed_by_counterpart: false,
    signed_by_counterpart_name: '',
    signed_by_counterpart_at: '',
    extra_instructions: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSuppliers());
    dispatch(fetchClients());
    if (isEditMode) {
      dispatch(fetchContract(id));
      setActiveStep(1);
    }
  }, [id, isEditMode, dispatch]);

  useEffect(() => {
    if (isEditMode && currentContract) {
      setFormData({
        title: currentContract.title || '',
        contract_type: currentContract.contract_type || 'service',
        party_type: currentContract.client ? 'client' : currentContract.supplier ? 'supplier' : 'other',
        supplier: suppliers.find(s => s.id === currentContract.supplier) || null,
        client: clients.find(c => c.id === currentContract.client) || null,
        counterpart_name: currentContract.counterpart_name || '',
        description: currentContract.description || '',
        terms_and_conditions: currentContract.terms_and_conditions || '',
        payment_terms: currentContract.payment_terms || '',
        start_date: currentContract.start_date || '',
        end_date: currentContract.end_date || '',
        total_value: currentContract.total_value || '',
        currency: currentContract.currency || '',
        auto_renewal: currentContract.auto_renewal || false,
        renewal_notice_days: currentContract.renewal_notice_days || 30,
        alert_days_before_expiry: currentContract.alert_days_before_expiry || 30,
        internal_notes: currentContract.internal_notes || '',
        signed_by_us: currentContract.signed_by_us || false,
        signed_by_us_name: currentContract.signed_by_us_name || '',
        signed_by_us_at: currentContract.signed_by_us_at || '',
        signed_by_counterpart: currentContract.signed_by_counterpart || false,
        signed_by_counterpart_name: currentContract.signed_by_counterpart_name || '',
        signed_by_counterpart_at: currentContract.signed_by_counterpart_at || '',
        extra_instructions: '',
        language: currentContract.language || 'fr',
      });
      // Charger les sections existantes
      if (currentContract.sections && currentContract.sections.length > 0) {
        setSections(currentContract.sections.map(s => ({
          section_type: s.section_type,
          title: s.title,
          content: s.content,
          order: s.order,
          is_ai_generated: s.is_ai_generated,
          ai_tokens_used: s.ai_tokens_used || 0,
        })));
      }
    }
  }, [currentContract, isEditMode, suppliers, clients]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      enqueueSnackbar(t('contracts:wizard.validation.titleRequired'), { variant: 'error' });
      setActiveStep(1);
      return;
    }
    // Cohérence des dates : la fin ne peut pas précéder le début.
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      enqueueSnackbar(t('contracts:wizard.validation.endBeforeStart'), { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const raw = {
        ...formData,
        supplier: formData.party_type === 'supplier' ? formData.supplier?.id : null,
        client: formData.party_type === 'client' ? formData.client?.id : null,
        sections_data: sections,
      };
      delete raw.party_type;
      delete raw.extra_instructions;

      // Supprimer les champs vides pour éviter les erreurs de validation (dates, etc.)
      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      );
      // Garder null explicitement pour supplier/client (pour effacer)
      if (raw.supplier === null) payload.supplier = null;
      if (raw.client === null) payload.client = null;

      if (isEditMode) {
        await dispatch(updateContract({ id, data: payload })).unwrap();
        enqueueSnackbar(t('contracts:messages.updateSuccess'), { variant: 'success' });
        navigate(`/contracts/${id}`);
      } else {
        const result = await dispatch(createContract(payload)).unwrap();
        enqueueSnackbar(t('contracts:wizard.messages.createSuccess'), { variant: 'success' });
        navigate(`/contracts/${result?.id || ''}`);
      }
    } catch (err) {
      enqueueSnackbar(err.message || t('contracts:wizard.messages.saveError'), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  if (isEditMode && loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <TemplateStep
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            isEditMode={isEditMode}
          />
        );

      case 1:
        return (
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                required
                label={t('contracts:wizard.fields.title')}
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={t('contracts:wizard.fields.titlePlaceholder')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>{t('contracts:form.fields.contractType')}</InputLabel>
                <Select name="contract_type" value={formData.contract_type} onChange={handleChange} label={t('contracts:form.fields.contractType')}>
                  <MenuItem value="purchase">{t('contracts:form.fields.purchase_contract')}</MenuItem>
                  <MenuItem value="service">{t('contracts:form.fields.service_contract')}</MenuItem>
                  <MenuItem value="maintenance">{t('contracts:form.fields.maintenance_contract')}</MenuItem>
                  <MenuItem value="lease">{t('contracts:form.fields.lease_contract')}</MenuItem>
                  <MenuItem value="nda">{t('contracts:form.fields.nda_contract')}</MenuItem>
                  <MenuItem value="partnership">{t('contracts:form.fields.partnership_contract')}</MenuItem>
                  <MenuItem value="other">{t('contracts:form.fields.other_contract')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('contracts:wizard.fields.language')}</InputLabel>
                <Select name="language" value={formData.language} onChange={handleChange} label={t('contracts:wizard.fields.language')}>
                  <MenuItem value="fr"> Français</MenuItem>
                  <MenuItem value="en"> English</MenuItem>
                  <MenuItem value="es"> Español</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>{t('contracts:wizard.fields.counterpartyTitle')}</Typography>
              <Stack direction="row" spacing={1} mb={2}>
                <Button
                  variant={formData.party_type === 'client' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<Person />}
                  onClick={() => setFormData(prev => ({ ...prev, party_type: 'client' }))}
                >
                  {t('contracts:wizard.fields.client')}
                </Button>
                <Button
                  variant={formData.party_type === 'supplier' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<Business />}
                  onClick={() => setFormData(prev => ({ ...prev, party_type: 'supplier' }))}
                >
                  {t('contracts:form.fields.supplier')}
                </Button>
                <Button
                  variant={formData.party_type === 'other' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setFormData(prev => ({ ...prev, party_type: 'other' }))}
                >
                  {t('contracts:form.fields.other_contract')}
                </Button>
              </Stack>

              {formData.party_type === 'client' && (
                <Autocomplete
                  options={clients || []}
                  getOptionLabel={opt => opt.name || opt.company_name || ''}
                  value={formData.client}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, client: v }))}
                  renderInput={params => <TextField {...params} label={t('contracts:wizard.fields.client')} placeholder={t('contracts:wizard.fields.selectClient')} />}
                />
              )}
              {formData.party_type === 'supplier' && (
                <Autocomplete
                  options={suppliers || []}
                  getOptionLabel={opt => opt.name || ''}
                  value={formData.supplier}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, supplier: v }))}
                  renderInput={params => <TextField {...params} label={t('contracts:form.fields.supplier')} placeholder={t('contracts:form.fields.selectSupplier')} />}
                />
              )}
              {formData.party_type === 'other' && (
                <TextField
                  fullWidth
                  label={t('contracts:wizard.fields.counterpartName')}
                  name="counterpart_name"
                  value={formData.counterpart_name}
                  onChange={handleChange}
                  placeholder={t('contracts:wizard.fields.counterpartPlaceholder')}
                />
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('contracts:wizard.fields.description')}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('contracts:wizard.fields.descriptionPlaceholder')}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label={t('contracts:detail.sections.startDate')}
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label={t('contracts:detail.sections.endDate')}
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label={t('contracts:form.fields.totalValue')}
                name="total_value"
                value={formData.total_value}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Select
                        value={formData.currency || orgCurrency}
                        onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        size="small"
                        variant="standard"
                        disableUnderline
                        sx={{ '& .MuiSelect-select': { py: 0, fontSize: '0.875rem' } }}
                      >
                        {[...new Set([orgCurrency, 'XAF', 'XOF', 'EUR', 'USD', 'CAD'])].map(c => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </Select>
                    </InputAdornment>
                  ),
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('contracts:form.fields.paymentTerms')}
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                placeholder={t('contracts:wizard.fields.paymentTermsPlaceholder')}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <SectionsStep
            formData={formData}
            sections={sections}
            setSections={setSections}
            isEditMode={isEditMode}
          />
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday fontSize="small" color="primary" />
              {t('contracts:wizard.finalize.renewalAndAlerts')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox name="auto_renewal" checked={formData.auto_renewal} onChange={handleChange} />
                  }
                  label={t('contracts:form.fields.autoRenewal')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('contracts:wizard.finalize.renewalNotice')}
                  name="renewal_notice_days"
                  value={formData.renewal_notice_days}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('contracts:form.fields.alertDaysBeforeExpiry')}
                  name="alert_days_before_expiry"
                  value={formData.alert_days_before_expiry}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                  size="small"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight={700} mb={2}>{t('contracts:wizard.finalize.summary')}</Typography>
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2.5 }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{t('contracts:wizard.finalize.title')}</Typography>
                  <Typography variant="body2" fontWeight={600}>{formData.title || '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{t('contracts:wizard.finalize.type')}</Typography>
                  <Typography variant="body2" fontWeight={600}>{t(`contracts:form.fields.${formData.contract_type}_contract`, formData.contract_type)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{t('contracts:wizard.finalize.language')}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.language === 'fr' ? ' Français' : formData.language === 'en' ? ' English' : ' Español'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{t('contracts:wizard.finalize.counterparty')}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.party_type === 'client' ? formData.client?.name || formData.client?.company_name :
                     formData.party_type === 'supplier' ? formData.supplier?.name :
                     formData.counterpart_name || '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{t('contracts:wizard.finalize.duration')}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.start_date && formData.end_date ? `${formData.start_date} → ${formData.end_date}` : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{t('contracts:wizard.finalize.value')}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.total_value ? `${Number(formData.total_value).toLocaleString()} ${formData.currency || orgCurrency}` : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">{t('contracts:wizard.finalize.sections')}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {t('contracts:wizard.finalize.sectionsGenerated', { done: sections.filter(s => s.content).length, total: sections.length })}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }} icon={<Draw fontSize="small" />}>
              <Trans t={t} i18nKey="contracts:wizard.finalize.signaturesInfo" components={{ strong: <strong /> }} />
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 960, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton onClick={() => navigate('/contracts')} size="small">
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {isEditMode ? t('contracts:wizard.header.editTitle') : t('contracts:wizard.header.newTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEditMode ? t('contracts:wizard.header.editSubtitle') : t('contracts:wizard.header.newSubtitle')}
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel={!isMobile} sx={{ mb: 4 }}>
        {STEPS.map((step, i) => (
          <Step key={step.key} completed={i < activeStep}>
            <StepLabel
              onClick={() => i <= activeStep && setActiveStep(i)}
              sx={{ cursor: i <= activeStep ? 'pointer' : 'default' }}
            >
              <Typography variant="caption" fontWeight={activeStep === i ? 700 : 400}>
                {t(`contracts:wizard.steps.${step.key}`)}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          {renderStepContent(activeStep)}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={activeStep === 0 ? () => navigate('/contracts') : handleBack}
        >
          {activeStep === 0 ? t('common:buttons.cancel', 'Annuler') : t('common:buttons.previous', 'Précédent')}
        </Button>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {activeStep >= 1 && (
            <Button
              variant="outlined"
              color="success"
              startIcon={submitting ? <CircularProgress size={16} /> : <Save />}
              onClick={handleSubmit}
              disabled={submitting || !formData.title}
            >
              {t('contracts:wizard.actions.save')}
            </Button>
          )}

          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={handleNext}
            >
              {t('common:buttons.next', 'Suivant')}
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
              onClick={handleSubmit}
              disabled={submitting || !formData.title}
              color="success"
            >
              {isEditMode ? t('common:buttons.update', 'Mettre à jour') : t('contracts:wizard.actions.create')}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ContractForm;
