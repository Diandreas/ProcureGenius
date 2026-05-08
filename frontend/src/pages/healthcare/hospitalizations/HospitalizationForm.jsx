import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, FormControl, FormHelperText, Grid, InputLabel, MenuItem,
  Select, TextField, Typography, useMediaQuery, useTheme
} from '@mui/material';
import {
  Download as DownloadIcon,
  LocalHospital as HospitalIcon,
  Save as SaveIcon,
  ExitToApp as DischargeIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { DateTimePicker, DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import hospitalizationAPI from '../../../services/hospitalizationAPI';
import patientAPI from '../../../services/patientAPI';
import BackButton from '../../../components/navigation/BackButton';

const STATUS_OPTIONS = [
  { value: 'admitted',    label: 'Admis' },
  { value: 'discharged',  label: 'Sorti' },
  { value: 'transferred', label: 'Transféré' },
];

const emptyForm = {
  patient: '',
  admission_date: dayjs(),
  discharge_date: null,
  admission_reason: '',
  diagnosis: '',
  treatment_during_stay: '',
  discharge_summary: '',
  follow_up_instructions: '',
  prescribed_treatment_after: '',
  next_appointment_date: null,
  status: 'admitted',
};

export default function HospitalizationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState(emptyForm);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) loadHospitalization();
  }, [id]);

  const loadHospitalization = async () => {
    setLoading(true);
    try {
      const data = await hospitalizationAPI.get(id);
      setFormData({
        patient: data.patient,
        admission_date: data.admission_date ? dayjs(data.admission_date) : dayjs(),
        discharge_date: data.discharge_date ? dayjs(data.discharge_date) : null,
        admission_reason: data.admission_reason || '',
        diagnosis: data.diagnosis || '',
        treatment_during_stay: data.treatment_during_stay || '',
        discharge_summary: data.discharge_summary || '',
        follow_up_instructions: data.follow_up_instructions || '',
        prescribed_treatment_after: data.prescribed_treatment_after || '',
        next_appointment_date: data.next_appointment_date ? dayjs(data.next_appointment_date) : null,
        status: data.status || 'admitted',
      });
      if (data.patient_details) {
        setSelectedPatient(data.patient_details);
      }
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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!formData.patient) e.patient = 'Veuillez sélectionner un patient';
    if (!formData.admission_date) e.admission_date = 'Date d\'admission requise';
    return e;
  };

  const buildPayload = () => ({
    patient: formData.patient,
    admission_date: formData.admission_date?.toISOString(),
    discharge_date: formData.discharge_date?.toISOString() || null,
    admission_reason: formData.admission_reason,
    diagnosis: formData.diagnosis,
    treatment_during_stay: formData.treatment_during_stay,
    discharge_summary: formData.discharge_summary,
    follow_up_instructions: formData.follow_up_instructions,
    prescribed_treatment_after: formData.prescribed_treatment_after,
    next_appointment_date: formData.next_appointment_date?.format('YYYY-MM-DD') || null,
    status: formData.status,
  });

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await hospitalizationAPI.update(id, payload);
        enqueueSnackbar('Hospitalisation mise à jour', { variant: 'success' });
      } else {
        await hospitalizationAPI.create(payload);
        enqueueSnackbar('Hospitalisation créée', { variant: 'success' });
        navigate('/healthcare/hospitalizations');
      }
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
      const blob = await hospitalizationAPI.getDischargePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sortie_${selectedPatient?.name || 'patient'}.pdf`;
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

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
      <BackButton />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HospitalIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            {isEdit ? 'Fiche d\'hospitalisation' : 'Nouvelle hospitalisation'}
          </Typography>
          {isEdit && (
            <Chip
              label={STATUS_OPTIONS.find(s => s.value === formData.status)?.label || formData.status}
              color={formData.status === 'admitted' ? 'primary' : formData.status === 'discharged' ? 'success' : 'warning'}
              size="small"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isEdit && formData.status === 'discharged' && (
            <Button
              variant="outlined"
              startIcon={downloading ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={handleDownloadPDF}
              disabled={downloading}
              size="small"
            >
              Fiche de sortie PDF
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

          {/* Section: Identification */}
          {sectionLabel('Identification du patient')}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
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
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formData.status}
                  label="Statut"
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  {STATUS_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Date d'admission *"
                value={formData.admission_date}
                onChange={(v) => handleChange('admission_date', v)}
                slotProps={{
                  textField: {
                    size: 'small', fullWidth: true,
                    error: Boolean(errors.admission_date),
                    helperText: errors.admission_date
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Date de sortie"
                value={formData.discharge_date}
                onChange={(v) => handleChange('discharge_date', v)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
          </Grid>

          {/* Section: Médical */}
          {sectionLabel('Informations médicales')}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Motif d'hospitalisation"
                value={formData.admission_reason}
                onChange={(e) => handleChange('admission_reason', e.target.value)}
                multiline rows={3} fullWidth size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Diagnostic"
                value={formData.diagnosis}
                onChange={(e) => handleChange('diagnosis', e.target.value)}
                multiline rows={3} fullWidth size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Traitement reçu pendant le séjour"
                value={formData.treatment_during_stay}
                onChange={(e) => handleChange('treatment_during_stay', e.target.value)}
                multiline rows={3} fullWidth size="small"
              />
            </Grid>
          </Grid>

          {/* Section: Sortie */}
          {sectionLabel('Informations de sortie')}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Résumé de l'évolution clinique"
                value={formData.discharge_summary}
                onChange={(e) => handleChange('discharge_summary', e.target.value)}
                multiline rows={3} fullWidth size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Ordonnance de sortie / Traitement prescrit"
                value={formData.prescribed_treatment_after}
                onChange={(e) => handleChange('prescribed_treatment_after', e.target.value)}
                multiline rows={3} fullWidth size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Recommandations & suivi"
                value={formData.follow_up_instructions}
                onChange={(e) => handleChange('follow_up_instructions', e.target.value)}
                multiline rows={3} fullWidth size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Prochain RDV de suivi"
                value={formData.next_appointment_date}
                onChange={(v) => handleChange('next_appointment_date', v)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Enregistrer
        </Button>
      </Box>
      </LocalizationProvider>
    </Box>
  );
}
