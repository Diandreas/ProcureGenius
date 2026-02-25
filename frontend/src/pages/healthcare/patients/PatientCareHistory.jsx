import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import patientAPI from '../../../services/patientAPI';
import AdministerCareModal from './components/AdministerCareModal';
import { formatDate } from '../../../utils/formatters';

// Retourne true si created_at est dans les 30 dernières minutes
const canEditOrDelete = (createdAt) => {
    if (!createdAt) return false;
    return (Date.now() - new Date(createdAt).getTime()) < 30 * 60 * 1000;
};

const PatientCareHistory = ({ patientId }) => {
    const [careHistory, setCareHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCare, setEditingCare] = useState(null);

    const fetchCareHistory = async () => {
        try {
            setLoading(true);
            const data = await patientAPI.getPatientCareHistory(patientId);
            if (data && Array.isArray(data.results)) {
                setCareHistory(data.results);
            } else if (Array.isArray(data)) {
                setCareHistory(data);
            } else {
                setCareHistory([]);
            }
        } catch (err) {
            console.error('Error fetching care history:', err);
            setError("Erreur lors du chargement de l'historique des soins");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patientId) fetchCareHistory();
    }, [patientId]);

    const handleEdit = (care) => {
        setEditingCare(care);
        setEditModalOpen(true);
    };

    const handleDelete = async (care) => {
        if (!window.confirm(`Supprimer le soin "${care.service_name}" ?`)) return;
        try {
            await patientAPI.deleteCareService(care.id);
            setCareHistory(prev => prev.filter(c => c.id !== care.id));
        } catch (err) {
            const msg = err.response?.data?.detail || 'Erreur lors de la suppression';
            alert(msg);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

    return (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                Historique des Soins (Consultations, Nursing, Labo, Pharmacie)
            </Typography>
            {careHistory.length === 0 ? (
                <Typography color="text.secondary">Aucun soin enregistré pour ce patient.</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Service</strong></TableCell>
                                <TableCell><strong>Catégorie</strong></TableCell>
                                <TableCell><strong>Fourni par</strong></TableCell>
                                <TableCell><strong>Qté</strong></TableCell>
                                <TableCell><strong>Statut</strong></TableCell>
                                <TableCell><strong>Notes</strong></TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {careHistory.map((care) => {
                                const editable = canEditOrDelete(care.created_at);
                                return (
                                    <TableRow key={care.id} hover>
                                        <TableCell>{formatDate(care.provided_at)}</TableCell>
                                        <TableCell>{care.service_name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    care.service_type === 'consultation' ? 'Consultation' :
                                                    care.service_type === 'laboratory' ? 'Laboratoire' :
                                                    care.service_type === 'pharmacy' ? 'Pharmacie' :
                                                    care.service_type === 'nursing_care' ? 'Soin' :
                                                    care.service_type === 'imaging' ? 'Imagerie' :
                                                    care.service_type === 'procedure' ? 'Procédure' : 'Autre'
                                                }
                                                size="small"
                                                color={
                                                    care.service_type === 'consultation' ? 'primary' :
                                                    care.service_type === 'laboratory' ? 'secondary' :
                                                    care.service_type === 'pharmacy' ? 'success' : 'info'
                                                }
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{care.provided_by_name || 'N/A'}</TableCell>
                                        <TableCell>{care.quantity}</TableCell>
                                        <TableCell>
                                            {care.is_billed ? (
                                                <Chip label="Facturé" size="small" color="success" />
                                            ) : (
                                                <Chip label="En attente" size="small" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {care.notes || '-'}
                                        </TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {editable && (
                                                <>
                                                    <Tooltip title="Modifier (dans les 30 min)">
                                                        <IconButton size="small" color="primary" onClick={() => handleEdit(care)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Supprimer (dans les 30 min)">
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(care)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <AdministerCareModal
                open={editModalOpen}
                onClose={() => { setEditModalOpen(false); setEditingCare(null); }}
                patientId={patientId}
                careId={editingCare?.id}
                initialData={editingCare}
                onSaved={fetchCareHistory}
            />
        </Box>
    );
};

export default PatientCareHistory;
