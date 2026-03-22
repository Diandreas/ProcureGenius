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
import { useTranslation } from 'react-i18next';
import {
  fetchContract,
  createContract,
  updateContract,
} from '../../store/slices/contractsSlice';
import { fetchSuppliers } from '../../store/slices/suppliersSlice';
import { fetchClients } from '../../store/slices/clientsSlice';
import { aiChatAPI, contractsAPI } from '../../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Modèles de contrats préconstruits
const BUILTIN_TEMPLATES = [
  {
    id: 'service',
    icon: '🔧',
    label: 'Contrat de services',
    type: 'service',
    description: 'Prestations de services professionnels',
    prompt: 'Contrat de prestation de services professionnels',
  },
  {
    id: 'purchase',
    icon: '🛒',
    label: "Contrat d'achat",
    type: 'purchase',
    description: 'Achat de produits ou matières premières',
    prompt: "Contrat d'achat de marchandises",
  },
  {
    id: 'nda',
    icon: '🔒',
    label: 'Accord de confidentialité',
    type: 'nda',
    description: 'Protection des informations confidentielles',
    prompt: 'Accord de non-divulgation bilatéral',
  },
  {
    id: 'maintenance',
    icon: '⚙️',
    label: 'Contrat de maintenance',
    type: 'maintenance',
    description: 'Maintenance et support technique',
    prompt: 'Contrat de maintenance avec SLA',
  },
  {
    id: 'lease',
    icon: '🏢',
    label: 'Contrat de location',
    type: 'lease',
    description: 'Location de locaux ou équipements',
    prompt: 'Contrat de location',
  },
  {
    id: 'partnership',
    icon: '🤝',
    label: 'Accord de partenariat',
    type: 'partnership',
    description: 'Partenariat commercial ou stratégique',
    prompt: 'Accord de partenariat commercial',
  },
  {
    id: 'freelance',
    icon: '💻',
    label: 'Contrat freelance',
    type: 'service',
    description: 'Mission freelance avec livrables',
    prompt: 'Contrat de mission freelance',
  },
  {
    id: 'distribution',
    icon: '📦',
    label: 'Contrat de distribution',
    type: 'other',
    description: 'Distribution de produits',
    prompt: 'Contrat de distribution',
  },
];

const STEPS = [
  { label: 'Type & Description', icon: <SmartToy /> },
  { label: 'Informations', icon: <Business /> },
  { label: 'Sections du contrat', icon: <Gavel /> },
  { label: 'Signatures & Finalisation', icon: <Draw /> },
];

// ===================================================================
// Étape 1 : Sélection template + description pour l'IA
// ===================================================================
function TemplateStep({ formData, setFormData, onNext, isEditMode }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (formData.contract_type) {
      const tpl = BUILTIN_TEMPLATES.find(t => t.type === formData.contract_type);
      if (tpl) setSelectedTemplate(tpl);
    }
  }, [formData.contract_type]);

  const handleTemplateSelect = (tpl) => {
    setSelectedTemplate(tpl);
    setFormData(prev => ({ ...prev, contract_type: tpl.type }));
    setDescription(tpl.prompt);
  };

  if (isEditMode) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Vous modifiez un contrat existant. Les sections sont éditables à l'étape 3.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Sélectionnez un type de contrat. L'IA générera chaque section selon les bonnes pratiques juridiques.
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
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>{tpl.label}</Typography>
              <Typography variant="caption" color="text.secondary">{tpl.description}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {selectedTemplate && (
        <Box sx={{ bgcolor: 'primary.50', borderRadius: 2, p: 2, border: '1px solid', borderColor: 'primary.light' }}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            {selectedTemplate.icon} {selectedTemplate.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Décrivez brièvement les détails du contrat. L'IA s'en servira pour personnaliser chaque section :
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ex: Contrat de développement d'application mobile entre Joel Computech Solution et un client, montant 4541 USD, paiement échelonné sur 3 mois, livraison en 10-14 semaines..."
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
            Suivant — Informations du contrat
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
      const res = await contractsAPI.sectionDefinitions(formData.contract_type);
      const defs = res.data.sections || [];
      setSections(defs.map((d, i) => ({
        section_type: d.type,
        title: d.title,
        content: '',
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
    counterpart_name: formData.party_type === 'client'
      ? (formData.client?.name || formData.client?.company_name || '')
      : formData.party_type === 'supplier'
        ? (formData.supplier?.name || '')
        : formData.counterpart_name || '',
    total_value: formData.total_value || '',
    currency: formData.currency || 'CAD',
    start_date: formData.start_date || '',
    end_date: formData.end_date || '',
    payment_terms: formData.payment_terms || '',
    extra_instructions: formData.extra_instructions || '',
  });

  const handleGenerateAll = async () => {
    if (!formData.title && !formData.description && !formData.extra_instructions) {
      enqueueSnackbar('Remplissez le titre ou la description d\'abord (étape 2)', { variant: 'warning' });
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
        `${generatedSections.length} sections générées (${res.data.total_tokens} tokens)`,
        { variant: 'success' }
      );
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Erreur lors de la génération des sections', { variant: 'error' });
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

      enqueueSnackbar(`Section "${section.title}" régénérée`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Erreur lors de la régénération', { variant: 'error' });
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Sections du contrat ({sections.length} articles)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            L'IA génère chaque section individuellement pour une meilleure qualité et économie de tokens
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
          onClick={handleGenerateAll}
          disabled={generating}
          color="primary"
        >
          {generating ? 'Génération en cours...' : allSectionsGenerated ? 'Tout régénérer' : 'Générer toutes les sections'}
        </Button>
      </Box>

      {/* Progress bar pendant la génération */}
      {generating && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress sx={{ borderRadius: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Génération des {sections.length} sections en cours...
          </Typography>
        </Box>
      )}

      {/* Stats tokens */}
      {totalTokens > 0 && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} icon={<Token />}>
          Total tokens utilisés : <strong>{totalTokens.toLocaleString()}</strong> — {sections.filter(s => s.is_ai_generated).length}/{sections.length} sections générées par IA
        </Alert>
      )}

      {/* Liste des sections */}
      {sections.length === 0 ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Aucune section définie. Revenez à l'étape 1 pour sélectionner un type de contrat.
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
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Notes internes (non incluses dans le contrat)</Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            name="internal_notes"
            value={formData.internal_notes || ''}
            onChange={e => {/* handled by parent */}}
            placeholder="Notes confidentielles..."
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
          label={`Art. ${section.order}`}
          size="small"
          color={hasContent ? 'success' : 'default'}
          variant={hasContent ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700, minWidth: 60 }}
        />
        <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
          {section.title}
        </Typography>
        {hasContent && section.is_ai_generated && (
          <Chip label="IA" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
        {!hasContent && (
          <Chip label="Vide" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        {/* Actions */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={isRegenerating ? <CircularProgress size={14} /> : <Refresh />}
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            disabled={isRegenerating}
          >
            {hasContent ? 'Régénérer' : 'Générer'} avec IA
          </Button>
          {hasContent && (
            <Button
              size="small"
              variant={editMode ? 'contained' : 'text'}
              startIcon={editMode ? <Visibility /> : <EditIcon />}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Aperçu' : 'Modifier'}
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
              Cliquez sur "Générer avec IA" pour remplir cette section automatiquement
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
        Signatures des parties
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ border: '1.5px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} color="primary">
              Notre organisation
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.signed_by_us}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_us: e.target.checked }))}
                  />
                }
                label="Signé de notre côté"
              />
              {formData.signed_by_us && (
                <>
                  <TextField
                    label="Nom du signataire"
                    size="small"
                    value={formData.signed_by_us_name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_us_name: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Date de signature"
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
              Contrepartie
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.signed_by_counterpart}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_counterpart: e.target.checked }))}
                  />
                }
                label="Signé par la contrepartie"
              />
              {formData.signed_by_counterpart && (
                <>
                  <TextField
                    label="Nom du signataire"
                    size="small"
                    value={formData.signed_by_counterpart_name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, signed_by_counterpart_name: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Date de signature"
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
              PDF signé importé avec succès
            </Typography>
            <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()}>
              Remplacer
            </Button>
          </Box>
        ) : (
          <Box>
            <PictureAsPdf sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
              Importer le PDF signé
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Formats acceptés: PDF
            </Typography>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => fileInputRef.current?.click()}
            >
              Parcourir...
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
  const [signedPdfFile, setSignedPdfFile] = useState(null);
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
    currency: 'CAD',
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
        currency: currentContract.currency || 'CAD',
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
      enqueueSnackbar('Le titre du contrat est requis', { variant: 'error' });
      setActiveStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        supplier: formData.party_type === 'supplier' ? formData.supplier?.id : null,
        client: formData.party_type === 'client' ? formData.client?.id : null,
        sections_data: sections,
      };
      delete payload.party_type;
      delete payload.extra_instructions;

      if (isEditMode) {
        await dispatch(updateContract({ id, data: payload })).unwrap();
        enqueueSnackbar('Contrat mis à jour avec succès', { variant: 'success' });
      } else {
        const result = await dispatch(createContract(payload)).unwrap();
        if (signedPdfFile && result?.id) {
          const formDataUpload = new FormData();
          formDataUpload.append('signed_pdf', signedPdfFile);
          await contractsAPI.update(result.id, formDataUpload);
        }
        enqueueSnackbar('Contrat créé avec succès', { variant: 'success' });
      }
      navigate('/contracts');
    } catch (err) {
      enqueueSnackbar(err.message || 'Erreur lors de la sauvegarde', { variant: 'error' });
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
                label="Titre du contrat"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Contrat de prestation — Développement App Mobile"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Type de contrat</InputLabel>
                <Select name="contract_type" value={formData.contract_type} onChange={handleChange} label="Type de contrat">
                  <MenuItem value="purchase">Contrat d'achat</MenuItem>
                  <MenuItem value="service">Contrat de service</MenuItem>
                  <MenuItem value="maintenance">Contrat de maintenance</MenuItem>
                  <MenuItem value="lease">Contrat de location</MenuItem>
                  <MenuItem value="nda">Accord de confidentialité</MenuItem>
                  <MenuItem value="partnership">Accord de partenariat</MenuItem>
                  <MenuItem value="other">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Contrepartie du contrat</Typography>
              <Stack direction="row" spacing={1} mb={2}>
                <Button
                  variant={formData.party_type === 'client' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<Person />}
                  onClick={() => setFormData(prev => ({ ...prev, party_type: 'client' }))}
                >
                  Client
                </Button>
                <Button
                  variant={formData.party_type === 'supplier' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<Business />}
                  onClick={() => setFormData(prev => ({ ...prev, party_type: 'supplier' }))}
                >
                  Fournisseur
                </Button>
                <Button
                  variant={formData.party_type === 'other' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setFormData(prev => ({ ...prev, party_type: 'other' }))}
                >
                  Autre
                </Button>
              </Stack>

              {formData.party_type === 'client' && (
                <Autocomplete
                  options={clients || []}
                  getOptionLabel={opt => opt.name || opt.company_name || ''}
                  value={formData.client}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, client: v }))}
                  renderInput={params => <TextField {...params} label="Client" placeholder="Sélectionner un client" />}
                />
              )}
              {formData.party_type === 'supplier' && (
                <Autocomplete
                  options={suppliers || []}
                  getOptionLabel={opt => opt.name || ''}
                  value={formData.supplier}
                  onChange={(_, v) => setFormData(prev => ({ ...prev, supplier: v }))}
                  renderInput={params => <TextField {...params} label="Fournisseur" placeholder="Sélectionner un fournisseur" />}
                />
              )}
              {formData.party_type === 'other' && (
                <TextField
                  fullWidth
                  label="Nom de la contrepartie"
                  name="counterpart_name"
                  value={formData.counterpart_name}
                  onChange={handleChange}
                  placeholder="Nom de l'entreprise ou de la personne"
                />
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description de l'objet du contrat"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Décrivez l'objet et le contexte du contrat..."
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Date de début"
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
                label="Date de fin"
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
                label="Valeur totale"
                name="total_value"
                value={formData.total_value}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Select
                        value={formData.currency}
                        onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        size="small"
                        variant="standard"
                        disableUnderline
                        sx={{ '& .MuiSelect-select': { py: 0, fontSize: '0.875rem' } }}
                      >
                        <MenuItem value="CAD">CAD</MenuItem>
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="XAF">XAF</MenuItem>
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
                label="Conditions de paiement"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                placeholder="Ex: 50% à la signature, 50% à la livraison — Net 30 jours"
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
            <SignatureSection
              formData={formData}
              setFormData={setFormData}
              onSignedPdfUpload={setSignedPdfFile}
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday fontSize="small" color="primary" />
              Renouvellement & Alertes
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox name="auto_renewal" checked={formData.auto_renewal} onChange={handleChange} />
                  }
                  label="Renouvellement automatique"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Préavis de renouvellement (jours)"
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
                  label="Alerte avant expiration (jours)"
                  name="alert_days_before_expiry"
                  value={formData.alert_days_before_expiry}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                  size="small"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight={700} mb={2}>Résumé du contrat</Typography>
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2.5 }}>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Titre</Typography>
                  <Typography variant="body2" fontWeight={600}>{formData.title || '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{formData.contract_type}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Contrepartie</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.party_type === 'client' ? formData.client?.name || formData.client?.company_name :
                     formData.party_type === 'supplier' ? formData.supplier?.name :
                     formData.counterpart_name || '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Durée</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.start_date && formData.end_date ? `${formData.start_date} → ${formData.end_date}` : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Valeur</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.total_value ? `${Number(formData.total_value).toLocaleString()} ${formData.currency}` : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Sections</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {sections.filter(s => s.content).length}/{sections.length} générées
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Signatures</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {formData.signed_by_us && <Chip label="Nous" size="small" color="success" />}
                    {formData.signed_by_counterpart && <Chip label="Contrepartie" size="small" color="success" />}
                    {!formData.signed_by_us && !formData.signed_by_counterpart && (
                      <Typography variant="body2" color="text.secondary">Non signé</Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>
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
            {isEditMode ? 'Modifier le contrat' : 'Nouveau contrat'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEditMode ? 'Mettez à jour les informations du contrat' : 'Créez un contrat professionnel avec génération IA section par section'}
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel={!isMobile} sx={{ mb: 4 }}>
        {STEPS.map((step, i) => (
          <Step key={step.label} completed={i < activeStep}>
            <StepLabel
              onClick={() => i <= activeStep && setActiveStep(i)}
              sx={{ cursor: i <= activeStep ? 'pointer' : 'default' }}
            >
              <Typography variant="caption" fontWeight={activeStep === i ? 700 : 400}>
                {step.label}
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
          {activeStep === 0 ? 'Annuler' : 'Précédent'}
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
              Sauvegarder
            </Button>
          )}

          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={handleNext}
            >
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
              onClick={handleSubmit}
              disabled={submitting || !formData.title}
              color="success"
            >
              {isEditMode ? 'Mettre à jour' : 'Créer le contrat'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default ContractForm;
