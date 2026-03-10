import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, IconButton, TextField,
    InputAdornment, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
    Delete as DeleteIcon, CheckCircle as ActiveIcon, Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import LabPanelFormModal from './LabPanelFormModal';
import useCurrentUser from '../../../hooks/useCurrentUser';

export default function LabPanelCatalog() {
    const { enqueueSnackbar } = useSnackbar();
    const { isAdmin } = useCurrentUser();
    const [panels, setPanels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPanel, setEditingPanel] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchPanels();
    }, []);

    const fetchPanels = async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getPanels();
            setPanels(Array.isArray(data) ? data : data.results || []);
        } catch {
            enqueueSnackbar('Erreur chargement bilans', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (panel) => {
        setEditingPanel(panel);
        setModalOpen(true);
    };

    const handleNew = () => {
        setEditingPanel(null);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await laboratoryAPI.deletePanel(deleteConfirm.id);
            enqueueSnackbar('Bilan supprimé', { variant: 'success' });
            setDeleteConfirm(null);
            fetchPanels();
        } catch {
            enqueueSnackbar('Erreur suppression', { variant: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const filtered = panels.filter(p =>
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">Catalogue des Bilans</Typography>
                {isAdmin && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>
                        Nouveau bilan
                    </Button>
                )}
            </Box>

            <Card>
                <CardContent>
                    <TextField
                        size="small"
                        placeholder="Rechercher un bilan..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                        sx={{ mb: 2, width: 320 }}
                    />

                    {loading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Code</TableCell>
                                        <TableCell>Nom</TableCell>
                                        <TableCell>Examens inclus</TableCell>
                                        <TableCell align="right">Prix forfaitaire</TableCell>
                                        <TableCell align="right">Réduction</TableCell>
                                        <TableCell align="right">Prix net</TableCell>
                                        <TableCell>Statut</TableCell>
                                        {isAdmin && <TableCell align="center">Actions</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                Aucun bilan configuré
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.map(panel => {
                                        const netPrice = parseFloat(panel.price) - parseFloat(panel.discount || 0);
                                        return (
                                            <TableRow key={panel.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                                                        {panel.code}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={500}>{panel.name}</Typography>
                                                    {panel.description && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {panel.description}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                        {(panel.tests_detail || []).slice(0, 4).map(t => (
                                                            <Chip key={t.id} label={t.test_code} size="small" variant="outlined" />
                                                        ))}
                                                        {(panel.tests_detail || []).length > 4 && (
                                                            <Chip label={`+${panel.tests_detail.length - 4}`} size="small" />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {parseFloat(panel.price).toLocaleString()} XAF
                                                </TableCell>
                                                <TableCell align="right">
                                                    {parseFloat(panel.discount || 0) > 0
                                                        ? `${parseFloat(panel.discount).toLocaleString()} XAF`
                                                        : '—'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography fontWeight={600} color="primary">
                                                        {netPrice.toLocaleString()} XAF
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {panel.is_active
                                                        ? <Chip icon={<ActiveIcon />} label="Actif" size="small" color="success" />
                                                        : <Chip icon={<InactiveIcon />} label="Inactif" size="small" />}
                                                </TableCell>
                                                {isAdmin && (
                                                    <TableCell align="center">
                                                        <IconButton size="small" onClick={() => handleEdit(panel)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(panel)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            <LabPanelFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                panel={editingPanel}
                onSaved={() => { setModalOpen(false); fetchPanels(); }}
            />

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogContent>
                    <Typography>
                        Supprimer le bilan <strong>{deleteConfirm?.name}</strong> ? Cette action est irréversible.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirm(null)} disabled={deleting}>Annuler</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        disabled={deleting}
                        startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        Supprimer
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
