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
    Avatar,
} from '@mui/material';
import { Inventory, ShoppingCart } from '@mui/icons-material';
import useCurrency from '../../hooks/useCurrency';
import { useTranslation } from 'react-i18next';

function ClientProductsTable({ products, loading }) {
    const { t } = useTranslation(['clients', 'products', 'common']);
    const { format: formatCurrency } = useCurrency();
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

    if (!products || products.length === 0) {
        return (
            <Card>
                <CardContent>
                    <Box textAlign="center" py={4}>
                        <Inventory sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            {t('clients:messages.noProductsPurchased')}
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
                {products.map((product, index) => {
                    const hasProductId = product.product__id && product.product__id !== 'None';

                    return (
                        <Card
                            key={product.product__id || index}
                            sx={{
                                mb: 1.5,
                                cursor: hasProductId ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                '&:hover': hasProductId ? {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 3,
                                } : {},
                                opacity: hasProductId ? 1 : 0.6,
                            }}
                            onClick={() => {
                                if (hasProductId) {
                                    navigate(`/products/${product.product__id}`);
                                }
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
                                        <Inventory />
                                    </Avatar>
                                    <Box flexGrow={1}>
                                        <Typography variant="body2" fontWeight="bold">
                                            {product.product__name || t('clients:labels.productUnavailable')}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {t('clients:labels.ref')}: {product.product__reference || 'N/A'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Chip
                                        icon={<ShoppingCart />}
                                        label={t('products:labels.unitsCount', { count: product.total_quantity })}
                                        size="small"
                                        variant="outlined"
                                    />
                                    <Typography variant="body2" fontWeight="bold" color="success.main">
                                        {formatCurrency(product.total_amount)}
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
                        <TableCell sx={{ fontWeight: 600 }}>{t('clients:table.product')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('clients:table.reference')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">{t('clients:table.totalQuantity')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">{t('clients:table.purchaseCount')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">{t('clients:table.totalSpent')}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {products.map((product, index) => {
                        const hasProductId = product.product__id && product.product__id !== 'None';

                        return (
                            <TableRow
                                key={product.product__id || index}
                                hover={hasProductId}
                                sx={{
                                    cursor: hasProductId ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    '&:hover': hasProductId ? {
                                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                    } : {},
                                    opacity: hasProductId ? 1 : 0.6,
                                }}
                                onClick={() => {
                                    if (hasProductId) {
                                        navigate(`/products/${product.product__id}`);
                                    }
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
                                            }}
                                        >
                                            <Inventory />
                                        </Avatar>
                                        <Typography variant="body2" fontWeight="medium">
                                            {product.product__name || t('clients:labels.productUnavailable')}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {product.product__reference || 'N/A'}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Chip
                                        label={product.total_quantity}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2">
                                        {product.purchase_count}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight="bold" color="success.main">
                                        {formatCurrency(product.total_amount)}
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

export default ClientProductsTable;

