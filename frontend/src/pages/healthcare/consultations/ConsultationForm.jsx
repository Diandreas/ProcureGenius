import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Divider,
    Stack,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Checkbox,
    Chip,
    Tabs,
    Tab,
    CircularProgress
} from '@mui/material';
import {
    Save as SaveIcon,
    CheckCircle as CompleteIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon,
    History as HistoryIcon,
    Person as PersonIcon,
    HealthAndSafety as VitalsIcon,
    Assignment as ExamIcon,
    Medication as RxIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import consultationAPI from '../../../services/consultationAPI';
import patientAPI from '../../../services/patientAPI';
import pharmacyAPI from '../../../services/pharmacyAPI';
import laboratoryAPI from '../../../services/laboratoryAPI';
import ConsultationTimer from '../../../components/healthcare/ConsultationTimer';

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
};

const ConsultationForm = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();

    const isNew = !id;
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const [patients, setPatients] = useState([]);
    const [medications, setMedications] = useState([]);
    const [labTests, setLabTests] = useState([]);

    const [formData, setFormData] = useState({
        patient: null,
        consultation_date: new Date().toISOString().split('T')[0],
        chief_complaint: '',
        history_of_present_illness: '',
        antecedents_medical: '',
        antecedents_surgical: '',
        antecedents_immuno_allergies: '',
        antecedents_gyneco_obs: '',
        antecedents_lifestyle: '',
        antecedents_family: '',
        enquetes_systeme: '',
        physical_examination: '',
        diagnosis: '',
        complementary_exams: '',
        imaging: '',
        treatment_plan: '',
        temperature: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        heart_rate: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        blood_glucose: '',
        weight: '',
        height: '',
        bmi: '',
        started_at: null,
        ended_at: null,
        medications: [],
        lab_tests: []
    });

    useEffect(() => {
        const initialize = async () => {
            try {
                console.log("Initializing Consultation Form, ID:", id);
                setInitializing(true);
                
                const [patData, medData, labData] = await Promise.all([
                    patientAPI.getPatients({ page_size: 100 }),
                    pharmacyAPI.getMedications({ page_size: 100 }),
                    laboratoryAPI.getTests({ page_size: 200, is_active: true })
                ]);
                
                setPatients(patData.results || patData || []);
                setMedications(medData.results || medData || []);
                setLabTests(labData.results || labData || []);

                if (id) {
                    const data = await consultationAPI.getConsultation(id);
                    console.log("Loaded Consultation Data:", data);
                    
                    let medicationsList = [];
                    if (data.prescriptions && data.prescriptions.length > 0) {
                        const prescription = data.prescriptions[0];
                        medicationsList = prescription.items.map(item => ({
                            medication: item.medication ? { id: item.medication, name: item.medication_name } : null,
                            medication_name: item.medication_name || '',
                            dosage: item.dosage || '',
                            frequency: item.frequency || '',
                            duration: item.duration || '',
                            instructions: item.instructions || '',
                            quantity: item.quantity_prescribed || 1,
                            is_external: !item.medication
                        }));
                    }

                    setFormData({
                        patient: { id: data.patient, name: data.patient_name },
                        consultation_date: data.consultation_date?.split('T')[0] || new Date().toISOString().split('T')[0],
                        chief_complaint: data.chief_complaint || '',
                        history_of_present_illness: data.history_of_present_illness || '',
                        antecedents_medical: data.antecedents_medical || '',
                        antecedents_surgical: data.antecedents_surgical || '',
                        antecedents_immuno_allergies: data.antecedents_immuno_allergies || '',
                        antecedents_gyneco_obs: data.antecedents_gyneco_obs || '',
                        antecedents_lifestyle: data.antecedents_lifestyle || '',
                        antecedents_family: data.antecedents_family || '',
                        enquetes_systeme: data.enquetes_systeme || '',
                        physical_examination: data.physical_examination || '',
                        diagnosis: data.diagnosis || '',
                        complementary_exams: data.complementary_exams || '',
                        imaging: data.imaging || '',
                        treatment_plan: data.treatment_plan || '',
                        temperature: data.temperature || '',
                        blood_pressure_systolic: data.blood_pressure_systolic || '',
                        blood_pressure_diastolic: data.blood_pressure_diastolic || '',
                        heart_rate: data.heart_rate || '',
                        oxygen_saturation: data.oxygen_saturation || '',
                        respiratory_rate: data.respiratory_rate || '',
                        blood_glucose: data.blood_glucose || '',
                        weight: data.weight || '',
                        height: data.height || '',
                        bmi: data.bmi || '',
                        started_at: data.started_at || null,
                        ended_at: data.ended_at || null,
                        medications: medicationsList,
                        lab_tests: data.prescribed_lab_tests ? data.prescribed_lab_tests.map(t => typeof t === 'object' ? t.id : t) : []
                    });
                } else {
                    const prePatientId = searchParams.get('patientId');
                    if (prePatientId) {
                        const pat = await patientAPI.getPatient(prePatientId);
                        setFormData(prev => ({ ...prev, patient: { id: pat.id, name: pat.name } }));
                    }
                }
            } catch (error) {
                console.error('Initialization error:', error);
                enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
            } finally {
                setInitializing(false);
            }
        };
        initialize();
    }, [id, searchParams, enqueueSnackbar]);

    useEffect(() => {
        if (formData.weight && formData.height) {
            const w = parseFloat(formData.weight);
            const hM = parseFloat(formData.height) / 100;
            if (w > 0 && hM > 0) {
                const bmiValue = (w / (hM * hM)).toFixed(1);
                if (bmiValue !== formData.bmi) {
                    setFormData(prev => ({ ...prev, bmi: bmiValue }));
                }
            }
        }
    }, [formData.weight, formData.height, formData.bmi]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value.replace(',', '.') }));
    };

    const handlePatientSelect = (event, newPatient) => {
        setFormData(prev => ({ ...prev, patient: newPatient }));
        if (newPatient && isNew && !formData.started_at) {
            setFormData(prev => ({ ...prev, started_at: new Date().toISOString() }));
        }
    };

    const handleMedicationChange = (index, field, value) => {
        const newMeds = [...formData.medications];
        newMeds[index][field] = value;
        setFormData(prev => ({ ...prev, medications: newMeds }));
    };

    const handleSubmit = async (statusArg = 'in_consultation') => {
        if (!formData.patient) {
            enqueueSnackbar('Sélectionner un patient', { variant: 'warning' });
            setTabValue(0);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient: formData.patient.id,
                chief_complaint: formData.chief_complaint,
                history_of_present_illness: formData.history_of_present_illness,
                antecedents_medical: formData.antecedents_medical,
                antecedents_surgical: formData.antecedents_surgical,
                antecedents_immuno_allergies: formData.antecedents_immuno_allergies,
                antecedents_gyneco_obs: formData.antecedents_gyneco_obs,
                antecedents_lifestyle: formData.antecedents_lifestyle,
                antecedents_family: formData.antecedents_family,
                enquetes_systeme: formData.enquetes_systeme,
                physical_examination: formData.physical_examination,
                diagnosis: formData.diagnosis,
                complementary_exams: formData.complementary_exams,
                imaging: formData.imaging,
                treatment_plan: formData.treatment_plan,
                prescribed_lab_tests: formData.lab_tests,
                temperature: formData.temperature || null,
                blood_pressure_systolic: formData.blood_pressure_systolic || null,
                blood_pressure_diastolic: formData.blood_pressure_diastolic || null,
                heart_rate: formData.heart_rate || null,
                oxygen_saturation: formData.oxygen_saturation || null,
                respiratory_rate: formData.respiratory_rate || null,
                blood_glucose: formData.blood_glucose || null,
                weight: formData.weight || null,
                height: formData.height || null,
                started_at: formData.started_at,
                ended_at: statusArg === 'completed' ? (formData.ended_at || new Date().toISOString()) : formData.ended_at
            };

            console.log("Submitting Consultation, Payload:", payload);

            let consultId = id;
            if (isNew) {
                const res = await consultationAPI.createConsultation(payload);
                consultId = res.id;
            } else {
                await consultationAPI.updateConsultation(id, payload);
            }

            if (formData.medications.length > 0) {
                await consultationAPI.createPrescription({
                    patient_id: formData.patient.id,
                    consultation_id: consultId,
                    items: formData.medications.map(m => ({
                        ...(m.is_external ? { medication_name: m.medication_name, medication_id: null } : { medication_id: m.medication?.id, medication_name: m.medication?.name }),
                        dosage: m.dosage,
                        frequency: m.frequency,
                        duration: m.duration,
                        instructions: m.instructions,
                        quantity_prescribed: parseInt(m.quantity) || 1
                    }))
                });
            }

            if (statusArg === 'completed') {
                await consultationAPI.completeConsultation(consultId);
            }

            enqueueSnackbar('Dossier médical enregistré', { variant: 'success' });
            navigate(`/healthcare/consultations/${consultId}`);
        } catch (error) {
            console.error('Save error:', error);
            enqueueSnackbar(error.response?.data?.detail || 'Erreur lors de l\'enregistrement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (initializing) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5, alignItems: 'center', minHeight: '50vh' }}><CircularProgress /><Typography sx={{ ml: 2 }}>Initialisation du dossier...</Typography></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/consultations')}>Retour</Button>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>Consultation</Typography>
                </Stack>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button data-testid="consult-btn-save" variant="outlined" startIcon={<SaveIcon />} onClick={() => handleSubmit('in_consultation')} disabled={loading}>Enregistrer</Button>
                    <Button data-testid="consult-btn-terminate" variant="contained" startIcon={<CompleteIcon />} color="success" onClick={() => handleSubmit('completed')} disabled={loading}>Terminer</Button>
                </Box>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
                    <Tab data-testid="consult-tab-vitals" icon={<PersonIcon />} label="Vitals" />
                    <Tab data-testid="consult-tab-history" icon={<HistoryIcon />} label="Histoire" />
                    <Tab data-testid="consult-tab-exam" icon={<ExamIcon />} label="Examen" />
                    <Tab data-testid="consult-tab-treatment" icon={<RxIcon />} label="Traitement" />
                </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Identification</Typography>
                                {isNew ? (
                                    <Autocomplete
                                        options={patients}
                                        getOptionLabel={(o) => o.name || ''}
                                        value={formData.patient}
                                        onChange={handlePatientSelect}
                                        renderInput={(p) => <TextField {...p} label="Rechercher Patient" inputProps={{...p.inputProps, 'data-testid': 'consult-input-patient'}} />}
                                    />
                                ) : (
                                    <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>{formData.patient?.name}</Typography>
                                )}
                                <Box sx={{ mt: 3 }}>
                                    <ConsultationTimer
                                        onStart={(t) => setFormData(prev => ({ ...prev, started_at: t }))}
                                        onEnd={(t) => setFormData(prev => ({ ...prev, ended_at: t }))}
                                        initialStartTime={formData.started_at}
                                        initialEndTime={formData.ended_at}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom color="primary">Signes Vitaux</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} sm={3}><TextField label="T° (°C)" name="temperature" value={formData.temperature} onChange={handleInputChange} fullWidth size="small" inputProps={{'data-testid':'consult-input-temp'}} /></Grid>
                                    <Grid item xs={6} sm={3}><TextField label="TAS (mmHg)" name="blood_pressure_systolic" value={formData.blood_pressure_systolic} onChange={handleInputChange} fullWidth size="small" inputProps={{'data-testid':'consult-input-tas'}} /></Grid>
                                    <Grid item xs={6} sm={3}><TextField label="TAD (mmHg)" name="blood_pressure_diastolic" value={formData.blood_pressure_diastolic} onChange={handleInputChange} fullWidth size="small" inputProps={{'data-testid':'consult-input-tad'}} /></Grid>
                                    <Grid item xs={6} sm={3}><TextField label="FC (bpm)" name="heart_rate" value={formData.heart_rate} onChange={handleInputChange} fullWidth size="small" inputProps={{'data-testid':'consult-input-fc'}} /></Grid>
                                    <Grid item xs={6} sm={3}><TextField label="SpO2 (%)" name="oxygen_saturation" value={formData.oxygen_saturation} onChange={handleInputChange} fullWidth size="small" /></Grid>
                                    <Grid item xs={6} sm={3}><TextField label="FR" name="respiratory_rate" value={formData.respiratory_rate} onChange={handleInputChange} fullWidth size="small" /></Grid>
                                    <Grid item xs={6} sm={3}><TextField label="Gly (g/L)" name="blood_glucose" value={formData.blood_glucose} onChange={handleInputChange} fullWidth size="small" /></Grid>
                                    <Grid item xs={6} sm={3}><TextField label="Poids (kg)" name="weight" value={formData.weight} onChange={handleInputChange} fullWidth size="small" /></Grid>
                                    <Grid item xs={6} sm={3}><TextField label="Taille (cm)" name="height" value={formData.height} onChange={handleInputChange} fullWidth size="small" /></Grid>
                                    <Grid item xs={6} sm={3}>
                                        <TextField label="IMC" value={formData.bmi} disabled fullWidth size="small" 
                                            helperText={formData.bmi ? (formData.bmi < 18.5 ? "Insuffisance" : formData.bmi < 25 ? "Normal" : formData.bmi < 30 ? "Surpoids" : "Obésité") : ""} />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <Card>
                    <CardContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12}><TextField label="Motif de Consultation" name="chief_complaint" value={formData.chief_complaint} onChange={handleInputChange} multiline rows={2} fullWidth required /></Grid>
                            <Grid item xs={12}><TextField label="Histoire de la Maladie" name="history_of_present_illness" value={formData.history_of_present_illness} onChange={handleInputChange} multiline rows={3} fullWidth /></Grid>
                            <Grid item xs={12}><Divider sx={{ my: 1 }}>Antécédents</Divider></Grid>
                            <Grid item xs={12} md={6}><TextField label="Médicaux" name="antecedents_medical" value={formData.antecedents_medical} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Chirurgicaux" name="antecedents_surgical" value={formData.antecedents_surgical} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Immuno-allergies" name="antecedents_immuno_allergies" value={formData.antecedents_immuno_allergies} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Gynéco-obstétrique" name="antecedents_gyneco_obs" value={formData.antecedents_gyneco_obs} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Mode de vie" name="antecedents_lifestyle" value={formData.antecedents_lifestyle} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Familiaux" name="antecedents_family" value={formData.antecedents_family} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                <Card>
                    <CardContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12}><TextField label="Enquêtes & Systèmes" name="enquetes_systeme" value={formData.enquetes_systeme} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                            <Grid item xs={12}><TextField label="Examens Physiques" name="physical_examination" value={formData.physical_examination} onChange={handleInputChange} multiline rows={3} fullWidth /></Grid>
                            <Grid item xs={12}><TextField label="Diagnostic" name="diagnosis" value={formData.diagnosis} onChange={handleInputChange} multiline rows={2} fullWidth color="error" inputProps={{'data-testid':'consult-input-diagnosis'}} /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Examens Complémentaires" name="complementary_exams" value={formData.complementary_exams} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                            <Grid item xs={12} md={6}><TextField label="Imagerie" name="imaging" value={formData.imaging} onChange={handleInputChange} multiline rows={2} fullWidth /></Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
                <Stack spacing={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Traitement Recommandé</Typography>
                            <TextField label="Instructions & Plan de traitement" name="treatment_plan" value={formData.treatment_plan} onChange={handleInputChange} multiline rows={3} fullWidth />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">Ordonnance Médicamenteuse</Typography>
                                <Button data-testid="consult-btn-add-medication" startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setFormData(p => ({ ...p, medications: [...p.medications, { medication: null, medication_name: '', is_external: false, dosage: '', frequency: '', duration: '', instructions: '', quantity: 1 }] }))}>Ajouter Médicament</Button>
                            </Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Médicament</TableCell><TableCell>Dosage</TableCell><TableCell>Fréquence</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {formData.medications.map((m, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <Checkbox size="small" checked={m.is_external} onChange={(e) => handleMedicationChange(i, 'is_external', e.target.checked)} />
                                                        <Typography variant="caption">Externe</Typography>
                                                    </Box>
                                                    {m.is_external ? <TextField fullWidth size="small" value={m.medication_name} onChange={(e) => handleMedicationChange(i, 'medication_name', e.target.value)} placeholder="Nom du médicament" /> : 
                                                        <Autocomplete options={medications} getOptionLabel={(o) => o.name || ''} value={m.medication} onChange={(e, v) => handleMedicationChange(i, 'medication', v)} renderInput={(p) => <TextField {...p} size="small" placeholder="Rechercher..." />} />}
                                                </TableCell>
                                                <TableCell><TextField size="small" value={m.dosage} onChange={(e) => handleMedicationChange(i, 'dosage', e.target.value)} placeholder="500mg" /></TableCell>
                                                <TableCell><TextField size="small" value={m.frequency} onChange={(e) => handleMedicationChange(i, 'frequency', e.target.value)} placeholder="3x/j" /></TableCell>
                                                <TableCell><IconButton color="error" onClick={() => setFormData(p => ({ ...p, medications: p.medications.filter((_, idx) => idx !== i) }))}><DeleteIcon /></IconButton></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Examens de Laboratoire à Prescrire</Typography>
                            <Autocomplete multiple options={labTests} getOptionLabel={(o) => `${o.test_code} - ${o.name}`} value={labTests.filter(t => formData.lab_tests.includes(t.id))} onChange={(e, v) => setFormData(p => ({ ...p, lab_tests: v.map(t => t.id) }))} renderInput={(p) => <TextField {...p} placeholder="Sélectionner les examens" inputProps={{...p.inputProps, 'data-testid': 'consult-input-lab-tests'}} />} renderTags={(v, getTagProps) => v.map((o, i) => <Chip label={o.name} {...getTagProps({ index: i })} size="small" color="primary" />)} />
                        </CardContent>
                    </Card>
                </Stack>
            </TabPanel>
        </Box>
    );
};

export default ConsultationForm;
