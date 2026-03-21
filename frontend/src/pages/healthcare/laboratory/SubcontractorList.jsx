import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, CardActions, Grid, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Chip, IconButton, Tooltip, Divider, Stack, CircularProgress,
    Switch, FormControlLabel
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Business as BusinessIcon,
    PriceChange as PriceIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import BackButton from '../../../components/navigation/BackButton';

const SubcontractorList = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [subcontractors, setSubcontractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', address: '', phone: '', email: '', header_text: '', is_active: true,
    });
    const [logoFile, setLogoFile] = useState(null);

    useEffect(() => { fetchList(); }, []);

    const fetchList = async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getSubcontractors();
            setSubcontractors(Array.isArray(data) ? data : (data.results || []));
        } catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
        finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', address: '', phone: '', email: '', header_text: '', is_active: true });
        setLogoFile(null);
        setDialogOpen(true);
    };

    const openEdit = async (sub) => {
        setEditing(sub);
        const detail = await laboratoryAPI.getSubcontractor(sub.id);
        setForm({
            name: detail.name || '',
            address: detail.address || '',
            phone: detail.phone || '',
            email: detail.email || '',
            header_text: detail.header_text || '',
            is_active: detail.is_active,
        });
        setLogoFile(null);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { enqueueSnackbar('Le nom est obligatoire', { variant: 'warning' }); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            if (logoFile) fd.append('logo', logoFile);

            if (editing) {
                await laboratoryAPI.updateSubcontractor(editing.id, fd);
                enqueueSnackbar('Sous-traitant mis à jour', { variant: 'success' });
            } else {
                await laboratoryAPI.createSubcontractor(fd);
                enqueueSnackbar('Sous-traitant créé', { variant: 'success' });
            }
            setDialogOpen(false);
            fetchList();
        } catch { enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }); }
        finally { setSaving(false); }
    };

    const handleDelete = async (sub) => {
        if (!window.confirm(`Supprimer "${sub.name}" ?`)) return;
        try {
            await laboratoryAPI.deleteSubcontractor(sub.id);
            enqueueSnackbar('Supprimé', { variant: 'success' });
            fetchList();
        } catch { enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' }); }
    };

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/laboratory/catalog" />
                    <Box>
                        <Typography variant="h5" fontWeight="700">Laboratoires Sous-traitants</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Gérez vos partenaires externes et leurs tarifs d'analyses
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Nouveau Sous-traitant
                </Button>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
            ) : subcontractors.length === 0 ? (
                <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', p: 4, textAlign: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">Aucun laboratoire sous-traitant</Typography>
                    <Typography variant="body2" color="text.disabled" mb={2}>
                        Ajoutez vos partenaires externes pour sous-traiter des analyses
                    </Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
                        Ajouter le premier sous-traitant
                    </Button>
                </Card>
            ) : (
                <Grid container spacing={2}>
                    {subcontractors.map(sub => (
                        <Grid item xs={12} sm={6} md={4} key={sub.id}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: sub.is_active ? 'divider' : 'error.light', height: '100%' }}>
                                <CardContent>
                                    <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'primary.50' }}>
                                                <BusinessIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="700">{sub.name}</Typography>
                                                <Chip
                                                    size="small"
                                                    label={sub.is_active ? 'Actif' : 'Inactif'}
                                                    color={sub.is_active ? 'success' : 'default'}
                                                    sx={{ mt: 0.5 }}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                    {sub.phone && <Typography variant="body2" color="text.secondary" mt={1}>📞 {sub.phone}</Typography>}
                                    {sub.email && <Typography variant="body2" color="text.secondary">✉️ {sub.email}</Typography>}
                                    <Box mt={1.5}>
                                        <Chip
                                            icon={<PriceIcon />}
                                            label={`${sub.prices_count || 0} tarif(s) configuré(s)`}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                        />
                                    </Box>
                                </CardContent>
                                <Divider />
                                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                                    <Button
                                        size="small"
                                        startIcon={<PriceIcon />}
                                        onClick={() => navigate(`/healthcare/laboratory/subcontractors/${sub.id}/prices`)}
                                    >
                                        Gérer les tarifs
                                    </Button>
                                    <Box>
                                        <Tooltip title="Modifier">
                                            <IconButton size="small" onClick={() => openEdit(sub)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Supprimer">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(sub)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Dialog Create/Edit */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editing ? 'Modifier le sous-traitant' : 'Nouveau laboratoire sous-traitant'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            label="Nom du laboratoire *"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            fullWidth
                        />
                        <TextField
                            label="Adresse"
                            value={form.address}
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="Téléphone"
                                    value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="Email"
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            label="Entête du rapport PDF"
                            value={form.header_text}
                            onChange={e => setForm(f => ({ ...f, header_text: e.target.value }))}
                            fullWidth
                            multiline
                            rows={3}
                            helperText="Ce texte apparaît en entête des rapports PDF sous-traités (accréditations, mentions légales, etc.)"
                        />
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                Logo (affiché sur les rapports PDF)
                            </Typography>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setLogoFile(e.target.files[0])}
                                style={{ fontSize: 14 }}
                            />
                            {logoFile && (
                                <Typography variant="caption" color="success.main" display="block" mt={0.5}>
                                    Fichier sélectionné : {logoFile.name}
                                </Typography>
                            )}
                        </Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                />
                            }
                            label="Actif"
                        />
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

export default SubcontractorList;
