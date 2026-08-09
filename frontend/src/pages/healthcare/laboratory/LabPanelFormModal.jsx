import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Typography, Box, IconButton, CircularProgress, Chip, Divider,
    Autocomplete, InputAdornment, Alert,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import imagingAPI from '../../../services/imagingAPI';

const EMPTY_FORM = {
    code: '',
    name: '',
    description: '',
    price: '',
    discount: '0',
    is_active: true,
};

export default function LabPanelFormModal({ open, onClose, panel, onSaved }) {
    const { enqueueSnackbar } = useSnackbar();
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [selectedTests, setSelectedTests] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [testSearch, setTestSearch] = useState('');
    const [selectedImagingExams, setSelectedImagingExams] = useState([]);
    const [allImagingExams, setAllImagingExams] = useState([]);
    const [imagingExamSearch, setImagingExamSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingTests, setLoadingTests] = useState(false);
    const [loadingImagingExams, setLoadingImagingExams] = useState(false);

    useEffect(() => {
        if (open) {
            fetchTests();
            fetchImagingExams();
            if (panel) {
                setFormData({
                    code: panel.code || '',
                    name: panel.name || '',
                    description: panel.description || '',
                    price: panel.price != null ? String(panel.price) : '',
                    discount: panel.discount != null ? String(panel.discount) : '0',
                    is_active: panel.is_active !== undefined ? panel.is_active : true,
                });
                setSelectedTests(panel.tests_detail || []);
                setSelectedImagingExams(panel.imaging_exam_types_detail || []);
            } else {
                setFormData(EMPTY_FORM);
                setSelectedTests([]);
                setSelectedImagingExams([]);
            }
        }
    }, [open, panel]);

    const fetchTests = async () => {
        setLoadingTests(true);
        try {
            const data = await laboratoryAPI.getTests({ page_size: 500, is_active: true });
            const tests = Array.isArray(data) ? data : data.results || [];
            setAllTests(tests);
        } catch {
            enqueueSnackbar('Erreur chargement examens', { variant: 'error' });
        } finally {
            setLoadingTests(false);
        }
    };

    const fetchImagingExams = async () => {
        setLoadingImagingExams(true);
        try {
            const data = await imagingAPI.getExamTypes({ page_size: 500, is_active: true });
            setAllImagingExams(Array.isArray(data) ? data : data.results || []);
        } catch {
            enqueueSnackbar('Erreur chargement examens d\'imagerie', { variant: 'error' });
        } finally {
            setLoadingImagingExams(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addTest = (test) => {
        if (!test) return;
        if (selectedTests.find(t => t.id === test.id)) return;
        setSelectedTests(prev => [...prev, test]);
    };

    const removeTest = (testId) => {
        setSelectedTests(prev => prev.filter(t => t.id !== testId));
    };

    const addImagingExam = (exam) => {
        if (!exam) return;
        if (selectedImagingExams.find(e => e.id === exam.id)) return;
        setSelectedImagingExams(prev => [...prev, exam]);
    };

    const removeImagingExam = (examId) => {
        setSelectedImagingExams(prev => prev.filter(e => e.id !== examId));
    };

    const individualTotal = selectedTests.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0)
        + selectedImagingExams.reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0);
    const forfaitPrice = parseFloat(formData.price) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const netPrice = forfaitPrice - discount;

    const handleSubmit = async () => {
        if (!formData.code || !formData.name) {
            enqueueSnackbar('Code et Nom sont obligatoires', { variant: 'warning' });
            return;
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            enqueueSnackbar('Le prix forfaitaire doit être supérieur à 0', { variant: 'warning' });
            return;
        }
        if (selectedTests.length === 0 && selectedImagingExams.length === 0) {
            enqueueSnackbar('Ajoutez au moins un examen (labo ou imagerie) au bilan', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                discount: parseFloat(formData.discount) || 0,
                tests: selectedTests.map(t => t.id),
                imaging_exam_types: selectedImagingExams.map(e => e.id),
            };

            if (panel) {
                await laboratoryAPI.updatePanel(panel.id, payload);
                enqueueSnackbar('Bilan modifié', { variant: 'success' });
            } else {
                await laboratoryAPI.createPanel(payload);
                enqueueSnackbar('Bilan créé', { variant: 'success' });
            }
            onSaved?.();
            onClose();
        } catch (error) {
            let msg = 'Erreur lors de l\'enregistrement';
            if (error?.response?.data) {
                const d = error.response.data;
                msg = typeof d === 'object'
                    ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
                    : String(d);
            }
            enqueueSnackbar(msg, { variant: 'error', autoHideDuration: 8000 });
        } finally {
            setLoading(false);
        }
    };

    const filteredTests = allTests.filter(t =>
        !selectedTests.find(s => s.id === t.id) &&
        (testSearch === '' ||
            t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
            t.test_code.toLowerCase().includes(testSearch.toLowerCase()))
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {panel ? 'Modifier le bilan' : 'Nouveau bilan'}
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Box display="flex" flexDirection="column" gap={2}>
                    {/* Basic info */}
                    <Box display="flex" gap={2}>
                        <TextField
                            label="Code *"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            size="small"
                            sx={{ width: 160 }}
                            placeholder="BIL-SANTE"
                        />
                        <TextField
                            label="Nom du bilan *"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            size="small"
                            fullWidth
                        />
                    </Box>

                    <TextField
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        size="small"
                        multiline
                        rows={2}
                        fullWidth
                    />

                    {/* Pricing */}
                    <Box display="flex" gap={2} alignItems="center">
                        <TextField
                            label="Prix forfaitaire *"
                            name="price"
                            type="number"
                            value={formData.price}
                            onChange={handleChange}
                            size="small"
                            sx={{ width: 180 }}
                            InputProps={{ endAdornment: <InputAdornment position="end">XAF</InputAdornment> }}
                        />
                        <TextField
                            label="Réduction"
                            name="discount"
                            type="number"
                            value={formData.discount}
                            onChange={handleChange}
                            size="small"
                            sx={{ width: 160 }}
                            InputProps={{ endAdornment: <InputAdornment position="end">XAF</InputAdornment> }}
                        />
                        <Box>
                            <Typography variant="caption" color="text.secondary">Prix net</Typography>
                            <Typography variant="h6" color="primary">
                                {netPrice.toLocaleString()} XAF
                            </Typography>
                        </Box>
                    </Box>

                    {individualTotal > 0 && (
                        <Alert severity={forfaitPrice < individualTotal ? 'success' : 'info'} sx={{ py: 0.5 }}>
                            Prix individuel total : <strong>{individualTotal.toLocaleString()} XAF</strong>
                            {forfaitPrice < individualTotal && ` — économie de ${(individualTotal - forfaitPrice).toLocaleString()} XAF`}
                        </Alert>
                    )}

                    <Divider />

                    {/* Test selection */}
                    <Typography variant="subtitle2">Examens inclus dans ce bilan ({selectedTests.length})</Typography>

                    <Autocomplete
                        options={filteredTests}
                        getOptionLabel={(t) => `${t.test_code} — ${t.name}`}
                        inputValue={testSearch}
                        onInputChange={(_, v) => setTestSearch(v)}
                        onChange={(_, v) => { addTest(v); setTestSearch(''); }}
                        loading={loadingTests}
                        renderInput={(params) => (
                            <TextField {...params} size="small" placeholder="Rechercher un examen à ajouter..." />
                        )}
                        value={null}
                        blurOnSelect
                        clearOnBlur
                    />

                    {selectedTests.length > 0 ? (
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {selectedTests.map(t => (
                                <Chip
                                    key={t.id}
                                    label={`${t.test_code} — ${t.name} (${parseFloat(t.price || 0).toLocaleString()} XAF)`}
                                    onDelete={() => removeTest(t.id)}
                                    deleteIcon={<DeleteIcon />}
                                    variant="outlined"
                                    size="small"
                                />
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            Aucun examen labo sélectionné
                        </Typography>
                    )}

                    <Divider />

                    {/* Imaging exam selection — bilan mixte labo + imagerie */}
                    <Typography variant="subtitle2">
                        Examens d'imagerie inclus dans ce bilan ({selectedImagingExams.length})
                    </Typography>

                    <Autocomplete
                        options={allImagingExams.filter(e => !selectedImagingExams.find(s => s.id === e.id) &&
                            (imagingExamSearch === '' || e.name.toLowerCase().includes(imagingExamSearch.toLowerCase())))}
                        getOptionLabel={(e) => `${e.exam_code ? e.exam_code + ' — ' : ''}${e.name}`}
                        inputValue={imagingExamSearch}
                        onInputChange={(_, v) => setImagingExamSearch(v)}
                        onChange={(_, v) => { addImagingExam(v); setImagingExamSearch(''); }}
                        loading={loadingImagingExams}
                        renderInput={(params) => (
                            <TextField {...params} size="small" placeholder="Rechercher un examen d'imagerie à ajouter..." />
                        )}
                        value={null}
                        blurOnSelect
                        clearOnBlur
                    />

                    {selectedImagingExams.length > 0 ? (
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {selectedImagingExams.map(e => (
                                <Chip
                                    key={e.id}
                                    label={`${e.name} (${parseFloat(e.price || 0).toLocaleString()} XAF)`}
                                    onDelete={() => removeImagingExam(e.id)}
                                    deleteIcon={<DeleteIcon />}
                                    variant="outlined"
                                    color="secondary"
                                    size="small"
                                />
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            Aucun examen d'imagerie sélectionné
                        </Typography>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Annuler</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                    {panel ? 'Enregistrer' : 'Créer le bilan'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
