import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, IconButton, TextField,
    InputAdornment, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import PrescriberForm from './PrescriberForm';
import useCurrentUser from '../../../hooks/useCurrentUser';

export default function PrescriberList() {
    const { enqueueSnackbar } = useSnackbar();
    const { isAdmin } = useCurrentUser();
    const [prescribers, setPrescribers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPrescriber, setEditingPrescriber] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchPrescribers();
    }, []);

    const fetchPrescribers = async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getPrescribers();
            setPrescribers(Array.isArray(data) ? data : data.results || []);
        } catch {
            enqueueSnackbar('Erreur chargement prescripteurs', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (prescriber) => {
        setEditingPrescriber(prescriber);
        setModalOpen(true);
    };

    const handleNew = () => {
        setEditingPrescriber(null);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await laboratoryAPI.deletePrescriber(deleteConfirm.id);
            enqueueSnackbar('Prescripteur supprimé', { variant: 'success' });
            setDeleteConfirm(null);
            fetchPrescribers();
        } catch {
            enqueueSnackbar('Erreur suppression', { variant: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const handleSaved = () => {
        fetchPrescribers();
    };

    const filtered = prescribers.filter(p => {
        const q = search.toLowerCase();
        return (
            p.full_name?.toLowerCase().includes(q) ||
            p.clinic_name?.toLowerCase().includes(q) ||
            p.specialty?.toLowerCase().includes(q)
        );
    });

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Prescripteurs</Typography>
                {isAdmin && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>
                        Nouveau prescripteur
                    </Button>
                )}
            </Box>

            <Card>
                <CardContent>
                    <TextField
                        placeholder="Rechercher (nom, cabinet, spécialité)…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        size="small"
                        sx={{ mb: 2, width: 360 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                                        <TableCell><strong>Nom</strong></TableCell>
                                        <TableCell><strong>Spécialité</strong></TableCell>
                                        <TableCell><strong>Cabinet</strong></TableCell>
                                        <TableCell><strong>Taux (%)</strong></TableCell>
                                        <TableCell><strong>Téléphone</strong></TableCell>
                                        <TableCell><strong>Statut</strong></TableCell>
                                        {isAdmin && <TableCell align="right"><strong>Actions</strong></TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={isAdmin ? 7 : 6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                Aucun prescripteur trouvé
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map(p => (
                                            <TableRow key={p.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>{p.full_name}</Typography>
                                                </TableCell>
                                                <TableCell>{p.specialty || '—'}</TableCell>
                                                <TableCell>{p.clinic_name || '—'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${p.commission_rate} %`}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>{p.phone || '—'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={p.is_active ? 'Actif' : 'Inactif'}
                                                        size="small"
                                                        color={p.is_active ? 'success' : 'default'}
                                                    />
                                                </TableCell>
                                                {isAdmin && (
                                                    <TableCell align="right">
                                                        <IconButton size="small" onClick={() => handleEdit(p)} title="Modifier">
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(p)} title="Supprimer">
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit modal */}
            <PrescriberForm
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={handleSaved}
                prescriber={editingPrescriber}
            />

            {/* Delete confirmation */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
                <DialogTitle>Supprimer le prescripteur</DialogTitle>
                <DialogContent>
                    <Typography>
                        Supprimer <strong>{deleteConfirm?.full_name}</strong> ? Cette action est irréversible.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirm(null)} disabled={deleting}>Annuler</Button>
                    <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <CircularProgress size={18} /> : 'Supprimer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
