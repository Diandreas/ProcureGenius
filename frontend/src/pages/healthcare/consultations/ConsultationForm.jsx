import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Box, Button, Card, CardContent, Grid, TextField, Typography, Stack, Autocomplete, IconButton,
    Checkbox, Chip, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails, Dialog,
    DialogTitle, DialogContent, DialogActions, List, ListItemButton, ListItemText, Tooltip, Paper,
} from '@mui/material';
import {
    Save as SaveIcon, CheckCircle as CompleteIcon, Add as AddIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon,
    Person as PersonIcon, Visibility as ViewIcon, ExpandMore as ExpandMoreIcon, Warning as WarningIcon,
    History as HistoryIcon, ContentCopy as CopyIcon, Science as ScienceIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import useCurrentUser from '../../../hooks/useCurrentUser';
import consultationAPI from '../../../services/consultationAPI';
import patientAPI from '../../../services/patientAPI';
import pharmacyAPI from '../../../services/pharmacyAPI';
import laboratoryAPI from '../../../services/laboratoryAPI';
import imagingAPI from '../../../services/imagingAPI';
import PatientQuickViewButton from '../../../components/patients/PatientQuickView';
import ConsultationTimer from '../../../components/healthcare/ConsultationTimer';
import QuickTemplate from '../../../components/healthcare/QuickTemplate';
import {
    HISTORY_TEMPLATES, ANTECEDENTS_MEDICAL_TEMPLATES, ANTECEDENTS_SURGICAL_TEMPLATES, ANTECEDENTS_ALLERGIES_TEMPLATES,
    ANTECEDENTS_GYNECO_TEMPLATES, ANTECEDENTS_LIFESTYLE_TEMPLATES, ANTECEDENTS_FAMILY_TEMPLATES, ENQUETES_SYSTEME_TEMPLATES,
    PHYSICAL_EXAM_TEMPLATES, TREATMENT_TEMPLATES,
} from '../../../constants/clinicalTemplates';
import Pastilles from '../../../components/consultation/Pastilles';
import SchemaCliquable, { FORMES_CORPS, VIEWBOX_CORPS } from '../../../components/consultation/SchemaCliquable';
import BlocGyneco, { resumeGyneco } from '../../../components/consultation/BlocGyneco';
import BlocCardio, { resumeCardio } from '../../../components/consultation/BlocCardio';
import BlocEsthetique, { resumeEsthetique } from '../../../components/consultation/BlocEsthetique';
import BlocPediatrie, { resumePediatrie } from '../../../components/consultation/BlocPediatrie';
import {
    SPECIALITES, MOTIFS, DIAGNOSTICS, ZONES_CORPS, basculerLigne, contientLigne, ageDepuis, libelleAge,
} from '../../../components/consultation/specialites';

// Consultation sur une seule page, adaptée à la spécialité : on touche des pastilles et des schémas,
// le texte reste modifiable. Les anciennes consultations s'ouvrent comme avant (spécialité « générale »).

const VIDE = {
    patient: null, chief_complaint: '', history_of_present_illness: '', antecedents_medical: '', antecedents_surgical: '',
    antecedents_immuno_allergies: '', antecedents_gyneco_obs: '', antecedents_lifestyle: '', antecedents_family: '',
    enquetes_systeme: '', physical_examination: '', diagnosis: '', complementary_exams: '', imaging: '', treatment_plan: '',
    temperature: '', blood_pressure_systolic: '', blood_pressure_diastolic: '', heart_rate: '', oxygen_saturation: '',
    respiratory_rate: '', blood_glucose: '', weight: '', height: '', bmi: '', started_at: null, ended_at: null,
    medications: [], lab_tests: [], imaging_exam_types: [],
    specialty: 'general', practitioner_name: '', specialty_data: {},
    follow_up_required: false, follow_up_date: '', patient_instructions: '',
};
const ANTECEDENTS = [
    ['antecedents_medical', 'Médicaux', ANTECEDENTS_MEDICAL_TEMPLATES], ['antecedents_surgical', 'Chirurgicaux', ANTECEDENTS_SURGICAL_TEMPLATES],
    ['antecedents_immuno_allergies', 'Allergies', ANTECEDENTS_ALLERGIES_TEMPLATES], ['antecedents_gyneco_obs', 'Gynéco-obstétrique', ANTECEDENTS_GYNECO_TEMPLATES],
    ['antecedents_lifestyle', 'Mode de vie', ANTECEDENTS_LIFESTYLE_TEMPLATES], ['antecedents_family', 'Familiaux', ANTECEDENTS_FAMILY_TEMPLATES],
];
const CONSTANTES = [
    ['temperature', 'T° (°C)', 'temperature'], ['blood_pressure_systolic', 'TAS (mmHg)', 'tas'], ['blood_pressure_diastolic', 'TAD (mmHg)', 'tad'],
    ['heart_rate', 'FC (bpm)', 'fc'], ['oxygen_saturation', 'SpO2 (%)', null], ['respiratory_rate', 'FR', null],
    ['blood_glucose', 'Glycémie (g/L)', null], ['weight', 'Poids (kg)', 'poids'], ['height', 'Taille (cm)', 'taille'],
];
const TESTID = { temperature: 'consult-input-temp', blood_pressure_systolic: 'consult-input-tas', blood_pressure_diastolic: 'consult-input-tad', heart_rate: 'consult-input-fc' };
const SUIVI = [['3 jours', 3], ['1 semaine', 7], ['2 semaines', 14], ['1 mois', 30], ['3 mois', 91]];
const CLE_SPECIALITE = 'consult_specialite_defaut';
const cleBrouillon = (id) => `consult_brouillon_${id || 'nouvelle'}`;
const lireStockage = (cle) => { try { return JSON.parse(localStorage.getItem(cle)); } catch { return null; } };
const ecrireStockage = (cle, v) => { try { v === null ? localStorage.removeItem(cle) : localStorage.setItem(cle, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const dansNJours = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// Recherche à la frappe (patients, médicaments) : tout le catalogue, pas seulement les 100 premiers
const RechercheAsync = ({ value, onChange, charger, getOptionLabel, label, placeholder, testId, autoFocus, size = 'medium' }) => {
    const [options, setOptions] = useState([]);
    const [saisie, setSaisie] = useState('');
    const [chargement, setChargement] = useState(false);
    useEffect(() => {
        let actif = true;
        const t = setTimeout(async () => {
            setChargement(true);
            try {
                const r = await charger(saisie);
                if (actif) setOptions(r.results || r || []);
            } catch { if (actif) setOptions([]); } finally { if (actif) setChargement(false); }
        }, 250);
        return () => { actif = false; clearTimeout(t); };
    }, [saisie, charger]);
    return (
        <Autocomplete
            value={value} onChange={(e, v) => onChange(v)} options={options} filterOptions={x => x}
            getOptionLabel={getOptionLabel} isOptionEqualToValue={(a, b) => a?.id === b?.id}
            onInputChange={(e, v, raison) => raison === 'input' && setSaisie(v)} loading={chargement}
            noOptionsText={saisie ? 'Aucun résultat' : 'Tapez pour rechercher'}
            renderInput={(p) => (
                <TextField {...p} label={label} placeholder={placeholder} size={size} autoFocus={autoFocus}
                    inputProps={{ ...p.inputProps, ...(testId ? { 'data-testid': testId } : {}) }}
                    InputProps={{ ...p.InputProps, endAdornment: <>{chargement && <CircularProgress size={16} />}{p.InputProps.endAdornment}</> }} />
            )}
        />
    );
};

const Section = ({ titre, sousTitre, children, action }) => (
    <Card sx={{ mb: 2 }}>
        <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{titre}</Typography>
                    {sousTitre && <Typography variant="caption" color="text.secondary">{sousTitre}</Typography>}
                </Box>
                {action}
            </Box>
            {children}
        </CardContent>
    </Card>
);

const ConsultationForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useCurrentUser();
    const isNew = !id;

    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [consultationStatus, setConsultationStatus] = useState(null);
    const [completedById, setCompletedById] = useState(null);
    const [completedByName, setCompletedByName] = useState('');
    const [labTests, setLabTests] = useState([]);
    const [imagingExamTypes, setImagingExamTypes] = useState([]);
    const [praticiens, setPraticiens] = useState([]);
    const [contexte, setContexte] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [brouillon, setBrouillon] = useState(null);
    const [ordosSimilaires, setOrdosSimilaires] = useState(null);
    const specialiteChoisie = useRef(false);
    const pret = useRef(false);

    const [formData, setFormData] = useState({ ...VIDE, consultation_date: new Date().toISOString().split('T')[0] });
    const maj = (champ, valeur) => setFormData(prev => ({ ...prev, [champ]: valeur }));

    const chargerContexte = useCallback(async (patientId, exclure) => {
        try {
            setContexte(await consultationAPI.getPatientContext(patientId, exclure));
        } catch { setContexte(null); }
    }, []);

    useEffect(() => {
        const initialize = async () => {
            try {
                setInitializing(true);
                const [labData, imgData, prat] = await Promise.all([
                    laboratoryAPI.getTests({ page_size: 300, is_active: true }),
                    imagingAPI.getExamTypes({ page_size: 300, is_active: true }),
                    consultationAPI.getPractitioners().catch(() => []),
                ]);
                setLabTests(labData.results || labData || []);
                setImagingExamTypes(imgData.results || imgData || []);
                setPraticiens(prat || []);

                if (id) {
                    const data = await consultationAPI.getConsultation(id);
                    let medicationsList = [];
                    const ordo = (data.prescriptions || []).find(p => p.status !== 'cancelled') || (data.prescriptions || [])[0];
                    if (ordo) {
                        medicationsList = ordo.items.map(item => ({
                            medication: item.medication ? { id: item.medication, name: item.medication_name } : null,
                            medication_name: item.medication_name || '', dosage: item.dosage || '', frequency: item.frequency || '',
                            duration: item.duration || '', instructions: item.instructions || '', quantity: item.quantity_prescribed || 1,
                            is_external: !item.medication,
                        }));
                    }
                    setConsultationStatus(data.status);
                    setCompletedById(data.completed_by);
                    setCompletedByName(data.completed_by_name || data.doctor_name || '');
                    setPhotos(data.photos || []);
                    specialiteChoisie.current = true;
                    const charge = { ...VIDE };
                    Object.keys(VIDE).forEach(k => { if (data[k] !== undefined && data[k] !== null) charge[k] = data[k]; });
                    setFormData({
                        ...charge,
                        patient: { id: data.patient, name: data.patient_name },
                        consultation_date: data.consultation_date?.split('T')[0] || new Date().toISOString().split('T')[0],
                        specialty: data.specialty || 'general',
                        specialty_data: data.specialty_data || {},
                        follow_up_date: data.follow_up_date || '',
                        medications: medicationsList,
                        lab_tests: (data.prescribed_lab_tests || []).map(t => (typeof t === 'object' ? t.id : t)),
                        imaging_exam_types: (data.prescribed_imaging_exam_types || []).map(t => (typeof t === 'object' ? t.id : t)),
                    });
                    chargerContexte(data.patient, id);
                    const b = lireStockage(cleBrouillon(id));
                    if (b && b.enregistreLe > new Date(data.updated_at).getTime()) setBrouillon(b);
                } else {
                    const defaut = lireStockage(CLE_SPECIALITE);
                    if (defaut) setFormData(prev => ({ ...prev, specialty: defaut }));
                    const prePatientId = searchParams.get('patientId');
                    if (prePatientId) {
                        const pat = await patientAPI.getPatient(prePatientId);
                        await choisirPatient({ id: pat.id, name: pat.name });
                    } else {
                        const b = lireStockage(cleBrouillon(null));
                        if (b?.formData?.patient) setBrouillon(b);
                    }
                }
            } catch (error) {
                console.error('Initialization error:', error);
                enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
            } finally {
                setInitializing(false);
                setTimeout(() => { pret.current = true; }, 0);
            }
        };
        initialize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // IMC calculé
    useEffect(() => {
        const w = parseFloat(formData.weight), h = parseFloat(formData.height) / 100;
        const bmi = w > 0 && h > 0 ? (w / (h * h)).toFixed(1) : '';
        if (bmi !== formData.bmi) setFormData(prev => ({ ...prev, bmi }));
    }, [formData.weight, formData.height, formData.bmi]);

    // Brouillon : rien n'est perdu si la page se ferme avant « Enregistrer »
    useEffect(() => {
        if (!pret.current || !formData.patient) return undefined;
        const t = setTimeout(() => ecrireStockage(cleBrouillon(id), { enregistreLe: Date.now(), formData }), 800);
        return () => clearTimeout(t);
    }, [formData, id]);

    const choisirPatient = async (patient) => {
        setFormData(prev => ({ ...prev, patient, started_at: prev.started_at || (patient ? new Date().toISOString() : null) }));
        setContexte(null);
        if (!patient) return;
        try {
            const [patData, ctx] = await Promise.all([patientAPI.getPatient(patient.id), consultationAPI.getPatientContext(patient.id)]);
            setContexte(ctx);
            setFormData(prev => {
                const suite = { ...prev };
                ANTECEDENTS.forEach(([k]) => { suite[k] = patData[k] || prev[k]; });
                const age = ageDepuis(ctx?.patient?.date_naissance);
                if (!specialiteChoisie.current && age && age.ans < 15) suite.specialty = 'pediatrics';
                // reprendre la dernière fiche de la spécialité (DDR, facteurs de risque, phototype…) sans les constats du jour
                const precedent = ctx?.derniere_par_specialite?.[suite.specialty]?.donnees;
                if (precedent && Object.keys(prev.specialty_data || {}).length === 0) suite.specialty_data = reprendre(precedent);
                return suite;
            });
        } catch (err) {
            console.warn('Contexte patient indisponible', err);
        }
    };

    // On garde ce qui dure d'une visite à l'autre ; les constats du jour repartent à zéro
    const reprendre = (d) => {
        const r = {};
        if (d.gyneco) r.gyneco = (({ ddr, enceinte, g, p, ev, a, cycle, contraception, frottis }) => ({ ddr, enceinte, g, p, ev, a, cycle, contraception, frottis }))(d.gyneco);
        if (d.cardio) r.cardio = { facteurs: d.cardio.facteurs, traitement_en_cours: d.cardio.traitement_en_cours };
        if (d.esthetique) r.esthetique = { phototype: d.esthetique.phototype, seances_total: d.esthetique.seances_total, seance: d.esthetique.seance ? +d.esthetique.seance + 1 : '', protocole: d.esthetique.protocole };
        return r;
    };

    const changerSpecialite = (code) => {
        specialiteChoisie.current = true;
        ecrireStockage(CLE_SPECIALITE, code);
        setFormData(prev => {
            const precedent = contexte?.derniere_par_specialite?.[code]?.donnees;
            const cle = SPECIALITES.find(s => s.code === code)?.cle;
            const donnees = { ...prev.specialty_data };
            if (cle && precedent && !donnees[cle]) Object.assign(donnees, reprendre(precedent));
            return { ...prev, specialty: code, specialty_data: donnees };
        });
    };

    const specialite = SPECIALITES.find(s => s.code === formData.specialty) || SPECIALITES[0];
    const age = ageDepuis(contexte?.patient?.date_naissance);
    const donneesSpe = (cle) => formData.specialty_data?.[cle] || {};
    const majSpe = (cle) => (v) => setFormData(prev => ({ ...prev, specialty_data: { ...prev.specialty_data, [cle]: v } }));
    const derniereMesure = useMemo(() => {
        const m = contexte?.mesures || [];
        return (cle) => { for (let i = m.length - 1; i >= 0; i -= 1) if (m[i][cle] !== null && m[i][cle] !== undefined && m[i][cle] !== '') return m[i]; return null; };
    }, [contexte]);

    const resume = () => {
        switch (formData.specialty) {
            case 'gynecology': return resumeGyneco(donneesSpe('gyneco'));
            case 'cardiology': return resumeCardio(donneesSpe('cardio'));
            case 'aesthetic': return resumeEsthetique(donneesSpe('esthetique'));
            case 'pediatrics': return resumePediatrie(donneesSpe('pediatrie'), age);
            default: return [];
        }
    };

    // Examens proposés par les diagnostics cochés
    const diagnosticsCoches = (DIAGNOSTICS[formData.specialty] || []).filter(x => contientLigne(formData.diagnosis, x.d));
    const testsProposes = useMemo(() => {
        const codes = [...new Set(diagnosticsCoches.flatMap(x => x.labo))];
        return codes.map(c => labTests.find(t => t.test_code === c)).filter(t => t && !formData.lab_tests.includes(t.id));
    }, [diagnosticsCoches, labTests, formData.lab_tests]);
    const imageriesProposees = useMemo(() => {
        const motifs = [...new Set(diagnosticsCoches.flatMap(x => x.img || []))];
        const trouves = motifs.map(m => imagingExamTypes.find(t => new RegExp(m, 'i').test(t.exam_code || '') || new RegExp(m, 'i').test(t.name || '')));
        return [...new Set(trouves.filter(t => t && !formData.imaging_exam_types.includes(t.id)))];
    }, [diagnosticsCoches, imagingExamTypes, formData.imaging_exam_types]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        maj(name, value.replace(',', '.'));
    };
    const handleMedicationChange = (index, field, value) => {
        setFormData(prev => {
            const meds = prev.medications.map((m, i) => (i === index ? { ...m, [field]: value } : m));
            return { ...prev, medications: meds };
        });
    };
    const ajouterMedicament = (m = {}) => setFormData(p => ({
        ...p, medications: [...p.medications, { medication: null, medication_name: '', is_external: false, dosage: '', frequency: '', duration: '', instructions: '', quantity: 1, ...m }],
    }));

    const chercherOrdonnances = async () => {
        const premiere = (formData.diagnosis || '').split('\n').map(x => x.trim()).find(Boolean);
        if (!premiere) { enqueueSnackbar('Indiquez d\'abord un diagnostic', { variant: 'info' }); return; }
        try {
            setOrdosSimilaires({ diagnostic: premiere, liste: await consultationAPI.getSimilarPrescriptions(premiere.slice(0, 40)) });
        } catch { enqueueSnackbar('Recherche impossible', { variant: 'error' }); }
    };
    const reprendreOrdonnance = (o) => {
        o.items.forEach(i => ajouterMedicament({
            medication: i.medication_id ? { id: i.medication_id, name: i.medication_name } : null, medication_name: i.medication_name,
            is_external: !i.medication_id, dosage: i.dosage, frequency: i.frequency, duration: i.duration, instructions: i.instructions, quantity: i.quantity || 1,
        }));
        setOrdosSimilaires(null);
    };

    const ajouterPhoto = async (fichier, moment) => {
        try {
            const p = await consultationAPI.addPhoto(id, fichier, moment);
            setPhotos(prev => [...prev, p]);
        } catch (e) {
            enqueueSnackbar(e.response?.data?.error || 'Photo non enregistrée', { variant: 'error' });
        }
    };
    const supprimerPhoto = async (photoId) => {
        try {
            await consultationAPI.deletePhoto(id, photoId);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch { enqueueSnackbar('Photo non supprimée', { variant: 'error' }); }
    };

    const handleSubmit = async (statusArg = 'in_consultation') => {
        if (!formData.patient) {
            enqueueSnackbar('Sélectionner un patient', { variant: 'warning' });
            return;
        }
        setLoading(true);
        try {
            const lignes = resume();
            const payload = {
                patient: formData.patient.id,
                ...Object.fromEntries(['chief_complaint', 'history_of_present_illness', ...ANTECEDENTS.map(a => a[0]), 'enquetes_systeme',
                    'physical_examination', 'diagnosis', 'complementary_exams', 'imaging', 'treatment_plan', 'patient_instructions', 'practitioner_name',
                    'specialty'].map(k => [k, formData[k] || ''])),
                specialty_data: { ...formData.specialty_data, resume: lignes.join('\n') },
                follow_up_required: !!formData.follow_up_date,
                follow_up_date: formData.follow_up_date || null,
                prescribed_lab_tests: formData.lab_tests,
                prescribed_imaging_exam_types: formData.imaging_exam_types,
                ...Object.fromEntries(CONSTANTES.map(([k]) => [k, formData[k] === '' ? null : formData[k]])),
                started_at: formData.started_at,
                ended_at: statusArg === 'completed' ? (formData.ended_at || new Date().toISOString()) : formData.ended_at,
            };

            let consultId = id;
            if (isNew) {
                const res = await consultationAPI.createConsultation(payload);
                consultId = res.id;
            } else {
                await consultationAPI.updateConsultation(id, payload);
            }

            const meds = formData.medications.filter(m => (m.is_external ? m.medication_name?.trim() : m.medication?.id));
            if (meds.length > 0) {
                // l'ordonnance non délivrée de la consultation est remplacée (plus de doublon)
                await consultationAPI.createPrescription({
                    patient_id: formData.patient.id,
                    consultation_id: consultId,
                    items: meds.map(m => ({
                        ...(m.is_external ? { medication_name: m.medication_name, medication_id: null } : { medication_id: m.medication?.id, medication_name: m.medication?.name }),
                        dosage: m.dosage || '', frequency: m.frequency || '', duration: m.duration || '', instructions: m.instructions || '',
                        quantity_prescribed: parseInt(m.quantity, 10) || 1,
                    })),
                });
            } else if (!isNew) {
                await consultationAPI.clearPrescription(consultId);
            }

            if (statusArg === 'completed') await consultationAPI.completeConsultation(consultId);
            ecrireStockage(cleBrouillon(id), null);
            ecrireStockage(cleBrouillon(null), null);
            enqueueSnackbar(statusArg === 'completed' ? 'Consultation terminée' : 'Consultation enregistrée', { variant: 'success' });
            if (statusArg === 'completed') navigate(`/healthcare/consultations/${consultId}`);
            else if (isNew) navigate(`/healthcare/consultations/${consultId}/edit`, { replace: true });
        } catch (error) {
            console.error('Save error:', error);
            const d = error.response?.data;
            enqueueSnackbar(d?.detail || d?.error || (d && typeof d === 'object' ? JSON.stringify(d).slice(0, 200) : 'Erreur lors de l\'enregistrement'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (initializing) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5, alignItems: 'center', minHeight: '50vh' }}><CircularProgress /><Typography sx={{ ml: 2 }}>Ouverture du dossier…</Typography></Box>;
    }

    const isCompleted = consultationStatus === 'completed';
    const canEdit = !isCompleted || (completedById === user?.id);
    const allergies = (contexte?.patient?.allergies || formData.antecedents_immuno_allergies || '').trim();
    const derniere = contexte?.derniere_visite;
    const constatsCorps = formData.specialty === 'general' || formData.specialty === 'pediatrics';

    return (
        <Box sx={{ pb: 4 }}>
            {/* Barre du haut, toujours visible */}
            <Paper elevation={2} sx={{ position: 'sticky', top: { xs: 64, md: 84 }, zIndex: 1000, borderRadius: 2, mb: 2, py: 1, px: { xs: 1, sm: 2 }, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <IconButton onClick={() => navigate('/healthcare/consultations')} aria-label="Retour"><ArrowBackIcon /></IconButton>
                <Typography variant="h5" sx={{ fontWeight: 600, flex: 1, minWidth: 160 }} noWrap>
                    {formData.patient?.name || 'Nouvelle consultation'}
                </Typography>
                {consultationStatus && <Chip label={isCompleted ? 'Terminée' : 'En cours'} color={isCompleted ? 'success' : 'warning'} size="small" />}
                {formData.patient?.id && <PatientQuickViewButton patientId={formData.patient.id} patientName={formData.patient.name} size="small" />}
                {isCompleted && !canEdit ? (
                    <Button variant="contained" startIcon={<ViewIcon />} onClick={() => navigate(`/healthcare/consultations/${id}`)}>Voir le dossier</Button>
                ) : (
                    <>
                        <Button data-testid="consult-btn-save" variant="outlined" startIcon={<SaveIcon />} onClick={() => handleSubmit('in_consultation')} disabled={loading}>Enregistrer</Button>
                        <Button data-testid="consult-btn-terminate" variant="contained" color="success" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CompleteIcon />} onClick={() => handleSubmit('completed')} disabled={loading}>Terminer</Button>
                    </>
                )}
            </Paper>

            {brouillon && (
                <Alert severity="info" sx={{ mb: 2 }} action={(
                    <>
                        <Button color="inherit" size="small" onClick={() => { setFormData(brouillon.formData); setBrouillon(null); }}>Reprendre</Button>
                        <Button color="inherit" size="small" onClick={() => { ecrireStockage(cleBrouillon(id), null); setBrouillon(null); }}>Ignorer</Button>
                    </>
                )}>
                    Une saisie non enregistrée du {new Date(brouillon.enregistreLe).toLocaleString('fr-FR')}{brouillon.formData?.patient ? ` (${brouillon.formData.patient.name})` : ''} a été retrouvée.
                </Alert>
            )}
            {isCompleted && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Consultation terminée{completedByName ? ` — par ${completedByName}` : ''}{canEdit ? ' (vous pouvez la modifier)' : ''}
                </Alert>
            )}

            <Box sx={{ opacity: canEdit ? 1 : 0.72, pointerEvents: canEdit ? 'auto' : 'none' }}>
                {/* Patient */}
                {isNew && !formData.patient ? (
                    <Section titre="Patient">
                        <RechercheAsync value={formData.patient} onChange={choisirPatient} autoFocus
                            charger={(q) => patientAPI.getPatients({ search: q, page_size: 20 })}
                            getOptionLabel={(o) => (o ? `${o.name}${o.patient_number ? ` — ${o.patient_number}` : ''}${o.phone ? ` — ${o.phone}` : ''}` : '')}
                            label="Rechercher le patient (nom, numéro, téléphone)" testId="consult-input-patient" />
                    </Section>
                ) : (
                    <Card sx={{ mb: 2 }}>
                        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', py: '12px !important' }}>
                            <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {[contexte?.patient?.sexe === 'M' ? 'Homme' : contexte?.patient?.sexe === 'F' ? 'Femme' : '', age ? libelleAge(age) : '',
                                        contexte ? `${contexte.nombre_consultations} consultation(s) avant celle-ci` : ''].filter(Boolean).join(' · ')}
                                </Typography>
                                {derniere && (
                                    <Typography variant="body2">
                                        <HistoryIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                        Dernière visite le {new Date(derniere.date).toLocaleDateString('fr-FR')}{derniere.diagnostic ? ` : ${derniere.diagnostic.split('\n')[0]}` : ''}
                                    </Typography>
                                )}
                            </Box>
                            {allergies && (
                                <Chip color="error" icon={<WarningIcon />} label={`Allergies : ${allergies.split('\n').join(', ').slice(0, 80)}`} sx={{ maxWidth: '100%' }} />
                            )}
                            {isNew && <Button size="small" onClick={() => choisirPatient(null)}>Changer de patient</Button>}
                            <ConsultationTimer compact onStart={(t) => maj('started_at', t)} onEnd={(t) => maj('ended_at', t)}
                                initialStartTime={formData.started_at} initialEndTime={formData.ended_at} />
                        </CardContent>
                    </Card>
                )}

                {/* Spécialité + médecin */}
                <Card sx={{ mb: 2 }}>
                    <CardContent sx={{ py: '12px !important' }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={8}>
                                <Pastilles options={SPECIALITES.map(s => ({ valeur: s.code, libelle: s.libelle }))}
                                    actif={(v) => formData.specialty === v} onBascule={changerSpecialite} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Autocomplete freeSolo options={praticiens} size="small"
                                    getOptionLabel={(o) => (typeof o === 'string' ? o : o.nom)}
                                    inputValue={formData.practitioner_name || ''}
                                    onInputChange={(e, v) => maj('practitioner_name', v)}
                                    onChange={(e, v) => {
                                        if (v && typeof v === 'object') {
                                            maj('practitioner_name', v.nom);
                                            if (isNew && !specialiteChoisie.current && v.specialite) changerSpecialite(v.specialite);
                                        }
                                    }}
                                    renderInput={(p) => <TextField {...p} label="Médecin consultant" placeholder={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''} />} />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Constantes */}
                <Section titre="Constantes" sousTitre={contexte?.mesures?.length ? 'En gris : la valeur de la visite précédente' : undefined}>
                    <Grid container spacing={1.5}>
                        {CONSTANTES.map(([k, lib, cleHisto]) => {
                            const avant = cleHisto ? derniereMesure(cleHisto) : null;
                            return (
                                <Grid item xs={6} sm={4} md={2} key={k}>
                                    <TextField label={lib} name={k} value={formData[k] ?? ''} onChange={handleInputChange} fullWidth size="small"
                                        inputProps={{ inputMode: 'decimal', ...(TESTID[k] ? { 'data-testid': TESTID[k] } : {}) }}
                                        helperText={avant ? `${avant[cleHisto]} le ${new Date(avant.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}` : ' '} />
                                </Grid>
                            );
                        })}
                        <Grid item xs={6} sm={4} md={2}>
                            <TextField label="IMC" value={formData.bmi} disabled fullWidth size="small"
                                helperText={formData.bmi ? (formData.bmi < 18.5 ? 'Insuffisance' : formData.bmi < 25 ? 'Normal' : formData.bmi < 30 ? 'Surpoids' : 'Obésité') : ' '} />
                        </Grid>
                    </Grid>
                </Section>

                {/* Motif et histoire */}
                <Section titre="Motif et histoire">
                    <Pastilles options={MOTIFS[formData.specialty] || MOTIFS.general} actif={(v) => contientLigne(formData.chief_complaint, v)}
                        onBascule={(v) => maj('chief_complaint', basculerLigne(formData.chief_complaint, v))} />
                    <TextField label="Motif de consultation" name="chief_complaint" value={formData.chief_complaint} onChange={handleInputChange} multiline minRows={2} fullWidth sx={{ mt: 1 }} />
                    <TextField label="Histoire de la maladie" name="history_of_present_illness" value={formData.history_of_present_illness} onChange={handleInputChange} multiline minRows={2} fullWidth sx={{ mt: 2 }} />
                    <QuickTemplate label="Raccourcis histoire" templates={HISTORY_TEMPLATES} onSelect={(v) => maj('history_of_present_illness', basculerLigne(formData.history_of_present_illness, v))} />
                    <Accordion disableGutters elevation={0} sx={{ mt: 1, border: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">Antécédents{ANTECEDENTS.some(([k]) => formData[k]) ? ' (repris du dossier)' : ''}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                {ANTECEDENTS.map(([k, lib, modeles]) => (
                                    <Grid item xs={12} md={6} key={k}>
                                        <TextField label={lib} name={k} value={formData[k]} onChange={handleInputChange} multiline minRows={2} fullWidth />
                                        <QuickTemplate label="Suggestions" templates={modeles} onSelect={(v) => maj(k, basculerLigne(formData[k], v))} />
                                    </Grid>
                                ))}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                </Section>

                {/* Examen spécialisé */}
                {specialite.cle && (
                    <Section titre={`Examen — ${specialite.libelle}`} sousTitre="Touchez les pastilles et les schémas ; tout est repris dans le dossier et le compte rendu">
                        {formData.specialty === 'gynecology' && <BlocGyneco data={donneesSpe('gyneco')} onData={majSpe('gyneco')} />}
                        {formData.specialty === 'cardiology' && <BlocCardio data={donneesSpe('cardio')} onData={majSpe('cardio')} contexte={contexte} constantes={formData} />}
                        {formData.specialty === 'aesthetic' && (
                            <BlocEsthetique data={donneesSpe('esthetique')} onData={majSpe('esthetique')} photos={photos}
                                onAjouterPhoto={ajouterPhoto} onSupprimerPhoto={supprimerPhoto} peutPhoto={!!id} />
                        )}
                        {formData.specialty === 'pediatrics' && <BlocPediatrie data={donneesSpe('pediatrie')} onData={majSpe('pediatrie')} contexte={contexte} constantes={formData} />}
                    </Section>
                )}

                {/* Examen clinique */}
                <Section titre="Examen clinique">
                    {constatsCorps && (
                        <Box sx={{ mb: 2 }}>
                            <SchemaCliquable viewBox={VIEWBOX_CORPS} largeur={130} formes={FORMES_CORPS} zones={ZONES_CORPS}
                                texte={formData.physical_examination} onTexte={(v) => maj('physical_examination', v)} legende="Touchez une zone" />
                        </Box>
                    )}
                    <TextField label="Examen physique" name="physical_examination" value={formData.physical_examination} onChange={handleInputChange} multiline minRows={3} fullWidth />
                    <QuickTemplate label="Raccourcis examen physique" templates={PHYSICAL_EXAM_TEMPLATES} onSelect={(v) => maj('physical_examination', basculerLigne(formData.physical_examination, v))} />
                    <TextField label="Enquête des systèmes" name="enquetes_systeme" value={formData.enquetes_systeme} onChange={handleInputChange} multiline minRows={1} fullWidth sx={{ mt: 2 }} />
                    <QuickTemplate label="Suggestions" templates={ENQUETES_SYSTEME_TEMPLATES} onSelect={(v) => maj('enquetes_systeme', basculerLigne(formData.enquetes_systeme, v))} />
                </Section>

                {/* Diagnostic et examens */}
                <Section titre="Diagnostic et examens">
                    <Pastilles options={(DIAGNOSTICS[formData.specialty] || DIAGNOSTICS.general).map(x => x.d)} couleur="error"
                        actif={(v) => contientLigne(formData.diagnosis, v)} onBascule={(v) => maj('diagnosis', basculerLigne(formData.diagnosis, v))} />
                    <TextField label="Diagnostic" name="diagnosis" value={formData.diagnosis} onChange={handleInputChange} multiline minRows={2} fullWidth sx={{ mt: 1 }}
                        inputProps={{ 'data-testid': 'consult-input-diagnosis' }} />
                    {(testsProposes.length > 0 || imageriesProposees.length > 0) && (
                        <Alert severity="info" icon={<ScienceIcon />} sx={{ mt: 2 }} action={(
                            <Button color="inherit" size="small" onClick={() => setFormData(p => ({
                                ...p,
                                lab_tests: [...new Set([...p.lab_tests, ...testsProposes.map(t => t.id)])],
                                imaging_exam_types: [...new Set([...p.imaging_exam_types, ...imageriesProposees.map(t => t.id)])],
                            }))}>Tout ajouter</Button>
                        )}>
                            Examens proposés : {[...testsProposes, ...imageriesProposees].map(t => t.name.split('(')[0].trim()).join(', ')}
                        </Alert>
                    )}
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Biologie</Typography>
                    <Autocomplete multiple options={labTests} getOptionLabel={(o) => `${o.test_code} - ${o.name}`}
                        value={labTests.filter(t => formData.lab_tests.includes(t.id))} onChange={(e, v) => maj('lab_tests', v.map(t => t.id))}
                        renderInput={(p) => <TextField {...p} placeholder="Ajouter un examen de biologie" inputProps={{ ...p.inputProps, 'data-testid': 'consult-input-lab-tests' }} />}
                        renderTags={(v, getTagProps) => v.map((o, i) => <Chip label={o.name} {...getTagProps({ index: i })} size="small" color="primary" />)} />
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>Imagerie</Typography>
                    <Autocomplete multiple options={imagingExamTypes} getOptionLabel={(o) => `${o.exam_code ? `${o.exam_code} - ` : ''}${o.name}`}
                        value={imagingExamTypes.filter(t => formData.imaging_exam_types.includes(t.id))} onChange={(e, v) => maj('imaging_exam_types', v.map(t => t.id))}
                        renderInput={(p) => <TextField {...p} placeholder="Ajouter un examen d'imagerie" inputProps={{ ...p.inputProps, 'data-testid': 'consult-input-imaging-exams' }} />}
                        renderTags={(v, getTagProps) => v.map((o, i) => <Chip label={o.name} {...getTagProps({ index: i })} size="small" color="secondary" />)} />
                    <TextField label="Notes d'imagerie" name="imaging" value={formData.imaging} onChange={handleInputChange} multiline minRows={1} fullWidth sx={{ mt: 2 }} />
                </Section>

                {/* Traitement et ordonnance */}
                <Section titre="Traitement et ordonnance" action={(
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Ordonnances déjà faites au centre pour le même diagnostic">
                            <Button size="small" startIcon={<CopyIcon />} onClick={chercherOrdonnances}>Reprendre une ordonnance</Button>
                        </Tooltip>
                        <Button data-testid="consult-btn-add-medication" size="small" variant="contained" startIcon={<AddIcon />} onClick={() => ajouterMedicament()}>Médicament</Button>
                    </Stack>
                )}>
                    {formData.medications.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Aucun médicament. Ajoutez-en un, ou reprenez une ordonnance déjà faite pour ce diagnostic.</Typography>
                    )}
                    <Stack spacing={1.5}>
                        {formData.medications.map((m, i) => (
                            <Box key={i} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                                <Grid container spacing={1} alignItems="center">
                                    <Grid item xs={12} md={5}>
                                        {m.is_external ? (
                                            <TextField fullWidth size="small" label="Médicament (hors pharmacie)" value={m.medication_name} onChange={(e) => handleMedicationChange(i, 'medication_name', e.target.value)} />
                                        ) : (
                                            <RechercheAsync size="small" label="Médicament (pharmacie)" value={m.medication} onChange={(v) => handleMedicationChange(i, 'medication', v)}
                                                charger={(q) => pharmacyAPI.getMedications({ search: q, page_size: 20 })} getOptionLabel={(o) => o?.name || ''} />
                                        )}
                                    </Grid>
                                    <Grid item xs={6} md={2}><TextField size="small" fullWidth label="Dosage" value={m.dosage} onChange={(e) => handleMedicationChange(i, 'dosage', e.target.value)} placeholder="500 mg" /></Grid>
                                    <Grid item xs={6} md={2}><TextField size="small" fullWidth label="Fréquence" value={m.frequency} onChange={(e) => handleMedicationChange(i, 'frequency', e.target.value)} placeholder="3 fois / jour" /></Grid>
                                    <Grid item xs={6} md={1.5}><TextField size="small" fullWidth label="Durée" value={m.duration} onChange={(e) => handleMedicationChange(i, 'duration', e.target.value)} placeholder="5 jours" /></Grid>
                                    <Grid item xs={4} md={1}><TextField size="small" fullWidth label="Qté" type="number" value={m.quantity} onChange={(e) => handleMedicationChange(i, 'quantity', e.target.value)} inputProps={{ min: 1 }} /></Grid>
                                    <Grid item xs={2} md={0.5}>
                                        <IconButton color="error" aria-label="Retirer" onClick={() => setFormData(p => ({ ...p, medications: p.medications.filter((_, idx) => idx !== i) }))}><DeleteIcon /></IconButton>
                                    </Grid>
                                    <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Checkbox size="small" checked={!!m.is_external} onChange={(e) => handleMedicationChange(i, 'is_external', e.target.checked)} />
                                        <Typography variant="caption" sx={{ mr: 2 }}>Hors pharmacie du centre</Typography>
                                        <TextField size="small" sx={{ flex: 1 }} placeholder="Consigne (avant / après le repas…)" value={m.instructions} onChange={(e) => handleMedicationChange(i, 'instructions', e.target.value)} />
                                    </Grid>
                                </Grid>
                            </Box>
                        ))}
                    </Stack>
                    <TextField label="Plan de traitement et consignes du médecin" name="treatment_plan" value={formData.treatment_plan} onChange={handleInputChange} multiline minRows={2} fullWidth sx={{ mt: 2 }} />
                    <QuickTemplate label="Raccourcis traitement" templates={TREATMENT_TEMPLATES} onSelect={(v) => maj('treatment_plan', basculerLigne(formData.treatment_plan, v))} />
                </Section>

                {/* Suivi */}
                <Section titre="Suivi">
                    <Pastilles titre="Revoir le patient dans" options={SUIVI.map(([lib]) => lib)}
                        actif={(lib) => formData.follow_up_date === dansNJours(SUIVI.find(s => s[0] === lib)[1])}
                        onBascule={(lib) => {
                            const d = dansNJours(SUIVI.find(s => s[0] === lib)[1]);
                            maj('follow_up_date', formData.follow_up_date === d ? '' : d);
                        }} />
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12} sm={4}>
                            <TextField type="date" label="Date du prochain rendez-vous" value={formData.follow_up_date || ''} onChange={(e) => maj('follow_up_date', e.target.value)}
                                fullWidth size="small" InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <TextField label="Consignes remises au patient" name="patient_instructions" value={formData.patient_instructions} onChange={handleInputChange} multiline minRows={1} fullWidth size="small" />
                        </Grid>
                    </Grid>
                </Section>
            </Box>

            <Dialog open={!!ordosSimilaires} onClose={() => setOrdosSimilaires(null)} fullWidth maxWidth="sm">
                <DialogTitle>Ordonnances déjà faites pour « {ordosSimilaires?.diagnostic} »</DialogTitle>
                <DialogContent dividers>
                    {ordosSimilaires?.liste?.length ? (
                        <List dense>
                            {ordosSimilaires.liste.map((o, i) => (
                                <ListItemButton key={i} onClick={() => reprendreOrdonnance(o)} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                                    <ListItemText
                                        primary={o.items.map(x => [x.medication_name, x.dosage, x.frequency, x.duration].filter(Boolean).join(' ')).join(' · ')}
                                        secondary={`${new Date(o.date).toLocaleDateString('fr-FR')} — ${o.diagnostic.split('\n')[0]}`} />
                                </ListItemButton>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary">Aucune ordonnance encore faite au centre pour ce diagnostic. Elles apparaîtront ici au fil des consultations.</Typography>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setOrdosSimilaires(null)}>Fermer</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default ConsultationForm;
