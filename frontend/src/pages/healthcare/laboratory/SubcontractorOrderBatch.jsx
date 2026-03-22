import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Typography, Paper, Grid, TextField, Autocomplete,
    Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Divider, Stack, CircularProgress, Alert, Tooltip,
    Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
    DialogContent, DialogActions,
} from '@mui/material';
import {
    Add as AddIcon, Delete as DeleteIcon, Send as SendIcon,
    Business as BusinessIcon, CheckCircle as DoneIcon,
    ContentCopy as CopyIcon, Science as ScienceIcon,
    PersonAdd as PersonAddIcon,
    Receipt as InvoiceIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import BackButton from '../../../components/navigation/BackButton';

const fmt = v => new Intl.NumberFormat('fr-FR').format(v || 0);

// --- Quick patient creation dialog ---
const NewPatientDialog = ({ open, onClose, onCreated, subcontractorId, initialName = '' }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [form, setForm] = useState({ first_name: '', last_name: '', gender: '' });
    const [saving, setSaving] = useState(false);
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    React.useEffect(() => {
        if (open) {
            // Split "NOM Prénom" — first word = last_name, rest = first_name
            const parts = initialName.trim().split(/\s+/);
            setForm({ last_name: parts[0] || '', first_name: parts.slice(1).join(' '), gender: '' });
        }
    }, [open, initialName]);

    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            enqueueSnackbar('Prénom et nom sont obligatoires', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            const patient = await laboratoryAPI.createSubcontractorPatient(subcontractorId, form);
            enqueueSnackbar('Patient créé', { variant: 'success' });
            onCreated(patient);
            onClose();
            setForm({ first_name: '', last_name: '', gender: '' });
        } catch { enqueueSnackbar('Erreur lors de la création', { variant: 'error' }); }
        finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Nouveau patient</DialogTitle>
            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <Grid container spacing={2}>
                        <Grid item xs={6}><TextField label="Nom *" value={form.last_name} onChange={e => f('last_name', e.target.value)} fullWidth autoFocus /></Grid>
                        <Grid item xs={6}><TextField label="Prénom *" value={form.first_name} onChange={e => f('first_name', e.target.value)} fullWidth /></Grid>
                    </Grid>
                    <FormControl fullWidth>
                        <InputLabel>Sexe</InputLabel>
                        <Select value={form.gender} label="Sexe" onChange={e => f('gender', e.target.value)}>
                            <MenuItem value="">—</MenuItem>
                            <MenuItem value="M">Masculin</MenuItem>
                            <MenuItem value="F">Féminin</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annuler</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? <CircularProgress size={18} /> : 'Créer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// --- One row = one patient + their tests ---
const PatientRow = ({ row, index, patients, testsWithPrices, onUpdate, onRemove, onCopyTests, onOpenNewPatient }) => {
    const getEffectivePrice = (test) => {
        const t = testsWithPrices.find(x => x.id === test.id);
        return t?.subcontractor_price ?? t?.standard_price ?? 0;
    };
    const rowTotal = row.tests.reduce((s, t) => s + getEffectivePrice(t), 0);

    return (
        <TableRow sx={{ verticalAlign: 'top', '& td': { pt: 1.5, pb: 1 } }}>
            <TableCell width={40}>
                <Typography variant="body2" fontWeight="700" color="text.secondary">#{index + 1}</Typography>
            </TableCell>

            {/* Patient — from subcontractor's own patient list */}
            <TableCell width={280}>
                <Stack spacing={0.5}>
                    <Autocomplete
                        size="small"
                        options={patients}
                        getOptionLabel={p => p.__isCreate ? p.full_name : p.full_name}
                        value={row.patient}
                        onChange={(_, v) => {
                            if (v?.__isCreate) {
                                onOpenNewPatient(index, v._inputValue);
                            } else {
                                onUpdate(index, 'patient', v);
                            }
                        }}
                        renderInput={params => (
                            <TextField {...params} placeholder="Nom du patient..." size="small" />
                        )}
                        renderOption={(props, option) => {
                            const { key, ...rest } = props;
                            return (
                                <li key={key} {...rest} style={option.__isCreate ? { color: '#1976d2', fontStyle: 'italic' } : {}}>
                                    {option.__isCreate ? `+ Créer "${option._inputValue}"` : option.full_name}
                                </li>
                            );
                        }}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        filterOptions={(options, state) => {
                            const input = state.inputValue.toLowerCase().trim();
                            const filtered = input
                                ? options.filter(p => p.full_name.toLowerCase().includes(input))
                                : options;
                            if (input) {
                                filtered.push({ __isCreate: true, full_name: `Créer "${state.inputValue}"`, _inputValue: state.inputValue });
                            }
                            return filtered;
                        }}
                    />
                    {row.patient && (
                        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                            {row.patient.gender === 'M' ? '♂' : row.patient.gender === 'F' ? '♀' : ''}
                            {row.patient.date_of_birth ? ` · ${row.patient.date_of_birth}` : ''}
                        </Typography>
                    )}
                </Stack>
            </TableCell>

            {/* Tests */}
            <TableCell>
                <Autocomplete
                    size="small"
                    multiple
                    options={testsWithPrices}
                    getOptionLabel={t => `${t.test_code} — ${t.name}`}
                    value={row.tests}
                    onChange={(_, v) => onUpdate(index, 'tests', v)}
                    renderTags={(value, getTagProps) =>
                        value.map((t, i) => {
                            const { key, ...tagProps } = getTagProps({ index: i });
                            return (
                                <Chip
                                    key={key}
                                    label={t.test_code}
                                    size="small"
                                    {...tagProps}
                                    title={`${t.name} — ${fmt(getEffectivePrice(t))} XAF`}
                                />
                            );
                        })
                    }
                    renderInput={params => <TextField {...params} placeholder="Ajouter des examens..." size="small" />}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    limitTags={6}
                />
            </TableCell>

            {/* Notes */}
            <TableCell width={140}>
                <TextField
                    size="small"
                    placeholder="Notes cliniques"
                    value={row.clinical_notes}
                    onChange={e => onUpdate(index, 'clinical_notes', e.target.value)}
                    multiline maxRows={3} fullWidth
                />
            </TableCell>

            {/* Priority */}
            <TableCell width={105}>
                <Select size="small" value={row.priority} onChange={e => onUpdate(index, 'priority', e.target.value)} fullWidth>
                    <MenuItem value="routine">Routine</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="stat">STAT</MenuItem>
                </Select>
            </TableCell>

            {/* Total */}
            <TableCell width={120} align="right">
                <Typography variant="body2" fontWeight="700">{fmt(rowTotal)} XAF</Typography>
                <Typography variant="caption" color="text.secondary">{row.tests.length} examen(s)</Typography>
            </TableCell>

            {/* Actions */}
            <TableCell width={80}>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Copier les examens vers tous les autres patients">
                        <span>
                            <IconButton size="small" onClick={() => onCopyTests(index)} disabled={row.tests.length === 0}>
                                <CopyIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Supprimer cette ligne">
                        <IconButton size="small" color="error" onClick={() => onRemove(index)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </TableCell>
        </TableRow>
    );
};

const emptyRow = () => ({ patient: null, tests: [], clinical_notes: '', priority: 'routine' });

const SubcontractorOrderBatch = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();

    const [subcontractors, setSubcontractors] = useState([]);
    const [selectedSub, setSelectedSub] = useState(null);
    const [testsWithPrices, setTestsWithPrices] = useState([]);
    const [patients, setPatients] = useState([]);
    const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    const [newPatientDialogOpen, setNewPatientDialogOpen] = useState(false);
    const [newPatientTargetRow, setNewPatientTargetRow] = useState(null);
    const [newPatientInitialName, setNewPatientInitialName] = useState('');

    useEffect(() => {
        laboratoryAPI.getSubcontractors({ active_only: 'true' }).then(data => {
            const subs = Array.isArray(data) ? data : (data.results || []);
            setSubcontractors(subs);
            const preId = searchParams.get('subcontractor');
            if (preId) {
                const found = subs.find(s => s.id === preId);
                if (found) handleSubcontractorChange(found);
            }
        });
    }, []);

    const loadSubcontractorData = async (sub) => {
        setLoading(true);
        try {
            const [testsData, patientsData] = await Promise.all([
                laboratoryAPI.getSubcontractorTests(sub.id),
                laboratoryAPI.getSubcontractorPatients(sub.id),
            ]);
            const configured = (testsData.tests || []).filter(t => t.has_subcontractor_price);
            setTestsWithPrices(configured.length > 0 ? configured : testsData.tests || []);
            setPatients(Array.isArray(patientsData) ? patientsData : (patientsData.results || []));
        } catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
        finally { setLoading(false); }
    };

    const handleSubcontractorChange = (sub) => {
        setSelectedSub(sub);
        setTestsWithPrices([]);
        setPatients([]);
        setRows([emptyRow(), emptyRow(), emptyRow()]);
        if (sub) loadSubcontractorData(sub);
    };

    const handlePatientCreated = (newPatient) => {
        setPatients(prev => [...prev, newPatient]);
        if (newPatientTargetRow !== null) {
            updateRow(newPatientTargetRow, 'patient', newPatient);
            setNewPatientTargetRow(null);
        }
    };

    const updateRow = useCallback((index, field, value) => {
        setRows(prev => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
    }, []);

    const removeRow = useCallback((index) => {
        setRows(prev => prev.filter((_, i) => i !== index));
    }, []);

    const addRow = () => setRows(prev => [...prev, emptyRow()]);

    const copyTestsToAll = useCallback((sourceIndex) => {
        const sourceTests = rows[sourceIndex].tests;
        setRows(prev => prev.map((row, i) => i === sourceIndex ? row : { ...row, tests: [...sourceTests] }));
        enqueueSnackbar(`Examens de la ligne #${sourceIndex + 1} copiés vers tous les patients`, { variant: 'info' });
    }, [rows]);

    const validRows = rows.filter(r => r.patient && r.tests.length > 0);
    const grandTotal = rows.reduce((sum, row) => {
        return sum + row.tests.reduce((s, t) => {
            const ref = testsWithPrices.find(x => x.id === t.id);
            return s + (ref?.subcontractor_price ?? ref?.standard_price ?? 0);
        }, 0);
    }, 0);

    const handleSubmit = async () => {
        if (!selectedSub) { enqueueSnackbar('Sélectionnez un sous-traitant', { variant: 'warning' }); return; }
        if (validRows.length === 0) { enqueueSnackbar('Au moins un patient avec des examens est requis', { variant: 'warning' }); return; }

        setSubmitting(true);
        try {
            const result = await laboratoryAPI.subcontractorBatchOrder(selectedSub.id, {
                rows: validRows.map(r => ({
                    subcontractor_patient_id: r.patient.id,
                    test_ids: r.tests.map(t => t.id),
                    priority: r.priority,
                    clinical_notes: r.clinical_notes || '',
                })),
                payment_method: paymentMethod,
            });
            setResults(result);
            if (result.success?.length > 0) {
                enqueueSnackbar(
                    `${result.success.length} commande(s) créée(s)${result.errors?.length > 0 ? ` — ${result.errors.length} erreur(s)` : ''}`,
                    { variant: result.errors?.length > 0 ? 'warning' : 'success' }
                );
            }
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.error || 'Erreur lors de la soumission', { variant: 'error' });
        }
        finally { setSubmitting(false); }
    };

    // --- Results page ---
    if (results) {
        return (
            <Box p={3} maxWidth={800} mx="auto">
                <Typography variant="h5" fontWeight="700" mb={1}>Dépôt enregistré</Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    {selectedSub?.name} — {results.success?.length || 0} patient(s)
                </Typography>

                {/* Single batch invoice button */}
                {results.batch_invoice_id && (
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'primary.light', borderRadius: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography fontWeight="700">Facture globale sous-traitance</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total : {fmt(results.batch_total)} XAF — {results.success?.length} patient(s)
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            onClick={() => navigate(`/invoices/${results.batch_invoice_id}`)}
                        >
                            Voir la facture
                        </Button>
                    </Paper>
                )}

                {results.success?.length > 0 && (
                    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'success.light', borderRadius: 2, mb: 2 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                            <DoneIcon color="success" />
                            <Typography fontWeight="700" color="success.main">
                                {results.success.length} commande(s) créée(s) — statut : Prélèvement reçu
                            </Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Patient</TableCell>
                                        <TableCell>N° Commande</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                        <TableCell align="right"></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {results.success.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Typography variant="body2" fontWeight="600">{r.patient}</Typography></TableCell>
                                            <TableCell><Chip label={r.order_number} size="small" color="success" /></TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">{fmt(r.total)} XAF</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => navigate(`/healthcare/laboratory/${r.order_id}`)}
                                                >
                                                    Détail
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}

                {results.errors?.length > 0 && (
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'error.light', borderRadius: 2, mb: 2 }}>
                        <Typography fontWeight="700" color="error.main" mb={1}>{results.errors.length} erreur(s)</Typography>
                        {results.errors.map((e, i) => (
                            <Typography key={i} variant="body2" color="error">• {e.patient} : {e.error}</Typography>
                        ))}
                    </Paper>
                )}

                <Stack direction="row" spacing={2} mt={3}>
                    <Button variant="contained" onClick={() => { setResults(null); setRows([emptyRow(), emptyRow(), emptyRow()]); }}>
                        Nouvelle saisie
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/healthcare/laboratory')}>
                        Retour au laboratoire
                    </Button>
                </Stack>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/laboratory/subcontractors" />
                    <Box>
                        <Typography variant="h5" fontWeight="700">Saisie en masse — Sous-traitance</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Dépôt d'échantillons — commandes créées au statut "Prélèvement reçu"
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    onClick={handleSubmit}
                    disabled={submitting || validRows.length === 0 || !selectedSub}
                    color="success"
                >
                    Créer {validRows.length > 0 ? `${validRows.length} ` : ''}commande(s)
                </Button>
            </Box>

            {/* Global config */}
            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={5}>
                        <FormControl fullWidth>
                            <InputLabel>Laboratoire sous-traitant *</InputLabel>
                            <Select
                                value={selectedSub?.id || ''}
                                label="Laboratoire sous-traitant *"
                                onChange={e => {
                                    const sub = subcontractors.find(s => s.id === e.target.value) || null;
                                    handleSubcontractorChange(sub);
                                }}
                            >
                                <MenuItem value=""><em>Sélectionner...</em></MenuItem>
                                {subcontractors.map(s => (
                                    <MenuItem key={s.id} value={s.id}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <BusinessIcon fontSize="small" color="primary" />
                                            {s.name}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth>
                            <InputLabel>Paiement</InputLabel>
                            <Select value={paymentMethod} label="Paiement" onChange={e => setPaymentMethod(e.target.value)}>
                                <MenuItem value="cash">Espèces</MenuItem>
                                <MenuItem value="mobile_money">Mobile Money</MenuItem>
                                <MenuItem value="insurance">Assurance</MenuItem>
                                <MenuItem value="other">Autre</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        {selectedSub && !loading && (
                            <Stack spacing={0.5}>
                                <Alert severity={testsWithPrices.filter(t => t.has_subcontractor_price).length > 0 ? 'success' : 'warning'} sx={{ py: 0.5 }}>
                                    {testsWithPrices.filter(t => t.has_subcontractor_price).length} examen(s) avec tarif configuré
                                </Alert>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Typography variant="caption" color="text.secondary">
                                        {patients.length} patient(s) enregistré(s)
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<PersonAddIcon />}
                                        onClick={() => setNewPatientDialogOpen(true)}
                                        sx={{ fontSize: 12 }}
                                    >
                                        Nouveau patient
                                    </Button>
                                </Box>
                            </Stack>
                        )}
                        {loading && <CircularProgress size={20} />}
                    </Grid>
                </Grid>
            </Paper>

            {!selectedSub ? (
                <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    <ScienceIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">Sélectionnez un sous-traitant pour commencer</Typography>
                    <Typography variant="body2" color="text.disabled">
                        La liste des patients et examens configurés sera chargée automatiquement
                    </Typography>
                </Paper>
            ) : (
                <>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
                        <Box p={2} display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight="700">
                                Patients du laboratoire {selectedSub.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                💡 Le bouton copie applique les mêmes examens à tous les patients
                            </Typography>
                        </Box>
                        <Divider />
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell width={40}>#</TableCell>
                                        <TableCell width={280}>Patient (du sous-traitant)</TableCell>
                                        <TableCell>Examens à analyser</TableCell>
                                        <TableCell width={140}>Notes cliniques</TableCell>
                                        <TableCell width={105}>Priorité</TableCell>
                                        <TableCell width={120} align="right">Total</TableCell>
                                        <TableCell width={80}></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, i) => (
                                        <PatientRow
                                            key={i}
                                            row={row}
                                            index={i}
                                            patients={patients}
                                            testsWithPrices={testsWithPrices}
                                            onUpdate={updateRow}
                                            onRemove={removeRow}
                                            onCopyTests={copyTestsToAll}
                                            onOpenNewPatient={(idx, name = '') => { setNewPatientTargetRow(idx); setNewPatientInitialName(name); setNewPatientDialogOpen(true); }}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Box p={2}>
                            <Button startIcon={<AddIcon />} onClick={addRow} variant="outlined" size="small">
                                Ajouter une ligne
                            </Button>
                        </Box>
                    </Paper>

                    {/* Summary footer */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" p={2}
                        sx={{ bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                        <Stack direction="row" spacing={3}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Patients renseignés</Typography>
                                <Typography fontWeight="700">{validRows.length} / {rows.length}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Total examens</Typography>
                                <Typography fontWeight="700">{validRows.reduce((s, r) => s + r.tests.length, 0)}</Typography>
                            </Box>
                        </Stack>
                        <Box textAlign="right">
                            <Typography variant="caption" color="text.secondary">Montant total estimé</Typography>
                            <Typography variant="h6" fontWeight="700" color="primary.main">{fmt(grandTotal)} XAF</Typography>
                        </Box>
                    </Box>
                </>
            )}

            {/* New patient dialog */}
            <NewPatientDialog
                open={newPatientDialogOpen}
                onClose={() => setNewPatientDialogOpen(false)}
                onCreated={handlePatientCreated}
                subcontractorId={selectedSub?.id}
                initialName={newPatientInitialName}
            />
        </Box>
    );
};

export default SubcontractorOrderBatch;
