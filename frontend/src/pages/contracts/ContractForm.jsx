import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Save,
  Cancel,
  ArrowBack,
  AutoAwesome,
  AutoFixHigh,
  RateReview,
  Send
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
import { aiChatAPI } from '../../services/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function ContractForm() {
  const { t } = useTranslation(['contracts', 'common']);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const [isGenerating, setIsGenerating] = useState(false);

  const { currentContract, loading } = useSelector((state) => state.contracts);
  const { suppliers } = useSelector((state) => state.suppliers);

  const isEditMode = Boolean(id);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formData, setFormData] = useState({
    title: '',
    contract_type: 'purchase',
    supplier: null,
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
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSuppliers());
    if (isEditMode) {
      dispatch(fetchContract(id));
    }
  }, [id, isEditMode, dispatch]);

  useEffect(() => {
    if (isEditMode && currentContract) {
      setFormData({
        title: currentContract.title || '',
        contract_type: currentContract.contract_type || 'purchase',
        supplier: suppliers.find(s => s.id === currentContract.supplier) || null,
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
      });
    }
  }, [currentContract, isEditMode, suppliers]);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const aiMessagesEndRef = React.useRef(null);

  useEffect(() => {
    if (aiMessagesEndRef.current) {
      aiMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages]);

  const startAIAssistant = () => {
    setAiMessages([{
      role: 'assistant',
      content: t('contracts:aiAssistant.welcome', "Bonjour ! Je suis votre assistant juridique IA. Pour commencer la création de votre contrat, quel en est l'objet principal ?")
    }]);
    setAiAssistantOpen(true);
  };

  const parseJsonResponse = (text, defaultText) => {
    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
         return JSON.parse(jsonMatch[1]);
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleSendAIAssistant = async () => {
    if (!aiInput.trim()) return;
    
    // Ajout du message utilisateur
    const newMessages = [...aiMessages, { role: 'user', content: aiInput }];
    setAiMessages(newMessages);
    setAiInput('');
    setIsGenerating(true);

    try {
      // Construction du prompt complet avec l'historique
      let prompt = "Tu es un assistant juridique IA. Ton but est d'aider l'utilisateur à créer un contrat étape par étape en posant une question à la fois (titre, description, montant, fournisseur, type, dates). ";
      prompt += "L'utilisateur te répond. Quand tu estimes avoir suffisamment d'informations, au lieu de poser une nouvelle question, tu vas générer le JSON complet avec les données et le texte du contrat. Le texte du contrat DOIT toujours inclure un espace 'Signature et Cachet' à la fin. ";
      prompt += "IMPORTANT: Le texte contenu dans 'terms_and_conditions' et 'payment_terms' DOIT être généré au format HTML sémantique (utilise <strong>, <br>, <ul>, <li>, <h3>, etc.) adapté à un éditeur de texte enrichi (Rich Text). N'utilise pas de markdown pour ces champs de texte, unqiement du HTML valide. ";
      prompt += "Ta réponse finale contenant le JSON DOIT OBLIGATOIREMENT être formattée entre des balises ```json et ```. Voici le format JSON attendu : { \"title\": \"...\", \"contract_type\": \"...\", \"description\": \"...\", \"start_date\": \"YYYY-MM-DD\", \"end_date\": \"YYYY-MM-DD\", \"total_value\": 1000, \"currency\": \"CAD\", \"terms_and_conditions\": \"<h1>Titre du contrat</h1><p>Texte avec <strong>gras</strong>...</p><br><br><p>Signature et Cachet : _________________</p>\", \"payment_terms\": \"...\" }.\n\nHistorique de la conversation :\n";
      
      newMessages.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${msg.content}\n`;
      });

      const response = await aiChatAPI.sendMessage({
        message: prompt,
        stream: false
      });

      const assistantReply = response.data.message.content;
      setAiMessages(prev => [...prev, { role: 'assistant', content: assistantReply }]);

      // Vérifier si la réponse contient du JSON
      const extractedData = parseJsonResponse(assistantReply);
      if (extractedData) {
        // Remplir le formulaire avec les données
        setFormData(prev => ({
          ...prev,
          title: extractedData.title || prev.title,
          contract_type: extractedData.contract_type || prev.contract_type,
          description: extractedData.description || prev.description,
          start_date: extractedData.start_date || prev.start_date,
          end_date: extractedData.end_date || prev.end_date,
          total_value: extractedData.total_value || prev.total_value,
          currency: extractedData.currency || prev.currency,
          terms_and_conditions: extractedData.terms_and_conditions || prev.terms_and_conditions,
          payment_terms: extractedData.payment_terms || prev.payment_terms,
        }));
        
        enqueueSnackbar('Les informations ont été transférées vers le formulaire ! Vous pouvez maintenant vérifier avant de confirmer.', { variant: 'success', autoHideDuration: 6000 });
        setAiAssistantOpen(false); // Fermer le dialog pour révéler la vue avant confirmation
      }

    } catch (error) {
      console.error('AI Assistant error:', error);
      enqueueSnackbar("Erreur de communication avec l'IA", { variant: 'error' });
      setAiMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur technique est survenue. Veuillez réessayer."}]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAI = async (field) => {
    if (!formData.title || !formData.description) {
      enqueueSnackbar('Veuillez remplir le titre et la description pour aider l\'IA', { variant: 'warning' });
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Génère un texte professionnel pour le champ "${field === 'terms_and_conditions' ? 'Conditions Générales' : 'Conditions de Paiement'}" d'un contrat nommé "${formData.title}". 
      Description du projet: ${formData.description}. 
      Montant: ${formData.total_value} ${formData.currency}.
      Type de contrat: ${formData.contract_type}.
      Réponds directement avec le texte juridique sans introduction. IMPORTANT: Tu DOIS formater ton texte en HTML sémantique valide (utilise <strong>, <ul>, <li>, <p>, <br>). N'utilise SURTOUT PAS de Markdown (**gras**). Il est impératif de toujours ajouter un espace clair pour les signatures au format HTML (ex: '<br><br><p><strong>Signature et Cachet du Client / Fournisseur :</strong> _________________</p>') à la fin du document si applicable.`;

      const response = await aiChatAPI.sendMessage({
        message: prompt,
        stream: false
      });

      const generatedText = response.data.message.content;
      setFormData(prev => ({
        ...prev,
        [field]: generatedText
      }));
      enqueueSnackbar('Contenu généré avec succès par l\'IA !', { variant: 'success' });
    } catch (error) {
      console.error('AI Generation error:', error);
      enqueueSnackbar('Erreur lors de la génération par l\'IA', { variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSupplierChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      supplier: newValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        supplier: formData.supplier?.id,
      };

      if (isEditMode) {
        await dispatch(updateContract({ id, data: payload })).unwrap();
        enqueueSnackbar(t('contracts:messages.updateSuccess'), { variant: 'success' });
      } else {
        await dispatch(createContract(payload)).unwrap();
        enqueueSnackbar(t('contracts:messages.createSuccess'), { variant: 'success' });
      }
      navigate('/contracts');
    } catch (error) {
      enqueueSnackbar(
        error.message || t('contracts:messages.updateError'),
        { variant: 'error' }
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditMode && loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      p: { xs: 0, sm: 2, md: 3 },
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
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

      {/* Actions Mobile - Style mobile app compact (pas de bouton back, géré par top navbar) */}
      <Box sx={{
        mb: 1.5,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'flex-end',
        px: 2,
        py: 1
      }}>
        {/* Les actions sont gérées par le top navbar sur mobile */}
      </Box>
      <Box sx={{ px: isMobile ? 2 : 0 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
              {isEditMode ? t('contracts:form.title.edit') : t('contracts:form.title.new')}
            </Typography>
            {!isEditMode && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AutoAwesome />}
                onClick={startAIAssistant}
              >
                Créer avec l'Assistant IA
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Informations générales */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {t('contracts:form.fields.generalInfo')}
                </Typography>
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  required
                  label={t('contracts:form.fields.contractTitle')}
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t('contracts:form.fields.descriptionPlaceholder')}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>{t('contracts:form.fields.contractType')}</InputLabel>
                  <Select
                    name="contract_type"
                    value={formData.contract_type}
                    onChange={handleChange}
                    label={t('contracts:form.fields.contractType')}
                  >
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

              <Grid item xs={12}>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => option.name || ''}
                  value={formData.supplier}
                  onChange={handleSupplierChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('contracts:form.fields.supplier')}
                      required
                      placeholder={t('contracts:form.fields.selectSupplier')}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label={t('contracts:form.fields.description')}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('contracts:form.fields.descriptionPlaceholder')}
                />
              </Grid>

              {/* Dates et montants */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('contracts:form.fields.datesAndAmounts')}
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label={t('contracts:form.fields.startDate')}
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label={t('contracts:form.fields.endDate')}
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label={t('contracts:form.fields.totalValue')}
                  name="total_value"
                  value={formData.total_value}
                  onChange={handleChange}
                  InputProps={{ endAdornment: formData.currency }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              {/* Termes */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">
                    {t('contracts:form.fields.termsSection')}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoFixHigh />}
                    onClick={() => handleGenerateAI('terms_and_conditions')}
                    disabled={isGenerating}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                  >
                    Rédiger avec l'IA
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('contracts:form.fields.terms')}
                  </Typography>
                </Box>
                <Box sx={{ 
                  '.ql-editor': { minHeight: 300, fontSize: '1rem', fontFamily: 'inherit' },
                  '.ql-container': { borderRadius: '0 0 8px 8px', borderColor: 'divider' },
                  '.ql-toolbar': { borderRadius: '8px 8px 0 0', borderColor: 'divider' }
                }}>
                  <ReactQuill
                    theme="snow"
                    value={formData.terms_and_conditions}
                    onChange={(val) => setFormData(prev => ({ ...prev, terms_and_conditions: val }))}
                    placeholder={t('contracts:form.fields.termsPlaceholder')}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, mt: 1 }}>
                  <Typography variant="subtitle1" fontWeight="600">
                    {t('contracts:form.fields.paymentTerms')}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    color="secondary"
                    startIcon={isGenerating ? <CircularProgress size={16} /> : <RateReview />}
                    onClick={() => handleGenerateAI('payment_terms')}
                    disabled={isGenerating}
                    sx={{ textTransform: 'none' }}
                  >
                    Générer clauses de paiement
                  </Button>
                </Box>
                <Box sx={{ 
                  '.ql-editor': { minHeight: 150, fontSize: '1rem', fontFamily: 'inherit' },
                  '.ql-container': { borderRadius: '0 0 8px 8px', borderColor: 'divider' },
                  '.ql-toolbar': { borderRadius: '8px 8px 0 0', borderColor: 'divider' }
                }}>
                  <ReactQuill
                    theme="snow"
                    value={formData.payment_terms}
                    onChange={(val) => setFormData(prev => ({ ...prev, payment_terms: val }))}
                    placeholder={t('contracts:form.fields.paymentTermsPlaceholder')}
                  />
                </Box>
              </Grid>

              {/* Options de renouvellement */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('contracts:form.fields.renewalAndAlerts')}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="auto_renewal"
                      checked={formData.auto_renewal}
                      onChange={handleChange}
                    />
                  }
                  label={t('contracts:form.fields.autoRenewal')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('contracts:form.fields.renewalNoticeDays')}
                  name="renewal_notice_days"
                  value={formData.renewal_notice_days}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
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
                />
              </Grid>

              {/* Notes internes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('contracts:form.fields.internalNotes')}
                  name="internal_notes"
                  value={formData.internal_notes}
                  onChange={handleChange}
                  placeholder={t('contracts:form.fields.notesPlaceholder')}
                />
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => navigate('/contracts')}
                  >
                    {t('common:cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Save />}
                    disabled={submitting}
                  >
                    {submitting ? t('common:saving') : t('common:save')}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
      </Box>

      {/* Dialog Assistant IA */}
      <Dialog
        open={aiAssistantOpen}
        onClose={() => !isGenerating && setAiAssistantOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="secondary" />
            Assistant de Création de Contrat
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', height: '400px', p: 2, bgcolor: '#f8fafc' }}>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, pb: 2 }}>
            {aiMessages.filter(msg => msg.role !== 'system').map((msg, idx) => (
              <Box 
                key={idx} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' 
                }}
              >
                <Box sx={{ 
                  maxWidth: '80%', 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                  color: msg.role === 'user' ? 'white' : 'text.primary',
                  boxShadow: 1
                }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{msg.content}</Typography>
                </Box>
              </Box>
            ))}
            {isGenerating && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Box sx={{ maxWidth: '80%', p: 2, borderRadius: 2, bgcolor: 'white', boxShadow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">L'IA réfléchit...</Typography>
                </Box>
              </Box>
            )}
            <div ref={aiMessagesEndRef} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'white' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Tapez votre réponse ici..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            disabled={isGenerating}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendAIAssistant();
              }
            }}
            InputProps={{
              sx: { borderRadius: 3, bgcolor: '#f1f5f9' },
            }}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSendAIAssistant}
            disabled={isGenerating || !aiInput.trim()}
            sx={{ borderRadius: 3, minWidth: '40px', p: '8px' }}
          >
            <Send />
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ContractForm;
