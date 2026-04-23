import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, CardActions, Grid, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Chip, IconButton, Tooltip, Divider, Stack, CircularProgress,
    Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
    Avatar,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Business as BusinessIcon,
    PriceChange as PriceIcon,
    ExpandMore as ExpandMoreIcon,
    People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import BackButton from '../../../components/navigation/BackButton';

const EMPTY_FORM = {
    name: '', city: '', address: '', phone: '', fax: '', email: '', website: '',
    niu: '', rc_number: '', rccm_number: '', tax_number: '',
    bank_name: '', bank_account: '',
    brand_color: '#2563eb',
    header_text: '',
    is_active: true,
};

const SubcontractorList = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [subcontractors, setSubcontractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [headerFile, setHeaderFile] = useState(null);
    const [headerPreview, setHeaderPreview] = useState(null);
    const [footerFile, setFooterFile] = useState(null);
    const [footerPreview, setFooterPreview] = useState(null);

    useEffect(() => { fetchList(); }, []);

    const fetchList = async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getSubcontractors();
            setSubcontractors(Array.isArray(data) ? data : (data.results || []));
        } catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
        finally { setLoading(false); }
    };

    const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setLogoFile(null); setLogoPreview(null);
        setHeaderFile(null); setHeaderPreview(null);
        setFooterFile(null); setFooterPreview(null);
        setDialogOpen(true);
    };

    const openEdit = async (sub) => {
        setEditing(sub);
        const detail = await laboratoryAPI.getSubcontractor(sub.id);
        setForm({
            name: detail.name || '',
            city: detail.city || '',
            address: detail.address || '',
            phone: detail.phone || '',
            fax: detail.fax || '',
            email: detail.email || '',
            website: detail.website || '',
            niu: detail.niu || '',
            rc_number: detail.rc_number || '',
            rccm_number: detail.rccm_number || '',
            tax_number: detail.tax_number || '',
            bank_name: detail.bank_name || '',
            bank_account: detail.bank_account || '',
            brand_color: detail.brand_color || '#2563eb',
            header_text: detail.header_text || '',
            is_active: detail.is_active,
        });
        setLogoFile(null); setLogoPreview(detail.logo_url || null);
        setHeaderFile(null); setHeaderPreview(detail.header_image_url || null);
        setFooterFile(null); setFooterPreview(detail.footer_image_url || null);
        setDialogOpen(true);
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleHeaderChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setHeaderFile(file);
        setHeaderPreview(URL.createObjectURL(file));
    };

    const handleFooterChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFooterFile(file);
        setFooterPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        if (!form.name.trim()) { enqueueSnackbar('Le nom est obligatoire', { variant: 'warning' }); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (v !== null && v !== undefined) fd.append(k, v);
            });
            if (logoFile) fd.append('logo', logoFile);
            if (headerFile) fd.append('header_image', headerFile);
            if (footerFile) fd.append('footer_image', footerFile);

            if (editing) {
                await laboratoryAPI.updateSubcontractor(editing.id, fd);
                enqueueSnackbar('Sous-traitant mis à jour', { variant: 'success' });
            } else {
                await laboratoryAPI.createSubcontractor(fd);
                enqueueSnackbar('Sous-traitant créé', { variant: 'success' });
            }
            setDialogOpen(false);
            fetchList();
        } catch (err) {
            const msg = err?.response?.data ? JSON.stringify(err.response.data) : 'Erreur lors de la sauvegarde';
            enqueueSnackbar(msg, { variant: 'error' });
        }
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
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: sub.is_active ? 'divider' : 'error.light', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box display="flex" alignItems="flex-start" gap={1.5}>
                                        {sub.logo_url ? (
                                            <Avatar src={sub.logo_url} variant="rounded" sx={{ width: 48, height: 48, border: '1px solid', borderColor: 'divider' }} />
                                        ) : (
                                            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${sub.brand_color || '#2563eb'}15`, flexShrink: 0 }}>
                                                <BusinessIcon sx={{ color: sub.brand_color || 'primary.main', fontSize: 28 }} />
                                            </Box>
                                        )}
                                        <Box flex={1}>
                                            <Typography variant="subtitle1" fontWeight="700">{sub.name}</Typography>
                                            {sub.city && <Typography variant="caption" color="text.secondary">{sub.city}</Typography>}
                                            <Box mt={0.5}>
                                                <Chip size="small" label={sub.is_active ? 'Actif' : 'Inactif'} color={sub.is_active ? 'success' : 'default'} />
                                            </Box>
                                        </Box>
                                    </Box>
                                    {sub.phone && <Typography variant="body2" color="text.secondary" mt={1}>📞 {sub.phone}</Typography>}
                                    {sub.email && <Typography variant="body2" color="text.secondary">✉️ {sub.email}</Typography>}
                                    <Box mt={1.5} display="flex" gap={1} flexWrap="wrap">
                                        <Chip icon={<PriceIcon />} label={`${sub.prices_count || 0} tarif(s)`} size="small" variant="outlined" color="primary" />
                                    </Box>
                                </CardContent>
                                <Divider />
                                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                                    <Stack direction="row" spacing={1}>
                                        <Button size="small" variant="outlined" onClick={() => navigate(`/healthcare/laboratory/subcontractors/${sub.id}`)}>
                                            Voir
                                        </Button>
                                        <Button size="small" startIcon={<PriceIcon />} onClick={() => navigate(`/healthcare/laboratory/subcontractors/${sub.id}/prices`)}>
                                            Tarifs
                                        </Button>
                                        <Button size="small" startIcon={<PeopleIcon />} onClick={() => navigate(`/healthcare/laboratory/subcontractors/${sub.id}/patients`)}>
                                            Patients
                                        </Button>
                                    </Stack>
                                    <Box>
                                        <Tooltip title="Modifier">
                                            <IconButton size="small" onClick={() => openEdit(sub)}><EditIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                        <Tooltip title="Supprimer">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(sub)}><DeleteIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                    </Box>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Dialog Create/Edit */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>{editing ? 'Modifier le sous-traitant' : 'Nouveau laboratoire sous-traitant'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={0} mt={1}>

                        {/* Section: Identité */}
                        <Accordion defaultExpanded elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2" fontWeight="700">Identité</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={8}>
                                            <TextField label="Nom du laboratoire *" value={form.name} onChange={e => f('name', e.target.value)} fullWidth />
                                        </Grid>
                                        <Grid item xs={4}>
                                            <TextField label="Ville" value={form.city} onChange={e => f('city', e.target.value)} fullWidth />
                                        </Grid>
                                    </Grid>
                                    <TextField label="Adresse complète" value={form.address} onChange={e => f('address', e.target.value)} fullWidth multiline rows={2} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={4}>
                                            <TextField label="Téléphone" value={form.phone} onChange={e => f('phone', e.target.value)} fullWidth />
                                        </Grid>
                                        <Grid item xs={4}>
                                            <TextField label="Fax" value={form.fax} onChange={e => f('fax', e.target.value)} fullWidth />
                                        </Grid>
                                        <Grid item xs={4}>
                                            <TextField label="Email" type="email" value={form.email} onChange={e => f('email', e.target.value)} fullWidth />
                                        </Grid>
                                    </Grid>
                                    <TextField label="Site web" value={form.website} onChange={e => f('website', e.target.value)} fullWidth placeholder="https://" />
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        {/* Section: Identifiants légaux */}
                        <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2" fontWeight="700">Identifiants légaux & fiscaux</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField label="NIU (Numéro Identifiant Unique)" value={form.niu} onChange={e => f('niu', e.target.value)} fullWidth helperText="Obligatoire au Cameroun" />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField label="Numéro contribuable" value={form.tax_number} onChange={e => f('tax_number', e.target.value)} fullWidth />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField label="Numéro RC" value={form.rc_number} onChange={e => f('rc_number', e.target.value)} fullWidth helperText="Registre de Commerce" />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField label="Numéro RCCM" value={form.rccm_number} onChange={e => f('rccm_number', e.target.value)} fullWidth helperText="Registre du Commerce et du Crédit Mobilier" />
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>

                        {/* Section: Banque */}
                        <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2" fontWeight="700">Coordonnées bancaires</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField label="Banque" value={form.bank_name} onChange={e => f('bank_name', e.target.value)} fullWidth />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField label="Numéro de compte" value={form.bank_account} onChange={e => f('bank_account', e.target.value)} fullWidth />
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>

                        {/* Section: Apparence PDF */}
                        <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2" fontWeight="700">Apparence des rapports PDF</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Logo</Typography>
                                            {logoPreview && (
                                                <Box component="img" src={logoPreview} sx={{ height: 60, maxWidth: 160, objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1, display: 'block' }} />
                                            )}
                                            <input type="file" accept="image/*" onChange={handleLogoChange} style={{ fontSize: 13 }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Couleur principale</Typography>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <input type="color" value={form.brand_color || '#2563eb'} onChange={e => f('brand_color', e.target.value)} style={{ width: 40, height: 36, cursor: 'pointer', border: 'none', padding: 2 }} />
                                                <TextField size="small" value={form.brand_color} onChange={e => f('brand_color', e.target.value)} sx={{ width: 110 }} placeholder="#2563eb" />
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                            Image d'en-tête PDF <Typography component="span" variant="caption" color="text.disabled">(pleine largeur, recommandé : 2480×300 px)</Typography>
                                        </Typography>
                                        {headerPreview && (
                                            <Box component="img" src={headerPreview} sx={{ width: '100%', maxHeight: 80, objectFit: 'contain', objectPosition: 'left', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1, display: 'block' }} />
                                        )}
                                        <input type="file" accept="image/*" onChange={handleHeaderChange} style={{ fontSize: 13 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                            Image de pied de page PDF <Typography component="span" variant="caption" color="text.disabled">(pleine largeur, recommandé : 2480×200 px)</Typography>
                                        </Typography>
                                        {footerPreview && (
                                            <Box component="img" src={footerPreview} sx={{ width: '100%', maxHeight: 60, objectFit: 'contain', objectPosition: 'left', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1, display: 'block' }} />
                                        )}
                                        <input type="file" accept="image/*" onChange={handleFooterChange} style={{ fontSize: 13 }} />
                                    </Box>
                                    <TextField
                                        label="Entête libre (accréditations, mentions légales…)"
                                        value={form.header_text}
                                        onChange={e => f('header_text', e.target.value)}
                                        fullWidth multiline rows={3}
                                        helperText="Texte affiché dans l'entête des rapports PDF de ce sous-traitant"
                                    />
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <FormControlLabel
                            control={<Switch checked={form.is_active} onChange={e => f('is_active', e.target.checked)} />}
                            label="Sous-traitant actif"
                            sx={{ mt: 1 }}
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
