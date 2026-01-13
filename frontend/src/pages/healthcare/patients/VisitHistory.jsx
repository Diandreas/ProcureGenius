import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress
} from '@mui/material';
import patientAPI from '../../../services/patientAPI';

const VisitHistory = ({ patientId }) => {
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (patientId) {
            fetchHistory();
        }
    }, [patientId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const data = await patientAPI.getPatientHistory(patientId);
            setHistory(data);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            completed: 'success',
            cancelled: 'error',
            in_consultation: 'info',
            registered: 'default'
        };
        return colors[status] || 'default';
    };

    if (loading) return <CircularProgress />;
    if (!history) return <Typography>Aucun historique disponible</Typography>;

    return (
        <Box>
            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Card sx={{ flex: 1, bgcolor: 'primary.50' }}>
                    <CardContent>
                        <Typography color="text.secondary" variant="caption">Total Visites</Typography>
                        <Typography variant="h4">{history.statistics.total_visits}</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1, bgcolor: 'success.50' }}>
                    <CardContent>
                        <Typography color="text.secondary" variant="caption">Terminées</Typography>
                        <Typography variant="h4">{history.statistics.completed_visits}</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1, bgcolor: 'error.50' }}>
                    <CardContent>
                        <Typography color="text.secondary" variant="caption">Annulées</Typography>
                        <Typography variant="h4">{history.statistics.cancelled_visits}</Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Visits Table */}
            <TableContainer component={Paper} variant="outlined">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Médecin</TableCell>
                            <TableCell>Motif</TableCell>
                            <TableCell>Statut</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {history.visits.map((visit) => (
                            <TableRow key={visit.id} hover>
                                <TableCell>
                                    {new Date(visit.arrived_at).toLocaleDateString()}
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        {new Date(visit.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                </TableCell>
                                <TableCell>{visit.visit_type_display}</TableCell>
                                <TableCell>{visit.doctor_name || '-'}</TableCell>
                                <TableCell>{visit.chief_complaint || '-'}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={visit.status_display}
                                        color={getStatusColor(visit.status)}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {history.visits.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography color="text.secondary">Aucune visite enregistrée</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default VisitHistory;
