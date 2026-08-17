import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    MenuItem, Stack, IconButton, Typography, Box, Chip, CircularProgress,
} from '@mui/material';
import { Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import supportAPI from '../../services/supportAPI';

const MODULE_OPTIONS = [
    { value: 'dashboard', label: 'Tableau de bord' },
    { value: 'suppliers', label: 'Fournisseurs' },
    { value: 'purchase-orders', label: "Commandes d'achat" },
    { value: 'invoices', label: 'Factures' },
    { value: 'products', label: 'Produits' },
    { value: 'clients', label: 'Clients' },
    { value: 'e-sourcing', label: 'E-sourcing' },
    { value: 'contracts', label: 'Contrats' },
    { value: 'analytics', label: 'Analytique' },
    { value: 'patients', label: 'Patients' },
    { value: 'consultations', label: 'Consultations' },
    { value: 'laboratory', label: 'Laboratoire' },
    { value: 'imaging', label: 'Imagerie' },
    { value: 'pharmacy', label: 'Pharmacie' },
    { value: 'ai-assistant', label: 'Assistant IA' },
    { value: 'integrations', label: 'Intégrations' },
    { value: 'data-migration', label: 'Migration de données' },
    { value: 'other', label: 'Autre' },
];

const CATEGORY_OPTIONS = [
    { value: 'bug', label: 'Bug / erreur' },
    { value: 'facturation', label: 'Erreur de facturation' },
    { value: 'lenteur', label: 'Lenteur' },
    { value: 'affichage', label: "Problème d'affichage" },
    { value: 'donnee_manquante', label: 'Donnée manquante ou incorrecte' },
    { value: 'autre', label: 'Autre' },
];

const guessModuleFromPath = (pathname) => {
    const path = pathname || '';
    if (path.startsWith('/healthcare/laboratory')) return 'laboratory';
    if (path.startsWith('/healthcare/imaging')) return 'imaging';
    if (path.startsWith('/healthcare/pharmacy')) return 'pharmacy';
    if (path.startsWith('/healthcare/consultations')) return 'consultations';
    if (path.startsWith('/healthcare/patients') || path.startsWith('/patients')) return 'patients';
    if (path.startsWith('/invoices')) return 'invoices';
    if (path.startsWith('/purchase-orders')) return 'purchase-orders';
    if (path.startsWith('/suppliers')) return 'suppliers';
    if (path.startsWith('/products')) return 'products';
    if (path.startsWith('/clients')) return 'clients';
    if (path.startsWith('/e-sourcing')) return 'e-sourcing';
    if (path.startsWith('/contracts')) return 'contracts';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/ai-chat')) return 'ai-assistant';
    if (path.startsWith('/migration')) return 'data-migration';
    if (path === '/' || path.startsWith('/dashboard')) return 'dashboard';
    return 'other';
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function SupportDialog({ open, onClose }) {
    const { enqueueSnackbar } = useSnackbar();
    const [title, setTitle] = useState('');
    const [module, setModule] = useState(() => guessModuleFromPath(window.location.pathname));
    const [category, setCategory] = useState('bug');
    const [description, setDescription] = useState('');
    const [screenshots, setScreenshots] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setTitle('');
        setModule(guessModuleFromPath(window.location.pathname));
        setCategory('bug');
        setDescription('');
        setScreenshots([]);
    };

    const handleClose = () => {
        if (submitting) return;
        onClose();
    };

    const handleAddFiles = (e) => {
        const files = Array.from(e.target.files || []);
        const valid = files.filter(f => f.size <= MAX_FILE_SIZE);
        if (valid.length < files.length) {
            enqueueSnackbar('Certains fichiers dépassent 10 Mo et ont été ignorés', { variant: 'warning' });
        }
        setScreenshots(prev => [...prev, ...valid]);
        e.target.value = '';
    };

    const removeFile = (idx) => {
        setScreenshots(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            enqueueSnackbar('Titre et description sont obligatoires', { variant: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', title.trim());
            formData.append('module', module);
            formData.append('category', category);
            formData.append('description', description.trim());
            formData.append('page_url', window.location.pathname);
            screenshots.forEach(file => formData.append('screenshots', file));

            await supportAPI.createTicket(formData);
            enqueueSnackbar('Ticket envoyé — merci pour ton signalement !', { variant: 'success' });
            resetForm();
            onClose();
        } catch (err) {
            enqueueSnackbar("Erreur lors de l'envoi du ticket", { variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Signaler un problème
                <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <TextField
                        label="Titre"
                        placeholder="Résume le problème en une phrase"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        autoFocus
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            select label="Module concerné" value={module}
                            onChange={(e) => setModule(e.target.value)} fullWidth
                        >
                            {MODULE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select label="Catégorie" value={category}
                            onChange={(e) => setCategory(e.target.value)} fullWidth
                        >
                            {CATEGORY_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                    <TextField
                        label="Description"
                        placeholder="Que s'est-il passé ? Qu'est-ce que tu attendais à la place ?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline minRows={4} fullWidth
                    />
                    <Box>
                        <Button component="label" startIcon={<AddPhotoIcon />} size="small" variant="outlined">
                            Ajouter une capture d'écran
                            <input type="file" accept="image/*" multiple hidden onChange={handleAddFiles} />
                        </Button>
                        {screenshots.length > 0 && (
                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1, gap: 1 }}>
                                {screenshots.map((file, idx) => (
                                    <Chip
                                        key={idx}
                                        label={file.name}
                                        onDelete={() => removeFile(idx)}
                                        deleteIcon={<DeleteIcon />}
                                        size="small"
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        Page actuelle : {window.location.pathname}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={submitting}>Annuler</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
                    {submitting ? <CircularProgress size={20} /> : 'Envoyer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
