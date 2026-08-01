import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Typography, Paper, Grid, TextField, Autocomplete,
    Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Divider, Stack, CircularProgress, Alert, Tooltip,
    Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle,
    DialogContent, DialogActions, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
    Add as AddIcon, Delete as DeleteIcon, Send as SendIcon,
    Business as BusinessIcon, CheckCircle as DoneIcon,
    ContentCopy as CopyIcon, MedicalInformation as ImagingIcon,
    PersonAdd as PersonAddIcon, Payment as PaymentIcon,
    CreditCard as DeferredIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import imagingAPI from '../../../services/imagingAPI';
import laboratoryAPI from '../../../services/laboratoryAPI';
import BackButton from '../../../components/navigation/BackButton';

const fmt = v => new Intl.NumberFormat('fr-FR').format(v || 0);

const NewPatientDialog = ({ open, onClose, onCreated, subcontractorId, initialName = '' }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [form, setForm] = useState({ first_name: '', last_name: '', gender: '', date_of_birth: '', age: '' });
    const [saving, setSaving] = useState(false);
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        if (open) {
            const parts = initialName.trim().split(/\s+/);
            setForm({ last_name: parts[0] || '', first_name: parts.slice(1).join(' '), gender: '', date_of_birth: '', age: '' });
        }
    }, [open, initialName]);

    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            enqueueSnackbar('Prénom et nom sont obligatoires', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            const payload = { first_name: form.first_name.trim(), last_name: form.last_name.trim(), gender: form.gender || '' };
            if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;
            if (form.age && !form.date_of_birth) payload.age = parseInt(form.age, 10);

            const patient = await laboratoryAPI.createSubcontractorPatient(subcontractorId, payload);
            enqueueSnackbar('Patient créé', { variant: 'success' });
            onCreated(patient);
            onClose();
            setForm({ first_name: '', last_name: '', gender: '', date_of_birth: '', age: '' });
        } catch { enqueueSnackbar('Erreur lors de la création', { variant: 'error' }); }
        finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField label="Date de naissance" type="date" value={form.date_of_birth}
                                onChange={e => f('date_of_birth', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField label="Âge" type="number" value={form.age} onChange={e => f('age', e.target.value)}
                                fullWidth disabled={!!form.date_of_birth} inputProps={{ min: 0, max: 120 }} />
                        </Grid>
                    </Grid>
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

const PatientRow = ({ row, index, patients, examTypes, onUpdate, onRemove, onCopyExams, onOpenNewPatient }) => {
    const rowTotal = row.exams.reduce((s, e) => s + (parseFloat(e.price) || 0), 0);

    return (
        <TableRow sx={{ verticalAlign: 'top', '& td': { pt: 1.5, pb: 1 } }}>
            <TableCell width={40}><Typography variant="body2" fontWeight="700" color="text.secondary">#{index + 1}</Typography></TableCell>

            <TableCell width={280}>
                <Autocomplete
                    size="small"
                    options={patients}
                    getOptionLabel={p => p.full_name}
                    value={row.patient}
                    onChange={(_, v) => {
                        if (v?.__isCreate) onOpenNewPatient(index, v._inputValue);
                        else onUpdate(index, 'patient', v);
                    }}
                    renderInput={params => <TextField {...params} placeholder="Nom du patient..." size="small" />}
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
                        const filtered = input ? options.filter(p => p.full_name.toLowerCase().includes(input)) : options;
                        if (input) filtered.push({ __isCreate: true, full_name: `Créer "${state.inputValue}"`, _inputValue: state.inputValue });
                        return filtered;
                    }}
                />
            </TableCell>

            <TableCell>
                <Autocomplete
                    size="small" multiple
                    options={examTypes}
                    getOptionLabel={e => e.name}
                    value={row.exams}
                    onChange={(_, v) => onUpdate(index, 'exams', v)}
                    renderTags={(value, getTagProps) => value.map((e, i) => {
                        const { key, ...tagProps } = getTagProps({ index: i });
                        return <Chip key={key} label={e.short_name || e.name} size="small" {...tagProps} title={`${e.name} — ${fmt(e.price)} XAF`} />;
                    })}
                    renderInput={params => <TextField {...params} placeholder="Ajouter des examens..." size="small" />}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    limitTags={6}
                />
            </TableCell>

            <TableCell width={140}>
                <TextField size="small" placeholder="Notes cliniques" value={row.clinical_notes}
                    onChange={e => onUpdate(index, 'clinical_notes', e.target.value)} multiline maxRows={3} fullWidth />
            </TableCell>

            <TableCell width={105}>
                <Select size="small" value={row.priority} onChange={e => onUpdate(index, 'priority', e.target.value)} fullWidth>
                    <MenuItem value="routine">Routine</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="stat">STAT</MenuItem>
                </Select>
            </TableCell>

            <TableCell width={120} align="right">
                <Typography variant="body2" fontWeight="700">{fmt(rowTotal)} XAF</Typography>
                <Typography variant="caption" color="text.secondary">{row.exams.length} examen(s)</Typography>
            </TableCell>

            <TableCell width={80}>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Copier les examens vers tous les autres patients">
                        <span>
                            <IconButton size="small" onClick={() => onCopyExams(index)} disabled={row.exams.length === 0}>
                                <CopyIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Supprimer cette ligne">
                        <IconButton size="small" color="error" onClick={() => onRemove(index)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                </Stack>
            </TableCell>
        </TableRow>
    );
};

const emptyRow = () => ({ patient: null, exams: [], clinical_notes: '', priority: 'routine' });

const ImagingSubcontractorBatchOrder = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { enqueueSnackbar } = useSnackbar();

    const [subcontractors, setSubcontractors] = useState([]);
    const [selectedSub, setSelectedSub] = useState(null);
    const [examTypes, setExamTypes] = useState([]);
    const [patients, setPatients] = useState([]);
    const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentMode, setPaymentMode] = useState('deferred');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    const [newPatientDialogOpen, setNewPatientDialogOpen] = useState(false);
    const [newPatientTargetRow, setNewPatientTargetRow] = useState(null);
    const [newPatientInitialName, setNewPatientInitialName] = useState('');

    useEffect(() => {
        imagingAPI.getExamTypes({ page_size: 1000 }).then(data => {
            setExamTypes(Array.isArray(data) ? data : data.results || []);
        });
        laboratoryAPI.getSubcontractors({ active_only: 'true' }).then(data => {
            const subs = Array.isArray(data) ? data : (data.results || []);
            setSubcontractors(subs);
            const preId = searchParams.get('subcontractor');
            if (preId) {
                const found = subs.find(s => s.id === preId);
                if (found) handleSubcontractorChange(found);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadSubcontractorPatients = async (sub) => {
        setLoading(true);
        try {
            const patientsData = await laboratoryAPI.getSubcontractorPatients(sub.id);
            setPatients(Array.isArray(patientsData) ? patientsData : (patientsData.results || []));
        } catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
        finally { setLoading(false); }
    };

    const handleSubcontractorChange = (sub) => {
        setSelectedSub(sub);
        setPatients([]);
        setRows([emptyRow(), emptyRow(), emptyRow()]);
        if (sub) loadSubcontractorPatients(sub);
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

    const removeRow = useCallback((index) => setRows(prev => prev.filter((_, i) => i !== index)), []);
    const addRow = () => setRows(prev => [...prev, emptyRow()]);

    const copyExamsToAll = useCallback((sourceIndex) => {
        const sourceExams = rows[sourceIndex].exams;
        setRows(prev => prev.map((row, i) => i === sourceIndex ? row : { ...row, exams: [...sourceExams] }));
        enqueueSnackbar(`Examens de la ligne #${sourceIndex + 1} copiés vers tous les patients`, { variant: 'info' });
    }, [rows, enqueueSnackbar]);

    const validRows = rows.filter(r => r.patient && r.exams.length > 0);
    const grandTotal = rows.reduce((sum, row) => sum + row.exams.reduce((s, e) => s + (parseFloat(e.price) || 0), 0), 0);

    const handleSubmit = async () => {
        if (!selectedSub) { enqueueSnackbar('Sélectionnez un partenaire', { variant: 'warning' }); return; }
        if (validRows.length === 0) { enqueueSnackbar('Au moins un patient avec des examens est requis', { variant: 'warning' }); return; }

        setSubmitting(true);
        try {
            const result = await imagingAPI.batchOrder(selectedSub.id, {
                rows: validRows.map(r => ({
                    subcontractor_patient_id: r.patient.id,
                    exam_type_ids: r.exams.map(e => e.id),
                    priority: r.priority,
                    clinical_notes: r.clinical_notes || '',
                })),
                payment_method: paymentMethod,
                payment_mode: paymentMode,
            });
            setResults(result);
            if (result.success?.length > 0) {
                enqueueSnackbar(`${result.success.length} commande(s) créée(s)`, { variant: 'success' });
            }
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.error || 'Erreur lors de la soumission', { variant: 'error' });
        }
        finally { setSubmitting(false); }
    };

    if (results) {
        return (
            <Box p={3} maxWidth={800} mx="auto">
                <Typography variant="h5" fontWeight="700" mb={1}>Dépôt enregistré</Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    {selectedSub?.name} — {results.success?.length || 0} patient(s)
                </Typography>

                {results.batch_invoice_id && (
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: paymentMode === 'deferred' ? 'warning.light' : 'primary.light', borderRadius: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography fontWeight="700">Facture globale sous-traitance</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total : {fmt(results.batch_total)} XAF — {results.success?.length} patient(s)
                            </Typography>
                            {paymentMode === 'deferred' && (
                                <Chip label="Crédit différé — à encaisser" color="warning" size="small" sx={{ mt: 0.5 }} />
                            )}
                        </Box>
                        <Button variant="contained" onClick={() => navigate(`/invoices/${results.batch_invoice_id}`)}>Voir la facture</Button>
                    </Paper>
                )}

                {results.success?.length > 0 && (
                    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'success.light', borderRadius: 2, mb: 2 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                            <DoneIcon color="success" />
                            <Typography fontWeight="700" color="success.main">{results.success.length} commande(s) créée(s)</Typography>
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
                                            <TableCell align="right"><Typography variant="body2">{fmt(r.total)} XAF</Typography></TableCell>
                                            <TableCell align="right">
                                                <Button size="small" variant="outlined" onClick={() => navigate(`/healthcare/imaging/${r.order_id}`)}>Détail</Button>
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
                        {results.errors.map((e, i) => <Typography key={i} variant="body2" color="error">• {e.patient} : {e.error}</Typography>)}
                    </Paper>
                )}

                <Stack direction="row" spacing={2} mt={3}>
                    <Button variant="contained" onClick={() => { setResults(null); setRows([emptyRow(), emptyRow(), emptyRow()]); }}>Nouvelle saisie</Button>
                    <Button variant="outlined" onClick={() => navigate('/healthcare/imaging')}>Retour à l'imagerie</Button>
                </Stack>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/imaging" />
                    <Box>
                        <Typography variant="h5" fontWeight="700">Dépôt sous-traitance — Imagerie</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Dépôt groupé pour un partenaire externe — une facture consolidée par dépôt
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained" size="large" color="success"
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    onClick={handleSubmit}
                    disabled={submitting || validRows.length === 0 || !selectedSub}
                >
                    Créer {validRows.length > 0 ? `${validRows.length} ` : ''}commande(s)
                </Button>
            </Box>

            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                            <InputLabel>Partenaire imagerie *</InputLabel>
                            <Select
                                value={selectedSub?.id || ''}
                                label="Partenaire imagerie *"
                                onChange={e => handleSubcontractorChange(subcontractors.find(s => s.id === e.target.value) || null)}
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
                    <Grid item xs={12} sm={5}>
                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Mode de règlement</Typography>
                        <ToggleButtonGroup value={paymentMode} exclusive onChange={(_, val) => { if (val) setPaymentMode(val); }} size="small" fullWidth>
                            <ToggleButton value="immediate" color="success" sx={{ gap: 0.5 }}><PaymentIcon fontSize="small" />Paiement immédiat</ToggleButton>
                            <ToggleButton value="deferred" color="warning" sx={{ gap: 0.5 }}><DeferredIcon fontSize="small" />Crédit différé</ToggleButton>
                        </ToggleButtonGroup>
                        {paymentMode === 'deferred' && (
                            <Alert severity="warning" sx={{ mt: 1, py: 0.25, fontSize: 12 }}>
                                La facture sera créée mais non comptabilisée en caisse jusqu'au paiement.
                            </Alert>
                        )}
                    </Grid>
                </Grid>

                {selectedSub && !loading && (
                    <Box mt={2} display="flex" alignItems="center" justifyContent="space-between">
                        <Alert severity="info" sx={{ py: 0.5 }}>{patients.length} patient(s) enregistré(s) pour ce partenaire</Alert>
                        <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setNewPatientDialogOpen(true)} sx={{ ml: 2 }}>
                            Nouveau patient
                        </Button>
                    </Box>
                )}
                {loading && <Box mt={1}><CircularProgress size={20} /></Box>}
            </Paper>

            {!selectedSub ? (
                <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                    <ImagingIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">Sélectionnez un partenaire pour commencer</Typography>
                </Paper>
            ) : (
                <>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
                        <Box p={2} display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight="700">Patients de {selectedSub.name}</Typography>
                            <Typography variant="caption" color="text.secondary">💡 Le bouton copie applique les mêmes examens à tous les patients</Typography>
                        </Box>
                        <Divider />
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell width={40}>#</TableCell>
                                        <TableCell width={280}>Patient (du partenaire)</TableCell>
                                        <TableCell>Examens</TableCell>
                                        <TableCell width={140}>Notes cliniques</TableCell>
                                        <TableCell width={105}>Priorité</TableCell>
                                        <TableCell width={120} align="right">Total</TableCell>
                                        <TableCell width={80}></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row, i) => (
                                        <PatientRow
                                            key={i} row={row} index={i} patients={patients} examTypes={examTypes}
                                            onUpdate={updateRow} onRemove={removeRow} onCopyExams={copyExamsToAll}
                                            onOpenNewPatient={(idx, name = '') => { setNewPatientTargetRow(idx); setNewPatientInitialName(name); setNewPatientDialogOpen(true); }}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Box p={2}>
                            <Button startIcon={<AddIcon />} onClick={addRow} variant="outlined" size="small">Ajouter une ligne</Button>
                        </Box>
                    </Paper>

                    <Box display="flex" alignItems="center" justifyContent="space-between" p={2}
                        sx={{ bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                        <Stack direction="row" spacing={3}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Patients renseignés</Typography>
                                <Typography fontWeight="700">{validRows.length} / {rows.length}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Total examens</Typography>
                                <Typography fontWeight="700">{validRows.reduce((s, r) => s + r.exams.length, 0)}</Typography>
                            </Box>
                        </Stack>
                        <Box textAlign="right">
                            <Typography variant="caption" color="text.secondary">Montant total estimé</Typography>
                            <Typography variant="h6" fontWeight="700" color="primary.main">{fmt(grandTotal)} XAF</Typography>
                        </Box>
                    </Box>
                </>
            )}

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

export default ImagingSubcontractorBatchOrder;
