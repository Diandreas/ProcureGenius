import React from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Avatar,
    Chip,
    Card,
    CardContent,
    Skeleton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Person, ShoppingCart } from '@mui/icons-material';
import { formatCurrency } from '../../utils/formatters';

function ProductClientsTable({ clients, loading }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    if (loading) {
        return (
            <Box>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={isMobile ? 80 : 60} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
            </Box>
        );
    }

    if (!clients || clients.length === 0) {
        return (
            <Card sx={{ borderRadius: 1 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Box textAlign="center" py={isMobile ? 2 : 4}>
                        <Person sx={{ fontSize: isMobile ? 48 : 60, color: 'text.secondary', mb: isMobile ? 1 : 2 }} />
                        <Typography variant={isMobile ? 'subtitle1' : 'h6'} color="text.secondary">
                            Aucun client n'a encore acheté ce produit
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    const getClientName = (client) => {
        // Le backend renvoie invoice__client__name depuis le modèle Client
        return client.invoice__client__name || 'Client inconnu';
    };

    const getInitials = (name) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return parts[0][0] + parts[1][0];
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Mode Mobile - Cards
    if (isMobile) {
        return (
            <Box>
                {clients.map((client, index) => {
                    const clientName = getClientName(client);
                    return (
                        <Card
                            key={client.invoice__client__id || index}
                            sx={{
                                mb: 1,
                                borderRadius: 1,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                },
                            }}
                        >
                            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <Avatar
                                        sx={{
                                            bgcolor: 'primary.main',
                                            width: 36,
                                            height: 36,
                                            mr: 1.5,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {getInitials(clientName)}
                                    </Avatar>
                                    <Box flexGrow={1} minWidth={0}>
                                        <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.875rem', lineHeight: 1.3 }}>
                                            {clientName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            {client.purchase_count} achat{client.purchase_count > 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Chip
                                        icon={<ShoppingCart sx={{ fontSize: 14 }} />}
                                        label={`${client.total_quantity} unités`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem', height: 22, borderRadius: 0.5 }}
                                    />
                                    <Typography variant="body2" fontWeight="600" color="success.main" sx={{ fontSize: '0.875rem' }}>
                                        {formatCurrency(client.total_purchases)}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>
        );
    }

    // Mode Desktop - Table
    return (
        <TableContainer component={Paper} sx={{ borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <Table>
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }} align="right">Nombre d'achats</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }} align="right">Quantité totale</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }} align="right">Total dépensé</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {clients.map((client, index) => {
                        const clientName = getClientName(client);
                        return (
                            <TableRow
                                key={client.invoice__client__id || index}
                                hover
                                sx={{
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                    },
                                }}
                            >
                                <TableCell sx={{ py: 1.25 }}>
                                    <Box display="flex" alignItems="center">
                                        <Avatar
                                            sx={{
                                                bgcolor: 'primary.main',
                                                width: 32,
                                                height: 32,
                                                mr: 1.25,
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            {getInitials(clientName)}
                                        </Avatar>
                                        <Typography variant="body2" fontWeight="500" sx={{ fontSize: '0.875rem' }}>
                                            {clientName}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.25 }}>
                                    <Chip
                                        label={client.purchase_count}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ fontSize: '0.75rem', height: 24, borderRadius: 0.5 }}
                                    />
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.25 }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                        {client.total_quantity} unités
                                    </Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1.25 }}>
                                    <Typography variant="body2" fontWeight="600" color="success.main" sx={{ fontSize: '0.875rem' }}>
                                        {formatCurrency(client.total_purchases)}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export default ProductClientsTable;

