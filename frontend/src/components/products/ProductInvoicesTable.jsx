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
import { Receipt, Person } from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/formatters';

function ProductInvoicesTable({ invoices, loading }) {
    const navigate = useNavigate();
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

    if (!invoices || invoices.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Box textAlign="center" py={4}>
                        <Receipt sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            Aucune facture pour ce produit
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
                        key={invoice.invoice_id}
                        sx={{
                            mb: 1.5,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: 3,
                            },
                        }}
                        onClick={() => navigate(`/invoices/${invoice.invoice_id}`)}
                    >
                        <CardContent sx={{ p: 2 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Box>
                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                        {invoice.invoice_number}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        <Person sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                        {invoice.client_name}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatCurrency(invoice.total_price)}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Chip
                                    label={`Qté: ${invoice.quantity}`}
                                    size="small"
                                    variant="outlined"
                                />
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
                        <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Quantité</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Montant</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {invoices.map((invoice) => (
                        <TableRow
                            key={invoice.invoice_id}
                            hover
                            sx={{
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                },
                            }}
                            onClick={() => navigate(`/invoices/${invoice.invoice_id}`)}
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
                                <Box display="flex" alignItems="center">
                                    <Person sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                                    <Typography variant="body2">
                                        {invoice.client_name}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="right">
                                <Chip
                                    label={invoice.quantity}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            </TableCell>
                            <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(invoice.total_price)}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                    {formatDate(invoice.created_at)}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export default ProductInvoicesTable;

