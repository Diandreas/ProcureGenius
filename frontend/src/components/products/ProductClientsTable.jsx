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
                    <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
                ))}
            </Box>
        );
    }

    if (!clients || clients.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Box textAlign="center" py={4}>
                        <Person sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            Aucun client n'a encore acheté ce produit
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    const getClientName = (client) => {
        if (client.invoice__client__first_name || client.invoice__client__last_name) {
            return `${client.invoice__client__first_name || ''} ${client.invoice__client__last_name || ''}`.trim();
        }
        return client.invoice__client__username || 'Client inconnu';
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
                                mb: 1.5,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 3,
                                },
                            }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box display="flex" alignItems="center" mb={1.5}>
                                    <Avatar
                                        sx={{
                                            bgcolor: 'primary.main',
                                            width: 40,
                                            height: 40,
                                            mr: 2,
                                        }}
                                    >
                                        {getInitials(clientName)}
                                    </Avatar>
                                    <Box flexGrow={1}>
                                        <Typography variant="body2" fontWeight="bold">
                                            {clientName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {client.purchase_count} achat{client.purchase_count > 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Chip
                                        icon={<ShoppingCart />}
                                        label={`${client.total_quantity} unités`}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Typography variant="body2" fontWeight="bold" color="success.main">
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
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Nombre d'achats</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Quantité totale</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Total dépensé</TableCell>
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
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                    },
                                }}
                            >
                                <TableCell>
                                    <Box display="flex" alignItems="center">
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
                                        <Typography variant="body2" fontWeight="medium">
                                            {clientName}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Chip
                                        label={client.purchase_count}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2">
                                        {client.total_quantity} unités
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight="bold" color="success.main">
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

