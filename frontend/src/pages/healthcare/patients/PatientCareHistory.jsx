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
    Alert
} from '@mui/material';
import patientAPI from '../../../services/patientAPI';
import { formatDate } from '../../../utils/formatters';

const PatientCareHistory = ({ patientId }) => {
    const [careHistory, setCareHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
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
                setError('Erreur lors du chargement de l\'historique des soins');
            } finally {
                setLoading(false);
            }
        };

        if (patientId) {
            fetchCareHistory();
        }
    }, [patientId]);

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
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {careHistory.map((care) => (
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
                                                                    care.service_type === 'procedure' ? 'Procédure' :
                                                                        'Autre'
                                            }
                                            size="small"
                                            color={
                                                care.service_type === 'consultation' ? 'primary' :
                                                    care.service_type === 'laboratory' ? 'secondary' :
                                                        care.service_type === 'pharmacy' ? 'success' :
                                                            'info'
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
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default PatientCareHistory;
