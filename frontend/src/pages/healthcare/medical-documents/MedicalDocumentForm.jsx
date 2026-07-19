import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Autocomplete, Box, Button, Card, CardContent, CircularProgress,
  FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DocIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import medicalDocumentsAPI from '../../../services/medicalDocumentsAPI';
import patientAPI from '../../../services/patientAPI';
import BackButton from '../../../components/navigation/BackButton';

const DOCUMENT_TYPES = [
  { value: 'referral', label: 'Fiche de référence médicale' },
  { value: 'rest_note', label: 'Fiche de repos médical' },
  { value: 'nursing_care', label: 'Fiche de soins infirmiers' },
  { value: 'referral_counter_referral', label: 'Fiche de référence et contre-référence' },
];

const emptyForm = {
  document_type: 'referral',
  patient: '',
  issue_date: dayjs(),
  notes: '',
  referred_to: '',
  referral_reason: '',
  clinical_summary: '',
  exams_done: '',
  provisional_diagnosis: '',
  counter_referral_diagnosis: '',
  counter_referral_treatment: '',
  counter_referral_recommendations: '',
  rest_start_date: null,
  rest_end_date: null,
  rest_days: '',
  rest_reason: '',
  care_acts: '',
  vital_signs: '',
  next_care_date: null,
};

export default function MedicalDocumentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    ...emptyForm,
    document_type: searchParams.get('type') || 'referral',
  });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) {
      loadDocument();
      return;
    }
    const patientId = searchParams.get('patientId');
    if (patientId) {
      patientAPI.getPatient(patientId).then(p => {
        setSelectedPatient(p);
        handleChange('patient', p.id);
      }).catch(() => {});
    }
  }, [id]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const data = await medicalDocumentsAPI.get(id);
      setFormData({
        document_type: data.document_type,
        patient: data.patient,
        issue_date: data.issue_date ? dayjs(data.issue_date) : dayjs(),
        notes: data.notes || '',
        referred_to: data.referred_to || '',
        referral_reason: data.referral_reason || '',
        clinical_summary: data.clinical_summary || '',
        exams_done: data.exams_done || '',
        provisional_diagnosis: data.provisional_diagnosis || '',
        counter_referral_diagnosis: data.counter_referral_diagnosis || '',
        counter_referral_treatment: data.counter_referral_treatment || '',
        counter_referral_recommendations: data.counter_referral_recommendations || '',
        rest_start_date: data.rest_start_date ? dayjs(data.rest_start_date) : null,
        rest_end_date: data.rest_end_date ? dayjs(data.rest_end_date) : null,
        rest_days: data.rest_days ?? '',
        rest_reason: data.rest_reason || '',
        care_acts: data.care_acts || '',
        vital_signs: data.vital_signs || '',
        next_care_date: data.next_care_date ? dayjs(data.next_care_date) : null,
      });
      if (data.patient_details) setSelectedPatient(data.patient_details);
    } catch {
      enqueueSnackbar('Erreur lors du chargement', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await patientAPI.getPatients({ search: patientSearch, limit: 30 });
        setPatients(Array.isArray(data) ? data : data.results || []);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Recalcule automatiquement le nombre de jours de repos
      if ((field === 'rest_start_date' || field === 'rest_end_date') && next.rest_start_date && next.rest_end_date) {
        const days = next.rest_end_date.diff(next.rest_start_date, 'day') + 1;
        next.rest_days = days > 0 ? days : '';
      }
      return next;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData.patient) e.patient = 'Veuillez sélectionner un patient';
    return e;
  };

  const buildPayload = () => {
    const base = {
      document_type: formData.document_type,
      patient: formData.patient,
      issue_date: formData.issue_date?.format('YYYY-MM-DD'),
      notes: formData.notes,
    };
    if (formData.document_type === 'referral' || formData.document_type === 'referral_counter_referral') {
      Object.assign(base, {
        referred_to: formData.referred_to,
        referral_reason: formData.referral_reason,
        clinical_summary: formData.clinical_summary,
        exams_done: formData.exams_done,
        provisional_diagnosis: formData.provisional_diagnosis,
      });
    }
    if (formData.document_type === 'referral_counter_referral') {
      Object.assign(base, {
        counter_referral_diagnosis: formData.counter_referral_diagnosis,
        counter_referral_treatment: formData.counter_referral_treatment,
        counter_referral_recommendations: formData.counter_referral_recommendations,
      });
    }
    if (formData.document_type === 'rest_note') {
      Object.assign(base, {
        rest_start_date: formData.rest_start_date?.format('YYYY-MM-DD') || null,
        rest_end_date: formData.rest_end_date?.format('YYYY-MM-DD') || null,
        rest_days: formData.rest_days || null,
        rest_reason: formData.rest_reason,
      });
    }
    if (formData.document_type === 'nursing_care') {
      Object.assign(base, {
        care_acts: formData.care_acts,
        vital_signs: formData.vital_signs,
        next_care_date: formData.next_care_date?.format('YYYY-MM-DD') || null,
      });
    }
    return base;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      let saved;
      if (isEdit) {
        saved = await medicalDocumentsAPI.update(id, payload);
        enqueueSnackbar('Document mis à jour', { variant: 'success' });
      } else {
        saved = await medicalDocumentsAPI.create(payload);
        enqueueSnackbar('Document créé', { variant: 'success' });
      }
      navigate(`/healthcare/medical-documents/${saved.id}/edit`);
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Erreur lors de l\'enregistrement';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await medicalDocumentsAPI.getPDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Document_${selectedPatient?.name || 'patient'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      enqueueSnackbar('Erreur lors de la génération du PDF', { variant: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const sectionLabel = (label) => (
    <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1.5, color: 'primary.main', borderBottom: 1, borderColor: 'divider', pb: 0.5 }}>
      {label}
    </Typography>
  );

  const type = formData.document_type;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
      <BackButton />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DocIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            {isEdit ? 'Modifier le document' : 'Nouveau document médical'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isEdit && (
            <Button
              variant="outlined"
              startIcon={downloading ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={handleDownloadPDF}
              disabled={downloading}
              size="small"
            >
              Télécharger PDF
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            Enregistrer
          </Button>
        </Box>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

          {sectionLabel('Identification')}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" disabled={isEdit}>
                <InputLabel>Type de document</InputLabel>
                <Select
                  value={formData.document_type}
                  label="Type de document"
                  onChange={(e) => handleChange('document_type', e.target.value)}
                >
                  {DOCUMENT_TYPES.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date de délivrance"
                value={formData.issue_date}
                onChange={(v) => handleChange('issue_date', v)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={patients}
                getOptionLabel={(p) => p.name || ''}
                value={selectedPatient}
                onChange={(_, v) => {
                  setSelectedPatient(v);
                  handleChange('patient', v?.id || '');
                }}
                onInputChange={(_, v) => setPatientSearch(v)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Patient *"
                    size="small"
                    error={Boolean(errors.patient)}
                    helperText={errors.patient}
                  />
                )}
                noOptionsText="Aucun patient trouvé"
                disabled={isEdit}
              />
            </Grid>
          </Grid>

          {(type === 'referral' || type === 'referral_counter_referral') && (
            <>
              {sectionLabel(type === 'referral_counter_referral' ? 'Référence (partie 1)' : 'Référence')}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Structure / médecin destinataire"
                    value={formData.referred_to}
                    onChange={(e) => handleChange('referred_to', e.target.value)}
                    fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Motif de référence"
                    value={formData.referral_reason}
                    onChange={(e) => handleChange('referral_reason', e.target.value)}
                    multiline rows={2} fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Résumé clinique"
                    value={formData.clinical_summary}
                    onChange={(e) => handleChange('clinical_summary', e.target.value)}
                    multiline rows={3} fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Examens déjà réalisés"
                    value={formData.exams_done}
                    onChange={(e) => handleChange('exams_done', e.target.value)}
                    multiline rows={2} fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Diagnostic présomptif"
                    value={formData.provisional_diagnosis}
                    onChange={(e) => handleChange('provisional_diagnosis', e.target.value)}
                    multiline rows={2} fullWidth size="small"
                  />
                </Grid>
              </Grid>
            </>
          )}

          {type === 'referral_counter_referral' && (
            <>
              {sectionLabel('Contre-référence (partie 2 — retour de la structure destinataire)')}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Diagnostic retenu"
                    value={formData.counter_referral_diagnosis}
                    onChange={(e) => handleChange('counter_referral_diagnosis', e.target.value)}
                    multiline rows={2} fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Traitement donné"
                    value={formData.counter_referral_treatment}
                    onChange={(e) => handleChange('counter_referral_treatment', e.target.value)}
                    multiline rows={2} fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Recommandations de suivi"
                    value={formData.counter_referral_recommendations}
                    onChange={(e) => handleChange('counter_referral_recommendations', e.target.value)}
                    multiline rows={2} fullWidth size="small"
                  />
                </Grid>
              </Grid>
            </>
          )}

          {type === 'rest_note' && (
            <>
              {sectionLabel('Repos médical')}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Début du repos"
                    value={formData.rest_start_date}
                    onChange={(v) => handleChange('rest_start_date', v)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Fin du repos"
                    value={formData.rest_end_date}
                    onChange={(v) => handleChange('rest_end_date', v)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Nombre de jours"
                    value={formData.rest_days}
                    onChange={(e) => handleChange('rest_days', e.target.value)}
                    type="number" fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Motif du repos"
                    value={formData.rest_reason}
                    onChange={(e) => handleChange('rest_reason', e.target.value)}
                    fullWidth size="small"
                    placeholder="ex: Raisons médicales"
                  />
                </Grid>
              </Grid>
            </>
          )}

          {type === 'nursing_care' && (
            <>
              {sectionLabel('Soins infirmiers')}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Constantes (TA, température, pouls, saturation…)"
                    value={formData.vital_signs}
                    onChange={(e) => handleChange('vital_signs', e.target.value)}
                    multiline rows={2} fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Soins effectués"
                    value={formData.care_acts}
                    onChange={(e) => handleChange('care_acts', e.target.value)}
                    multiline rows={3} fullWidth size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Prochain soin prévu"
                    value={formData.next_care_date}
                    onChange={(v) => handleChange('next_care_date', v)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {sectionLabel('Notes')}
          <TextField
            label="Notes complémentaires"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            multiline rows={2} fullWidth size="small"
          />
        </CardContent>
      </Card>
      </LocalizationProvider>
    </Box>
  );
}
