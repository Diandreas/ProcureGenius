import React from 'react';
import { useNavigate } from 'react-router-dom';
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
    Chip,
    Card,
    CardContent,
    Skeleton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Receipt } from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/formatters';

function ClientInvoicesTable({ invoices, loading }) {
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const getStatusColor = (status) => {
        const colors = {
            draft: 'default',
            sent: 'info',
            paid: 'success',
            overdue: 'error',
            cancelled: 'default',
        };
        return colors[status] || 'default';
    };

    const getStatusLabel = (status) => {
        const labels = {
            draft: 'Brouillon',
            sent: 'Envoyée',
            paid: 'Payée',
            overdue: 'En retard',
            cancelled: 'Annulée',
        };
        return labels[status] || status;
    };

    if (loading) {
        return (
            <Box>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
                ))}
            </Box>
        );
    }

    if (!invoices || invoices.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Box textAlign="center" py={4}>
                        <Receipt sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            Aucune facture pour ce client
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    // Mode Mobile - Cards
    if (isMobile) {
        return (
            <Box>
                {invoices.map((invoice) => (
                    <Card
                        key={invoice.id}
                        sx={{
                            mb: 1.5,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 3,
                            },
                        }}
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                        <CardContent sx={{ p: 2 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Box>
                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                        {invoice.invoice_number}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {invoice.title}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={getStatusLabel(invoice.status)}
                                    color={getStatusColor(invoice.status)}
                                    size="small"
                                />
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" fontWeight="bold">
                                    {formatCurrency(invoice.total_amount)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatDate(invoice.created_at)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                ))}
            </Box>
        );
    }

    // Mode Desktop - Table
    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <TableCell sx={{ fontWeight: 600 }}>N° Facture</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Titre</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Montant</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date création</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date échéance</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {invoices.map((invoice) => (
                        <TableRow
                            key={invoice.id}
                            hover
                            sx={{
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                },
                            }}
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                        >
                            <TableCell>
                                <Typography
                                    variant="body2"
                                    color="primary"
                                    fontWeight="medium"
                                >
                                    {invoice.invoice_number}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {invoice.title}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={getStatusLabel(invoice.status)}
                                    color={getStatusColor(invoice.status)}
                                    size="small"
                                />
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(invoice.total_amount)}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                    {formatDate(invoice.created_at)}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                    {formatDate(invoice.due_date)}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export default ClientInvoicesTable;

