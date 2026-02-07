import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    List,
    ListItem,
    ListItemText,
    Divider,
    Button,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { LocalPharmacy as PharmacyIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { formatDate } from '../../../../utils/formatters';

const PharmacyHistory = ({ dispensings }) => {
    if (!dispensings || dispensings.length === 0) {
        return (
            <Alert severity="info">
                Aucune dispensation de pharmacie pour ce patient
            </Alert>
        );
    }

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'warning',
            'dispensed': 'success',
            'partial': 'info',
            'cancelled': 'error'
        };
        return colors[status] || 'default';
    };

    return (
        <List>
            {dispensings.map(dispensing => (
                <Card key={dispensing.id} sx={{ mb: 2 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PharmacyIcon color="primary" />
                                <Typography variant="h6">{dispensing.dispensing_number}</Typography>
                            </Box>
                            <Chip
                                label={dispensing.status_display || dispensing.status}
                                color={getStatusColor(dispensing.status)}
                                size="small"
                            />
                        </Box>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {formatDate(dispensing.dispensed_at)}
                        </Typography>

                        {dispensing.dispensed_by_name && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Dispensé par: <strong>{dispensing.dispensed_by_name}</strong>
                            </Typography>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                            Médicaments dispensés ({dispensing.medications_count}):
                        </Typography>

                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Médicament</TableCell>
                                        <TableCell align="center">Quantité</TableCell>
                                        <TableCell>Posologie</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {dispensing.items && dispensing.items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Typography variant="body2">{item.medication_name}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={item.quantity_dispensed} size="small" color="primary" />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.dosage_instructions || 'Non spécifié'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={() => window.open(`/healthcare/pharmacy/dispensings/${dispensing.id}`, '_blank')}
                            >
                                Voir Détails Complets
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </List>
    );
};

export default PharmacyHistory;
