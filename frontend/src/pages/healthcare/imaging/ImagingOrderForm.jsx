import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, Grid, TextField, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    MenuItem, Autocomplete, Divider, Stack, Chip, InputAdornment, Tabs, Tab, Alert,
} from '@mui/material';
import { Search as SearchIcon, Save as SaveIcon, Add as AddIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import imagingAPI from '../../../services/imagingAPI';
import laboratoryAPI from '../../../services/laboratoryAPI';
import patientAPI from '../../../services/patientAPI';
import api from '../../../services/api';
import QuickClientCreateModal from '../laboratory/components/QuickClientCreateModal';

const ImagingOrderForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [prescribers, setPrescribers] = useState([]);
    const [subcontractors, setSubcontractors] = useState([]);
    const [prescriberCustomTestPrices, setPrescriberCustomTestPrices] = useState({});
    const [prescriberCustomExamPrices, setPrescriberCustomExamPrices] = useState({});
    const [privilegeCardUsedByMode, setPrivilegeCardUsedByMode] = useState('self');
    const [privilegeCardUsedByPatient, setPrivilegeCardUsedByPatient] = useState(null);
    const [privilegeCardUsedByName, setPrivilegeCardUsedByName] = useState('');
    const [privilegeCardUsedByRelationship, setPrivilegeCardUsedByRelationship] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [openClientModal, setOpenClientModal] = useState(false);

    // Rapprochement labo : tests individuels + bilans (pouvant être mixtes)
    const [selectionTab, setSelectionTab] = useState(0); // 0=Imagerie, 1=Examens Labo, 2=Bilans
    const [labTests, setLabTests] = useState([]);
    const [labCategories, setLabCategories] = useState([]);
    const [labTestSearch, setLabTestSearch] = useState('');
    const [labCategoryFilter, setLabCategoryFilter] = useState('');
    const [panels, setPanels] = useState([]);

    // Coupon de réduction (s'applique à la facture imagerie)
    const [couponCode, setCouponCode] = useState('');
    const [couponStatus, setCouponStatus] = useState(null); // null | 'loading' | 'valid' | 'invalid'
    const [couponInfo, setCouponInfo] = useState(null);

    const [formData, setFormData] = useState({
        patient: null,
        prescriber: null,
        subcontractor: null,
        priority: 'routine',
        exam_types: [],
        lab_tests: [],
        panels: [],
        clinical_notes: '',
        payment_method: 'cash',
    });

    useEffect(() => {
        const initializeForm = async () => {
            const options = await fetchOptions();
            const preselectedPatientId = searchParams.get('patientId');
            if (preselectedPatientId) {
                try {
                    const patientData = await patientAPI.getPatient(preselectedPatientId);
                    setFormData(prev => ({ ...prev, patient: patientData }));
                } catch (error) {
                    console.error('Error loading preselected patient:', error);
                }
            }

            // Représcription : reprend les mêmes examens (individuels + bilans) d'une
            // commande d'imagerie existante, pour éviter de tout ressaisir.
            const represcribeId = searchParams.get('represcribe');
            if (represcribeId && options) {
                try {
                    const original = await imagingAPI.getOrder(represcribeId);
                    const individualItems = (original.items || []).filter(it => !it.panel);
                    const panelIds = [...new Set((original.items || []).filter(it => it.panel).map(it => it.panel))];

                    const reselectedExamTypes = individualItems
                        .map(it => options.examTypes.find(e => e.id === it.exam_type))
                        .filter(Boolean);
                    const reselectedPanels = panelIds
                        .map(pid => options.panels.find(p => p.id === pid))
                        .filter(Boolean);
                    const reselectedPrescriber = original.prescriber
                        ? options.prescribers.find(p => p.id === original.prescriber) || null
                        : null;

                    setFormData(prev => ({
                        ...prev,
                        exam_types: reselectedExamTypes,
                        panels: reselectedPanels,
                        prescriber: reselectedPrescriber,
                    }));
                    if (reselectedExamTypes.length || reselectedPanels.length) {
                        enqueueSnackbar(`Examens repris de la commande ${original.order_number}`, { variant: 'info' });
                    }
                } catch (error) {
                    console.error('Error loading order to re-prescribe:', error);
                    enqueueSnackbar('Impossible de charger la commande à représcrire', { variant: 'error' });
                }
            }
        };
        initializeForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const prescriber = formData.prescriber;
        if (prescriber?.pricing_mode === 'custom_price') {
            laboratoryAPI.getPrescriberCustomPrices(prescriber.id).then(data => {
                const list = Array.isArray(data) ? data : data.results || [];
                const testPrices = {};
                const examPrices = {};
                list.forEach(cp => {
                    if (cp.lab_test) testPrices[cp.lab_test] = cp.custom_price;
                    if (cp.exam_type) examPrices[cp.exam_type] = cp.custom_price;
                });
                setPrescriberCustomTestPrices(testPrices);
                setPrescriberCustomExamPrices(examPrices);
            }).catch(() => {
                setPrescriberCustomTestPrices({});
                setPrescriberCustomExamPrices({});
            });
        } else {
            setPrescriberCustomTestPrices({});
            setPrescriberCustomExamPrices({});
        }
    }, [formData.prescriber]);

    const fetchOptions = async () => {
        try {
            const [patData, examData, catData, prescriberData, subData, labTestData, labCatData, panelData] = await Promise.all([
                patientAPI.getPatients({ page_size: 1000 }),
                imagingAPI.getExamTypes({ page_size: 1000 }),
                imagingAPI.getCategories(),
                laboratoryAPI.getPrescribers({ active_only: true }),
                laboratoryAPI.getSubcontractors({ active_only: 'true' }),
                laboratoryAPI.getTests({ page_size: 1000 }),
                laboratoryAPI.getCategories(),
                laboratoryAPI.getPanels({ active_only: true }),
            ]);
            const resolvedExamTypes = examData.results || examData || [];
            const resolvedPrescribers = Array.isArray(prescriberData) ? prescriberData : prescriberData.results || [];
            const resolvedPanels = Array.isArray(panelData) ? panelData : panelData.results || [];

            setPatients(patData.results || patData || []);
            setExamTypes(resolvedExamTypes);
            setCategories(catData.results || catData || []);
            setPrescribers(resolvedPrescribers);
            setSubcontractors(Array.isArray(subData) ? subData : subData.results || []);
            setLabTests(labTestData.results || labTestData || []);
            setLabCategories(labCatData.results || labCatData || []);
            setPanels(resolvedPanels);

            return { examTypes: resolvedExamTypes, prescribers: resolvedPrescribers, panels: resolvedPanels };
        } catch (error) {
            console.error('Error fetching options:', error);
            enqueueSnackbar('Erreur lors du chargement des données', { variant: 'error' });
            return null;
        }
    };

    const handleClientCreated = (newPatient) => {
        setPatients(prev => [newPatient, ...prev]);
        setFormData(prev => ({ ...prev, patient: newPatient }));
    };

    const filteredExamTypes = examTypes.filter(exam => {
        const matchesSearch = !searchTerm ||
            exam.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.exam_code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || exam.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const filteredLabTests = labTests.filter(test => {
        const matchesSearch = !labTestSearch ||
            test.name?.toLowerCase().includes(labTestSearch.toLowerCase()) ||
            test.test_code?.toLowerCase().includes(labTestSearch.toLowerCase());
        const matchesCategory = !labCategoryFilter || test.category === labCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleExamToggle = (exam) => {
        const isSelected = formData.exam_types.some(e => e.id === exam.id);
        if (isSelected) {
            setFormData(prev => ({ ...prev, exam_types: prev.exam_types.filter(e => e.id !== exam.id) }));
        } else {
            setFormData(prev => ({ ...prev, exam_types: [...prev.exam_types, exam] }));
        }
    };

    const handleLabTestToggle = (test) => {
        const isSelected = formData.lab_tests.some(t => t.id === test.id);
        if (isSelected) {
            setFormData(prev => ({ ...prev, lab_tests: prev.lab_tests.filter(t => t.id !== test.id) }));
        } else {
            setFormData(prev => ({ ...prev, lab_tests: [...prev.lab_tests, test] }));
        }
    };

    const handlePanelToggle = (panel) => {
        const isSelected = formData.panels.some(p => p.id === panel.id);
        if (isSelected) {
            setFormData(prev => ({ ...prev, panels: prev.panels.filter(p => p.id !== panel.id) }));
        } else {
            setFormData(prev => ({ ...prev, panels: [...prev.panels, panel] }));
        }
    };

    const getEffectiveExamPrice = (exam) => {
        const customPrice = prescriberCustomExamPrices[exam.id];
        return customPrice !== undefined ? parseFloat(customPrice) : (parseFloat(exam.price) || 0);
    };

    const getEffectiveTestPrice = (test) => {
        const customPrice = prescriberCustomTestPrices[test.id];
        return customPrice !== undefined ? parseFloat(customPrice) : (parseFloat(test.price) || 0);
    };

    const calculateSubtotal = () => {
        const examsTotal = formData.exam_types.reduce((sum, e) => sum + getEffectiveExamPrice(e) - (parseFloat(e.discount) || 0), 0);
        const labTestsTotal = formData.lab_tests.reduce((sum, t) => sum + getEffectiveTestPrice(t) - (parseFloat(t.discount) || 0), 0);
        const panelsTotal = formData.panels.reduce((sum, p) => sum + (parseFloat(p.net_price ?? p.price) || 0), 0);
        return examsTotal + labTestsTotal + panelsTotal;
    };

    // Positif = remise (retiré du total), négatif = majoration (ajouté au total)
    const couponDiscount = () => {
        if (couponStatus === 'valid' && couponInfo?.discount_amount) {
            const amount = parseFloat(couponInfo.discount_amount) || 0;
            return couponInfo.is_surcharge ? -amount : Math.min(amount, calculateSubtotal());
        }
        return 0;
    };

    const calculateTotal = () => Math.max(0, calculateSubtotal() - couponDiscount());

    const validateCoupon = async () => {
        const code = couponCode.trim().toUpperCase();
        if (!code) return;
        setCouponStatus('loading');
        setCouponInfo(null);
        try {
            const subtotal = calculateSubtotal();
            const res = await api.post('/documents/coupons/validate/', {
                code,
                invoice_amount: subtotal,
            });
            if (res.data.valid) {
                setCouponStatus('valid');
                setCouponInfo(res.data);
                enqueueSnackbar(`Coupon validé : -${res.data.discount_amount} FCFA`, { variant: 'success' });
            } else {
                setCouponStatus('invalid');
                setCouponInfo({ error: res.data.error });
            }
        } catch (e) {
            setCouponStatus('invalid');
            setCouponInfo({ error: e.response?.data?.error || 'Coupon introuvable.' });
        }
    };

    const clearCoupon = () => {
        setCouponCode('');
        setCouponStatus(null);
        setCouponInfo(null);
    };

    const handleSubmit = async () => {
        if (!formData.patient) {
            enqueueSnackbar('Veuillez sélectionner un patient', { variant: 'warning' });
            return;
        }
        if (formData.exam_types.length === 0 && formData.lab_tests.length === 0 && formData.panels.length === 0) {
            enqueueSnackbar('Veuillez sélectionner au moins un examen', { variant: 'warning' });
            return;
        }

        // Les commandes sous-traitées passent par le dépôt groupé (facture consolidée automatique)
        if (formData.subcontractor?.id) {
            enqueueSnackbar(
                'Pour une commande sous-traitée, utilisez la page "Dépôt sous-traitance" afin que la facture soit générée automatiquement.',
                { variant: 'warning', autoHideDuration: 6000 }
            );
            navigate('/healthcare/imaging/subcontractors/batch-order');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: formData.patient.id,
                prescriber_id: formData.prescriber?.id || null,
                subcontractor_id: null,
                priority: formData.priority,
                clinical_notes: formData.clinical_notes || '',
                payment_method: formData.payment_method || 'cash',
                exam_type_ids: formData.exam_types.map(e => e.id),
                lab_test_ids: formData.lab_tests.map(t => t.id),
                panel_ids: formData.panels.map(p => p.id),
            };

            if (formData.patient.has_privilege_card) {
                if (privilegeCardUsedByMode === 'patient' && privilegeCardUsedByPatient) {
                    payload.privilege_card_used_by_patient_id = privilegeCardUsedByPatient.id;
                } else if (privilegeCardUsedByMode === 'name' && privilegeCardUsedByName) {
                    payload.privilege_card_used_by_name = privilegeCardUsedByName;
                    payload.privilege_card_used_by_relationship = privilegeCardUsedByRelationship;
                }
            }

            const newOrder = await imagingAPI.createOrder(payload);

            // Si un coupon valide est saisi, l'appliquer sur la facture imagerie
            // (la facture labo liée, si elle existe, n'est pas remisée par ce coupon)
            if (couponStatus === 'valid' && couponCode) {
                const invoiceId = newOrder.imaging_invoice?.id || newOrder.imaging_invoice;
                if (invoiceId) {
                    try {
                        await api.post('/documents/coupons/apply/', {
                            code: couponCode.trim().toUpperCase(),
                            invoice_id: invoiceId,
                        });
                        enqueueSnackbar(`Coupon ${couponCode} appliqué sur la facture imagerie`, { variant: 'success' });
                    } catch (couponErr) {
                        const msg = couponErr.response?.data?.error || 'Erreur application coupon';
                        enqueueSnackbar(`Commande créée, mais coupon non appliqué : ${msg}`, { variant: 'warning' });
                    }
                }
            }

            enqueueSnackbar('Commande créée avec succès', { variant: 'success' });
            navigate(newOrder.imaging_invoice !== undefined || newOrder.exams_count !== undefined
                ? `/healthcare/imaging/${newOrder.id}`
                : `/healthcare/laboratory/${newOrder.id}`);
        } catch (error) {
            console.error('Error creating imaging order:', error);
            const errorMessage = error?.response?.data?.detail || error?.response?.data?.error ||
                'Erreur lors de la création de la commande d\'imagerie';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/imaging')}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Nouvelle Commande d'Imagerie
                    </Typography>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                    size="large"
                >
                    Créer la Commande
                </Button>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Autocomplete
                                    fullWidth
                                    options={patients}
                                    getOptionLabel={(option) => `${option.name} (${option.patient_number})`}
                                    value={formData.patient}
                                    onChange={(e, v) => setFormData(prev => ({ ...prev, patient: v }))}
                                    renderInput={(params) => <TextField {...params} label="Rechercher Patient" required />}
                                />
                                <Button
                                    variant="outlined"
                                    sx={{ minWidth: 40, width: 40, height: 56, p: 0 }}
                                    onClick={() => setOpenClientModal(true)}
                                >
                                    <AddIcon />
                                </Button>
                            </Box>

                            {formData.patient?.has_privilege_card && (
                                <Box sx={{ mt: 2 }}>
                                    <Alert severity="success" sx={{ mb: 1 }}>
                                        Carte Privilège active — une réduction sera appliquée automatiquement.
                                    </Alert>
                                    <TextField
                                        select size="small" fullWidth
                                        label="Carte utilisée par"
                                        value={privilegeCardUsedByMode}
                                        onChange={(e) => setPrivilegeCardUsedByMode(e.target.value)}
                                    >
                                        <MenuItem value="self">Le patient lui-même</MenuItem>
                                        <MenuItem value="patient">Un proche enregistré comme patient</MenuItem>
                                        <MenuItem value="name">Un proche non enregistré</MenuItem>
                                    </TextField>
                                    {privilegeCardUsedByMode === 'patient' && (
                                        <Autocomplete
                                            size="small" sx={{ mt: 1 }}
                                            options={patients}
                                            getOptionLabel={(option) => `${option.name} (${option.patient_number})`}
                                            value={privilegeCardUsedByPatient}
                                            onChange={(_, v) => setPrivilegeCardUsedByPatient(v)}
                                            renderInput={(params) => <TextField {...params} label="Proche (patient)" />}
                                        />
                                    )}
                                    {privilegeCardUsedByMode === 'name' && (
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                            <TextField
                                                size="small" fullWidth label="Nom du proche"
                                                value={privilegeCardUsedByName}
                                                onChange={(e) => setPrivilegeCardUsedByName(e.target.value)}
                                            />
                                            <TextField
                                                size="small" fullWidth label="Lien de parenté"
                                                value={privilegeCardUsedByRelationship}
                                                onChange={(e) => setPrivilegeCardUsedByRelationship(e.target.value)}
                                            />
                                        </Stack>
                                    )}
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    <QuickClientCreateModal
                        open={openClientModal}
                        onClose={() => setOpenClientModal(false)}
                        onSuccess={handleClientCreated}
                    />

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Prescripteur</Typography>
                            <Autocomplete
                                options={prescribers}
                                getOptionLabel={(option) =>
                                    `${option.full_name || `Dr ${option.last_name} ${option.first_name}`}${option.clinic_name ? ` – ${option.clinic_name}` : ''}`
                                }
                                value={formData.prescriber}
                                onChange={(_, v) => setFormData(prev => ({ ...prev, prescriber: v }))}
                                renderInput={(params) => (
                                    <TextField {...params} label="Prescripteur (optionnel)" size="small" fullWidth />
                                )}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                            />
                            {formData.prescriber?.pricing_mode === 'custom_price' && (
                                <Alert severity="info" sx={{ mt: 1.5 }}>
                                    Ce prescripteur est en mode "prix libre" — ses prix personnalisés (quand définis) remplacent le tarif catalogue pour les examens/tests sélectionnés ci-dessous.
                                </Alert>
                            )}

                            {subcontractors.length > 0 && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h6" gutterBottom>Sous-traitance</Typography>
                                    <Autocomplete
                                        options={[{ id: null, name: 'Réalisé en interne' }, ...subcontractors]}
                                        getOptionLabel={(option) => option.name}
                                        value={formData.subcontractor || { id: null, name: 'Réalisé en interne' }}
                                        onChange={(_, v) => setFormData(prev => ({ ...prev, subcontractor: v?.id ? v : null }))}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Partenaire imagerie" size="small" fullWidth
                                                helperText="Optionnel — laisser vide pour examen interne" />
                                        )}
                                        isOptionEqualToValue={(a, b) => a.id === b.id}
                                    />
                                    {formData.subcontractor && (
                                        <Chip size="small" label={`Sous-traité à ${formData.subcontractor.name}`} color="warning" sx={{ mt: 1 }} />
                                    )}
                                </>
                            )}

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>Priorité</Typography>
                            <TextField
                                fullWidth select
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                            >
                                <MenuItem value="routine">Routine</MenuItem>
                                <MenuItem value="urgent">Urgente</MenuItem>
                                <MenuItem value="stat">STAT (Immédiat)</MenuItem>
                            </TextField>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>Méthode de Paiement</Typography>
                            <TextField
                                fullWidth select
                                value={formData.payment_method}
                                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                            >
                                <MenuItem value="cash">Espèces</MenuItem>
                                <MenuItem value="mobile_money">Mobile Money</MenuItem>
                                <MenuItem value="card">Carte Bancaire</MenuItem>
                                <MenuItem value="insurance">Assurance</MenuItem>
                                <MenuItem value="other">Autre</MenuItem>
                            </TextField>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>Résumé</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Examens d'imagerie:</Typography>
                                <Typography fontWeight="bold">{formData.exam_types.length}</Typography>
                            </Box>
                            {(formData.lab_tests.length > 0 || formData.panels.length > 0) && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography>Examens labo (facture séparée) :</Typography>
                                    <Typography fontWeight="bold" color="secondary.main">
                                        {formData.lab_tests.length} + {formData.panels.length} bilan(s)
                                    </Typography>
                                </Box>
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, mt: 1 }}>
                                <Typography variant="body2">Sous-total:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {new Intl.NumberFormat('fr-FR').format(calculateSubtotal())} XAF
                                </Typography>
                            </Box>

                            {/* Coupon de réduction (facture imagerie uniquement) */}
                            <Box sx={{ mt: 1, mb: 1 }}>
                                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                    Coupon de réduction
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <TextField
                                        size="small"
                                        placeholder="Code coupon"
                                        value={couponCode}
                                        onChange={(e) => {
                                            setCouponCode(e.target.value);
                                            if (couponStatus) {
                                                setCouponStatus(null);
                                                setCouponInfo(null);
                                            }
                                        }}
                                        disabled={couponStatus === 'valid' || couponStatus === 'loading'}
                                        sx={{ flex: 1 }}
                                        error={couponStatus === 'invalid'}
                                        helperText={
                                            couponStatus === 'invalid'
                                                ? (couponInfo?.error || 'Coupon invalide')
                                                : couponStatus === 'valid'
                                                ? `${couponInfo?.label || ''} — ${new Intl.NumberFormat('fr-FR').format(couponInfo?.discount_amount || 0)} FCFA`
                                                : ''
                                        }
                                    />
                                    {couponStatus !== 'valid' ? (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={validateCoupon}
                                            disabled={!couponCode.trim() || couponStatus === 'loading'}
                                        >
                                            {couponStatus === 'loading' ? '...' : 'Valider'}
                                        </Button>
                                    ) : (
                                        <Button variant="outlined" color="error" size="small" onClick={clearCoupon}>
                                            Retirer
                                        </Button>
                                    )}
                                </Stack>
                            </Box>

                            {couponDiscount() !== 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2" color={couponDiscount() < 0 ? 'warning.main' : 'error.main'}>
                                        {couponDiscount() < 0 ? 'Majoration coupon:' : 'Remise coupon:'}
                                    </Typography>
                                    <Typography variant="body2" color={couponDiscount() < 0 ? 'warning.main' : 'error.main'} fontWeight="bold">
                                        {couponDiscount() < 0 ? '+' : '−'}{new Intl.NumberFormat('fr-FR').format(Math.abs(couponDiscount()))} XAF
                                    </Typography>
                                </Box>
                            )}

                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Typography variant="h6">Total:</Typography>
                                <Typography variant="h6" color="primary" fontWeight="bold">
                                    {new Intl.NumberFormat('fr-FR').format(calculateTotal())} XAF
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Indication clinique</Typography>
                            <TextField
                                fullWidth multiline rows={3}
                                value={formData.clinical_notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, clinical_notes: e.target.value }))}
                                placeholder="Motif de l'examen, contexte clinique..."
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Tabs value={selectionTab} onChange={(_, v) => setSelectionTab(v)} sx={{ mb: 2 }}>
                                <Tab label={`Examens Imagerie (${formData.exam_types.length})`} />
                                <Tab label={`Examens Labo (${formData.lab_tests.length})`} />
                                <Tab label={`Bilans (${formData.panels.length})`} />
                            </Tabs>

                            {/* Tab 0 : Examens d'imagerie */}
                            {selectionTab === 0 && (<>
                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth size="small"
                                            placeholder="Rechercher un examen..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth size="small" select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            label="Catégorie"
                                        >
                                            <MenuItem value="">Toutes les catégories</MenuItem>
                                            {categories.map((cat) => (
                                                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                </Grid>

                                <TableContainer sx={{ maxHeight: 450 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Examen</TableCell>
                                                <TableCell>Modalité</TableCell>
                                                <TableCell>Prix</TableCell>
                                                <TableCell align="center">Sélection</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredExamTypes.map((exam) => {
                                                const isSelected = formData.exam_types.some(e => e.id === exam.id);
                                                return (
                                                    <TableRow
                                                        key={exam.id}
                                                        hover
                                                        onClick={() => handleExamToggle(exam)}
                                                        sx={{ cursor: 'pointer', backgroundColor: isSelected ? 'action.selected' : 'inherit' }}
                                                    >
                                                        <TableCell>
                                                            <Typography fontWeight={isSelected ? 'bold' : 'normal'}>{exam.name}</Typography>
                                                            {exam.exam_code && (
                                                                <Typography variant="caption" color="text.secondary">{exam.exam_code}</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={exam.modality_display || exam.modality} size="small" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell>{exam.price} XAF</TableCell>
                                                        <TableCell align="center">
                                                            {isSelected ? <Chip label="✓" color="primary" size="small" /> : <Chip label="+" variant="outlined" size="small" />}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {filteredExamTypes.length === 0 && (
                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography color="text.secondary">
                                            {examTypes.length === 0
                                                ? "Aucun examen disponible. Créez-en dans le Catalogue Examens Imagerie."
                                                : "Aucun examen ne correspond aux critères."}
                                        </Typography>
                                    </Box>
                                )}
                            </>)}

                            {/* Tab 1 : Examens de labo — crée une LabOrder liée */}
                            {selectionTab === 1 && (<>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Ajouter des tests de labo créera une commande labo séparée, liée à cette commande
                                    d'imagerie. Les résultats se saisiront normalement dans le module Laboratoire.
                                </Typography>
                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth size="small"
                                            placeholder="Rechercher un test de labo..."
                                            value={labTestSearch}
                                            onChange={(e) => setLabTestSearch(e.target.value)}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth size="small" select
                                            value={labCategoryFilter}
                                            onChange={(e) => setLabCategoryFilter(e.target.value)}
                                            label="Catégorie"
                                        >
                                            <MenuItem value="">Toutes les catégories</MenuItem>
                                            {labCategories.map((cat) => (
                                                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                </Grid>

                                <TableContainer sx={{ maxHeight: 450 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Test</TableCell>
                                                <TableCell>Catégorie</TableCell>
                                                <TableCell>Prix</TableCell>
                                                <TableCell align="center">Sélection</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredLabTests.map((test) => {
                                                const isSelected = formData.lab_tests.some(t => t.id === test.id);
                                                return (
                                                    <TableRow
                                                        key={test.id}
                                                        hover
                                                        onClick={() => handleLabTestToggle(test)}
                                                        sx={{ cursor: 'pointer', backgroundColor: isSelected ? 'action.selected' : 'inherit' }}
                                                    >
                                                        <TableCell>
                                                            <Typography fontWeight={isSelected ? 'bold' : 'normal'}>{test.name}</Typography>
                                                            {test.test_code && (
                                                                <Typography variant="caption" color="text.secondary">{test.test_code}</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={test.category_name || 'N/A'} size="small" variant="outlined" />
                                                        </TableCell>
                                                        <TableCell>{test.price} XAF</TableCell>
                                                        <TableCell align="center">
                                                            {isSelected ? <Chip label="✓" color="primary" size="small" /> : <Chip label="+" variant="outlined" size="small" />}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {filteredLabTests.length === 0 && (
                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography color="text.secondary">Aucun test ne correspond aux critères.</Typography>
                                    </Box>
                                )}
                            </>)}

                            {/* Tab 2 : Bilans (peuvent être 100% labo, 100% imagerie, ou mixtes) */}
                            {selectionTab === 2 && (<>
                                <TableContainer sx={{ maxHeight: 450 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Bilan</TableCell>
                                                <TableCell>Composition</TableCell>
                                                <TableCell align="right">Prix forfaitaire</TableCell>
                                                <TableCell align="center">Sélection</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {panels.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                        Aucun bilan configuré. Créez des bilans dans le Catalogue Bilans (module Laboratoire).
                                                    </TableCell>
                                                </TableRow>
                                            ) : panels.map((panel) => {
                                                const isSelected = formData.panels.some(p => p.id === panel.id);
                                                const netPrice = parseFloat(panel.net_price ?? panel.price) || 0;
                                                return (
                                                    <TableRow
                                                        key={panel.id}
                                                        hover
                                                        onClick={() => handlePanelToggle(panel)}
                                                        sx={{ cursor: 'pointer', backgroundColor: isSelected ? 'action.selected' : 'inherit' }}
                                                    >
                                                        <TableCell>
                                                            <Typography fontWeight={isSelected ? 'bold' : 'normal'}>{panel.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{panel.code}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                                {(panel.tests_detail || []).map(t => (
                                                                    <Chip key={t.id} label={t.test_code} size="small" variant="outlined" />
                                                                ))}
                                                                {(panel.imaging_exam_types_detail || []).map(e => (
                                                                    <Chip key={e.id} label={e.name} size="small" variant="outlined" color="secondary" />
                                                                ))}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography fontWeight={600} color="primary">
                                                                {netPrice.toLocaleString()} XAF
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {isSelected ? <Chip label="✓" color="primary" size="small" /> : <Chip label="+" variant="outlined" size="small" />}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>)}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ImagingOrderForm;
