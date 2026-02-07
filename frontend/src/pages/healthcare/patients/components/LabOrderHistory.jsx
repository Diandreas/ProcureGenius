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
    Alert
} from '@mui/material';
import { Science as LabIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { formatDate } from '../../../../utils/formatters';

const LabOrderHistory = ({ labOrders }) => {
    if (!labOrders || labOrders.length === 0) {
        return (
            <Alert severity="info">
                Aucun examen de laboratoire pour ce patient
            </Alert>
        );
    }

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'warning',
            'sample_collected': 'info',
            'in_progress': 'info',
            'completed': 'success',
            'results_ready': 'success',
            'results_delivered': 'default',
            'cancelled': 'error'
        };
        return colors[status] || 'default';
    };

    return (
        <List>
            {labOrders.map(order => (
                <Card key={order.id} sx={{ mb: 2 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LabIcon color="primary" />
                                <Typography variant="h6">{order.order_number}</Typography>
                            </Box>
                            <Chip
                                label={order.status_display || order.status}
                                color={getStatusColor(order.status)}
                                size="small"
                            />
                        </Box>

                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {formatDate(order.order_date)}
                        </Typography>

                        {order.priority && order.priority !== 'routine' && (
                            <Chip
                                label={order.priority.toUpperCase()}
                                color="error"
                                size="small"
                                sx={{ mb: 1 }}
                            />
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                            Tests effectués ({order.tests_count}):
                        </Typography>
                        <List dense>
                            {order.items && order.items.map(item => (
                                <ListItem key={item.id}>
                                    <ListItemText
                                        primary={item.test_name}
                                        secondary={
                                            <Box component="span">
                                                {item.result_value ? (
                                                    <>
                                                        <strong>Résultat:</strong> {item.result_value}
                                                        {item.is_abnormal && (
                                                            <Chip
                                                                label="Anormal"
                                                                color="warning"
                                                                size="small"
                                                                sx={{ ml: 1 }}
                                                            />
                                                        )}
                                                    </>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">
                                                        En attente de résultats
                                                    </Typography>
                                                )}
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>

                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={() => window.open(`/healthcare/laboratory/orders/${order.id}`, '_blank')}
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

export default LabOrderHistory;
