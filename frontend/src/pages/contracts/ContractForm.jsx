import React, { useState, useEffect, useRef } from 'react';
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
  StepContent,
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
} from '@mui/material';
import {
  Save,
  Cancel,
  ArrowBack,
  ArrowForward,
  AutoAwesome,
  AutoFixHigh,
  RateReview,
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
  FileUpload,
  Close,
  Send,
  PictureAsPdf,
  Article,
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
    description: 'Pour des prestations de services récurrentes ou ponctuelles',
    prompt: 'Contrat de prestation de services professionnels avec clauses de confidentialité et modalités de paiement nettes 30 jours',
  },
  {
    id: 'purchase',
    icon: '🛒',
    label: "Contrat d'achat",
    type: 'purchase',
    description: 'Achat de produits ou matières premières auprès d\'un fournisseur',
    prompt: 'Contrat d\'achat de marchandises avec conditions de livraison, garantie et retour produits',
  },
  {
    id: 'nda',
    icon: '🔒',
    label: 'Accord de confidentialité (NDA)',
    type: 'nda',
    description: 'Protection des informations confidentielles entre deux parties',
    prompt: 'Accord de non-divulgation (NDA) bilatéral pour protéger les informations confidentielles échangées dans le cadre d\'une collaboration',
  },
  {
    id: 'maintenance',
    icon: '⚙️',
    label: 'Contrat de maintenance',
    type: 'maintenance',
    description: 'Maintenance et support technique d\'équipements ou systèmes',
    prompt: 'Contrat de maintenance préventive et corrective avec niveaux de service (SLA) et astreintes',
  },
  {
    id: 'lease',
    icon: '🏢',
    label: 'Contrat de location',
    type: 'lease',
    description: 'Location de locaux, équipements ou véhicules',
    prompt: 'Contrat de location avec conditions d\'utilisation, dépôt de garantie et modalités de résiliation',
  },
  {
    id: 'partnership',
    icon: '🤝',
    label: 'Accord de partenariat',
    type: 'partnership',
    description: 'Partenariat commercial ou stratégique entre deux entreprises',
    prompt: 'Accord de partenariat commercial avec partage des responsabilités, revenus et conditions de sortie',
  },
  {
    id: 'freelance',
    icon: '💻',
    label: 'Contrat freelance',
    type: 'service',
    description: 'Pour les travailleurs indépendants et consultants',
    prompt: 'Contrat de mission freelance avec livrables, jalons, tarification horaire et droits de propriété intellectuelle',
  },
  {
    id: 'distribution',
    icon: '📦',
    label: 'Contrat de distribution',
    type: 'other',
    description: 'Distribution exclusive ou non-exclusive de produits',
    prompt: 'Contrat de distribution avec territoire exclusif, objectifs de vente et conditions de renouvellement',
  },
];

const STEPS = [
  { label: 'Description avec IA', icon: <SmartToy /> },
  { label: 'Informations', icon: <Business /> },
  { label: 'Contenu', icon: <Gavel /> },
  { label: 'Signatures & Finalisation', icon: <Draw /> },
];

// Composant IA Chat intégré
function AIDescriptionStep({ onDataGenerated, formData, isEditMode }) {
  const [description, setDescription] = useState('');
  const [messages, setMessages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState('template'); // template | chat
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const messagesEndRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleTemplateSelect = async (tpl) => {
    setSelectedTemplate(tpl);
    setDescription(tpl.prompt);
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);

    const userMsg = description;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const prompt = `Tu es un assistant juridique IA spécialisé en droit des affaires québécois/canadien. L'utilisateur veut créer un contrat. Génère immédiatement le JSON complet du contrat sans poser de questions supplémentaires. Utilise des valeurs sensées par défaut pour les informations manquantes.

DESCRIPTION DU CONTRAT: ${userMsg}

Génère le JSON entre \`\`\`json et \`\`\` avec EXACTEMENT ce format:
{
  "title": "Titre court et professionnel du contrat",
  "contract_type": "purchase|service|maintenance|lease|nda|partnership|other",
  "description": "Description de 2-3 phrases de l'objet du contrat",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "total_value": 5000,
  "currency": "CAD",
  "terms_and_conditions": "<h2>CONDITIONS GÉNÉRALES</h2><h3>Article 1 — Objet</h3><p>...</p><h3>Article 2 — Durée</h3><p>...</p><h3>Article 3 — Obligations des parties</h3><p>...</p><h3>Article 4 — Confidentialité</h3><p>...</p><h3>Article 5 — Résiliation</h3><p>...</p><h3>Article 6 — Règlement des différends</h3><p>...</p><br><h3>Signatures</h3><table style='width:100%;border-collapse:collapse'><tr><td style='width:50%;padding:20px;border:1px solid #ccc'><p><strong>Pour [Partie A]</strong></p><br><br><p>Signature: ___________________________</p><p>Nom: ___________________________</p><p>Titre: ___________________________</p><p>Date: ___________________________</p></td><td style='width:50%;padding:20px;border:1px solid #ccc'><p><strong>Pour [Partie B]</strong></p><br><br><p>Signature: ___________________________</p><p>Nom: ___________________________</p><p>Titre: ___________________________</p><p>Date: ___________________________</p></td></tr></table>",
  "payment_terms": "<p><strong>Modalités de paiement:</strong></p><ul><li>...</li></ul>",
  "renewal_notice_days": 30,
  "alert_days_before_expiry": 30
}`;

      const response = await aiChatAPI.sendMessage({ message: prompt, stream: false });
      const reply = response.data.message.content;

      const jsonMatch = reply.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        onDataGenerated(data);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '✅ Contrat généré ! J\'ai pré-rempli toutes les sections. Vérifiez et complétez les informations aux étapes suivantes.',
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        enqueueSnackbar('Contenu généré — vérifiez et complétez le formulaire', { variant: 'info' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Erreur de communication avec l\'IA', { variant: 'error' });
      setMessages(prev => [...prev, { role: 'assistant', content: 'Désolé, une erreur est survenue. Veuillez réessayer.' }]);
    } finally {
      setGenerating(false);
    }
  };

  if (isEditMode) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        L'assistant IA est disponible uniquement lors de la création d'un nouveau contrat.
        Vous pouvez modifier directement les champs ci-dessous.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Mode selector */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button
          variant={mode === 'template' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setMode('template')}
          startIcon={<Article />}
        >
          Choisir un modèle
        </Button>
        <Button
          variant={mode === 'chat' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setMode('chat')}
          startIcon={<SmartToy />}
        >
          Décrire librement
        </Button>
      </Box>

      {/* Template grid */}
      {mode === 'template' && (
        <Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Sélectionnez un modèle pour démarrer avec une structure pré-remplie par l'IA :
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5, mb: 3 }}>
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
                {selectedTemplate.icon} Modèle sélectionné : {selectedTemplate.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Ajoutez des détails spécifiques (parties, montants, durée...) ou générez directement avec les paramètres par défaut :
              </Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Précisez les détails : noms des parties, montant, durée, spécificités..."
                sx={{ mb: 1.5 }}
              />
              <Button
                variant="contained"
                startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Génération en cours...' : 'Générer le contrat avec l\'IA'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Free description mode */}
      {mode === 'chat' && (
        <Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Décrivez le contrat que vous souhaitez créer en langage naturel. L'IA pré-remplira toutes les sections.
          </Typography>

          {/* Chat messages */}
          {messages.length > 0 && (
            <Box sx={{
              bgcolor: 'grey.50',
              borderRadius: 2,
              p: 2,
              mb: 2,
              maxHeight: 250,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}>
              {messages.map((msg, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box sx={{
                    maxWidth: '85%',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}>
                    {msg.content}
                  </Box>
                </Box>
              ))}
              {generating && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1.5, bgcolor: 'white', borderRadius: 2, width: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">L'IA génère votre contrat...</Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
            <TextField
              multiline
              rows={4}
              fullWidth
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Contrat de maintenance informatique mensuel avec Acme Corp, 2500$/mois, 12 mois, inclut support téléphonique 24/7 et intervention en 4h..."
              disabled={generating}
            />
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={generating || !description.trim()}
              sx={{ height: 56, minWidth: 56, borderRadius: '10px' }}
            >
              {generating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Conseil : Mentionnez les parties impliquées, la durée, le montant et l'objet principal pour un meilleur résultat.
          </Typography>
        </Box>
      )}

      {messages.some(m => m.role === 'assistant' && m.content.startsWith('✅')) && (
        <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
          Contrat pré-rempli par l'IA. Passez à l'étape suivante pour vérifier et compléter les informations.
        </Alert>
      )}
    </Box>
  );
}

// Composant section signature
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
        {/* Notre signature */}
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

        {/* Signature contrepartie */}
        <Grid item xs={12} md={6}>
          <Box sx={{ border: '1.5px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={2} color="secondary">
              Contrepartie (client / fournisseur)
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
              Importer le PDF signé par les deux parties
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Gardez une trace du contrat signé pour une traçabilité complète. Formats acceptés: PDF
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

      {/* Export */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1.5} color="text.secondary">
          Exporter le contrat
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Chip
            icon={<PictureAsPdf />}
            label="Exporter en PDF"
            clickable
            color="error"
            variant="outlined"
            size="small"
          />
          <Chip
            icon={<Description />}
            label="Exporter en Word"
            clickable
            color="primary"
            variant="outlined"
            size="small"
          />
        </Stack>
      </Box>
    </Box>
  );
}

function ContractForm() {
  const { t } = useTranslation(['contracts', 'common']);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [signedPdfFile, setSignedPdfFile] = useState(null);

  const { currentContract, loading } = useSelector((state) => state.contracts);
  const { suppliers } = useSelector((state) => state.suppliers);
  const { clients } = useSelector((state) => state.clients);

  const isEditMode = Boolean(id);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formData, setFormData] = useState({
    title: '',
    contract_type: 'service',
    party_type: 'client', // client | supplier
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
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSuppliers());
    dispatch(fetchClients());
    if (isEditMode) {
      dispatch(fetchContract(id));
      setActiveStep(1); // En mode édition, commencer à l'étape infos
    }
  }, [id, isEditMode, dispatch]);

  useEffect(() => {
    if (isEditMode && currentContract) {
      setFormData({
        title: currentContract.title || '',
        contract_type: currentContract.contract_type || 'service',
        party_type: currentContract.client ? 'client' : 'supplier',
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
      });
    }
  }, [currentContract, isEditMode, suppliers, clients]);

  const handleAIDataGenerated = (data) => {
    setFormData(prev => ({
      ...prev,
      title: data.title || prev.title,
      contract_type: data.contract_type || prev.contract_type,
      description: data.description || prev.description,
      start_date: data.start_date || prev.start_date,
      end_date: data.end_date || prev.end_date,
      total_value: data.total_value || prev.total_value,
      currency: data.currency || prev.currency,
      terms_and_conditions: data.terms_and_conditions || prev.terms_and_conditions,
      payment_terms: data.payment_terms || prev.payment_terms,
      renewal_notice_days: data.renewal_notice_days || prev.renewal_notice_days,
      alert_days_before_expiry: data.alert_days_before_expiry || prev.alert_days_before_expiry,
    }));
    enqueueSnackbar('Contrat pré-rempli par l\'IA — vérifiez les informations', { variant: 'success' });
  };

  const handleGenerateSection = async (field) => {
    if (!formData.title && !formData.description) {
      enqueueSnackbar('Remplissez le titre ou la description d\'abord', { variant: 'warning' });
      return;
    }
    setIsGenerating(true);
    try {
      const fieldLabel = field === 'terms_and_conditions' ? 'Conditions Générales du contrat' : 'Conditions et Modalités de Paiement';
      const prompt = `Tu es un expert en rédaction juridique. Génère un texte professionnel pour la section "${fieldLabel}" d'un contrat.
Type: ${formData.contract_type}. Titre: ${formData.title}. Description: ${formData.description}.
Montant: ${formData.total_value} ${formData.currency}. Durée: ${formData.start_date} au ${formData.end_date}.
IMPORTANT: Format HTML sémantique uniquement (utilise <h3>, <p>, <strong>, <ul>, <li>, <br>). Pas de markdown.
${field === 'terms_and_conditions' ? 'Inclure: objet, durée, obligations, confidentialité, résiliation, règlement des litiges, et un tableau de signatures à la fin.' : 'Inclure: montant, échéances, mode de paiement, pénalités de retard.'}`;

      const response = await aiChatAPI.sendMessage({ message: prompt, stream: false });
      setFormData(prev => ({ ...prev, [field]: response.data.message.content }));
      enqueueSnackbar('Section générée avec succès', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Erreur lors de la génération', { variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

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
      };
      // Remove non-API fields
      delete payload.party_type;

      if (isEditMode) {
        await dispatch(updateContract({ id, data: payload })).unwrap();
        enqueueSnackbar('Contrat mis à jour avec succès', { variant: 'success' });
      } else {
        const result = await dispatch(createContract(payload)).unwrap();
        // Upload signed PDF if provided
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
          <AIDescriptionStep
            onDataGenerated={handleAIDataGenerated}
            formData={formData}
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
                placeholder="Ex: Contrat de maintenance — Acme Corp 2024"
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

            {/* Type de partie */}
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
                placeholder="Décrivez brièvement l'objet et le contexte de ce contrat..."
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
                        <MenuItem value="MAD">MAD</MenuItem>
                      </Select>
                    </InputAdornment>
                  ),
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box>
            {/* Conditions générales */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>Conditions générales et clauses</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={isGenerating ? <CircularProgress size={14} /> : <AutoFixHigh />}
                onClick={() => handleGenerateSection('terms_and_conditions')}
                disabled={isGenerating}
              >
                Rédiger avec l'IA
              </Button>
            </Box>
            <Box sx={{
              mb: 3,
              '.ql-editor': { minHeight: 280, fontSize: '0.9rem' },
              '.ql-container': { borderRadius: '0 0 8px 8px' },
              '.ql-toolbar': { borderRadius: '8px 8px 0 0' }
            }}>
              <ReactQuill
                theme="snow"
                value={formData.terms_and_conditions}
                onChange={val => setFormData(prev => ({ ...prev, terms_and_conditions: val }))}
                placeholder="Rédigez les conditions générales... ou utilisez l'IA pour les générer automatiquement."
              />
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {/* Conditions de paiement */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>Conditions de paiement</Typography>
              <Button
                size="small"
                variant="text"
                startIcon={isGenerating ? <CircularProgress size={14} /> : <RateReview />}
                onClick={() => handleGenerateSection('payment_terms')}
                disabled={isGenerating}
              >
                Générer avec l'IA
              </Button>
            </Box>
            <Box sx={{
              mb: 3,
              '.ql-editor': { minHeight: 130, fontSize: '0.9rem' },
              '.ql-container': { borderRadius: '0 0 8px 8px' },
              '.ql-toolbar': { borderRadius: '8px 8px 0 0' }
            }}>
              <ReactQuill
                theme="snow"
                value={formData.payment_terms}
                onChange={val => setFormData(prev => ({ ...prev, payment_terms: val }))}
                placeholder="Ex: 50% à la signature, 50% à la livraison. Paiement net 30 jours..."
              />
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {/* Notes internes */}
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Notes internes</Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              name="internal_notes"
              value={formData.internal_notes}
              onChange={handleChange}
              placeholder="Notes confidentielles (non incluses dans le contrat exporté)..."
            />
          </Box>
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

            {/* Renouvellement & alertes */}
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

            {/* Résumé */}
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
                  <Typography variant="body2" color="text.secondary">Signatures</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {formData.signed_by_us && <Chip label="Nous ✓" size="small" color="success" />}
                    {formData.signed_by_counterpart && <Chip label="Contrepartie ✓" size="small" color="success" />}
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
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 900, mx: 'auto' }}>
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
            {isEditMode ? 'Mettez à jour les informations du contrat' : 'Créez un contrat en quelques étapes avec l\'aide de l\'IA'}
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
          {/* Toujours permettre de sauvegarder dès l'étape 1 */}
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
