import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Typography, CircularProgress, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField,
    Chip, IconButton, Tooltip, Stack, Dialog, DialogTitle, DialogContent,
    DialogActions, Grid, FormControl, InputLabel, Select, MenuItem,
    InputAdornment, Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    People as PeopleIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import BackButton from '../../../components/navigation/BackButton';

const EMPTY_FORM = { first_name: '', last_name: '', gender: '' };

const GENDER_LABELS = { M: 'Masculin', F: 'Féminin', O: 'Autre' };

const SubcontractorPatients = () => {
    const { id: subcontractorId } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const [subcontractor, setSubcontractor] = useState(null);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sub, pts] = await Promise.all([
                laboratoryAPI.getSubcontractor(subcontractorId),
                laboratoryAPI.getSubcontractorPatients(subcontractorId, search ? { search } : {}),
            ]);
            setSubcontractor(sub);
            setPatients(Array.isArray(pts) ? pts : (pts.results || []));
        } catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
        finally { setLoading(false); }
    }, [subcontractorId, search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEdit = (patient) => {
        setEditing(patient);
        setForm({
            first_name: patient.first_name || '',
            last_name: patient.last_name || '',
            gender: patient.gender || '',
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            enqueueSnackbar('Prénom et nom sont obligatoires', { variant: 'warning' });
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await laboratoryAPI.updateSubcontractorPatient(subcontractorId, editing.id, form);
                enqueueSnackbar('Patient mis à jour', { variant: 'success' });
            } else {
                await laboratoryAPI.createSubcontractorPatient(subcontractorId, form);
                enqueueSnackbar('Patient créé', { variant: 'success' });
            }
            setDialogOpen(false);
            fetchData();
        } catch { enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }); }
        finally { setSaving(false); }
    };

    const handleDelete = async (patient) => {
        if (!window.confirm(`Supprimer "${patient.full_name}" ?`)) return;
        try {
            await laboratoryAPI.deleteSubcontractorPatient(subcontractorId, patient.id);
            enqueueSnackbar('Patient supprimé', { variant: 'success' });
            fetchData();
        } catch { enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' }); }
    };

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/laboratory/subcontractors" />
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <PeopleIcon color="primary" />
                            <Typography variant="h5" fontWeight="700">
                                Patients — {subcontractor?.name || '…'}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Patients enregistrés pour ce laboratoire sous-traitant
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Nouveau Patient
                </Button>
            </Box>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box p={2}>
                    <TextField
                        size="small"
                        placeholder="Rechercher (nom, prénom)…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        sx={{ width: 320 }}
                    />
                </Box>
                <Divider />
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell>Nom complet</TableCell>
                                    <TableCell>Sexe</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {patients.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                            <PeopleIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                                            <Typography color="text.secondary">Aucun patient enregistré</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : patients.map(patient => (
                                    <TableRow key={patient.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="600">{patient.full_name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {patient.gender ? (
                                                <Chip
                                                    label={GENDER_LABELS[patient.gender] || patient.gender}
                                                    size="small"
                                                    color={patient.gender === 'M' ? 'info' : patient.gender === 'F' ? 'secondary' : 'default'}
                                                    variant="outlined"
                                                />
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Modifier">
                                                <IconButton size="small" onClick={() => openEdit(patient)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Supprimer">
                                                <IconButton size="small" color="error" onClick={() => handleDelete(patient)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{editing ? 'Modifier le patient' : 'Nouveau patient'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField label="Nom *" value={form.last_name} onChange={e => f('last_name', e.target.value)} fullWidth autoFocus />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField label="Prénom *" value={form.first_name} onChange={e => f('first_name', e.target.value)} fullWidth />
                            </Grid>
                        </Grid>
                        <FormControl fullWidth>
                            <InputLabel>Sexe</InputLabel>
                            <Select value={form.gender} label="Sexe" onChange={e => f('gender', e.target.value)}>
                                <MenuItem value="">—</MenuItem>
                                <MenuItem value="M">Masculin</MenuItem>
                                <MenuItem value="F">Féminin</MenuItem>
                                <MenuItem value="O">Autre</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={18} /> : (editing ? 'Enregistrer' : 'Créer')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SubcontractorPatients;
