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
import { useTranslation } from 'react-i18next';

function ProductInvoicesTable({ invoices, loading }) {
    const { t } = useTranslation(['products', 'common']);
    const navigate = useNavigate();
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

    if (!invoices || invoices.length === 0) {
        return (
            <Card sx={{ borderRadius: 1 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Box textAlign="center" py={isMobile ? 2 : 4}>
                        <Receipt sx={{ fontSize: isMobile ? 48 : 60, color: 'text.secondary', mb: isMobile ? 1 : 2 }} />
                        <Typography variant={isMobile ? 'subtitle1' : 'h6'} color="text.secondary">
                            {t('products:messages.noInvoicesForProduct')}
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
                            mb: 1,
                            borderRadius: 1,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            },
                        }}
                        onClick={() => navigate(`/invoices/${invoice.invoice_id}`)}
                    >
                        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" fontWeight="600" color="primary" sx={{ fontSize: '0.875rem', lineHeight: 1.3 }}>
                                        {invoice.invoice_number}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.25 }}>
                                        <Person sx={{ fontSize: 12 }} />
                                        {invoice.client_name || t('products:labels.noClient')}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" fontWeight="600" sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap', ml: 1 }}>
                                    {formatCurrency(invoice.total_price)}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Chip
                                    label={t('products:labels.qtyShort', { qty: invoice.quantity })}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem', height: 20, borderRadius: 0.5 }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
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
        <TableContainer component={Paper} sx={{ borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <Table>
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }}>{t('products:table.invoiceNumber')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }}>{t('products:table.client')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }} align="right">{t('products:table.quantity')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }} align="right">{t('products:table.amount')}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 1.25 }}>{t('products:table.date')}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {invoices.map((invoice) => (
                        <TableRow
                            key={invoice.invoice_id}
                            hover
                            sx={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                },
                            }}
                            onClick={() => navigate(`/invoices/${invoice.invoice_id}`)}
                        >
                            <TableCell sx={{ py: 1.25 }}>
                                <Typography
                                    variant="body2"
                                    color="primary"
                                    fontWeight="500"
                                    sx={{ fontSize: '0.875rem' }}
                                >
                                    {invoice.invoice_number}
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.25 }}>
                                <Box display="flex" alignItems="center">
                                    <Person sx={{ fontSize: 16, mr: 0.75, color: 'text.secondary' }} />
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                        {invoice.client_name || t('products:labels.noClient')}
                                    </Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.25 }}>
                                <Chip
                                    label={invoice.quantity}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem', height: 24, borderRadius: 0.5 }}
                                />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.25 }}>
                                <Typography variant="body2" fontWeight="500" sx={{ fontSize: '0.875rem' }}>
                                    {formatCurrency(invoice.total_price)}
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.25 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
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

