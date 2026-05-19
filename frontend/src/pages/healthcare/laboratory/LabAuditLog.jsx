import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Assignment as LogIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';

const ACTION_COLORS = {
    create: 'success',
    update: 'warning',
    delete: 'error',
};

const ACTION_ICONS = {
    create: <AddIcon fontSize="small" />,
    update: <EditIcon fontSize="small" />,
    delete: <DeleteIcon fontSize="small" />,
};

const TARGET_LABELS = {
    lab_test: 'Test',
    subcontractor: 'Sous-traitant',
    subcontractor_price: 'Tarif S/T',
    lab_order: 'Commande',
};

export default function LabAuditLog() {
    const { enqueueSnackbar } = useSnackbar();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        target_type: '',
        date_from: '',
        date_to: '',
    });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.action) params.action = filters.action;
            if (filters.target_type) params.target_type = filters.target_type;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            const data = await laboratoryAPI.getAuditLogs(params);
            setLogs(Array.isArray(data) ? data : data.results || []);
        } catch {
            enqueueSnackbar("Impossible de charger les logs d'audit", { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [filters, enqueueSnackbar]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const formatChanges = (changes) => {
        if (!changes || Object.keys(changes).length === 0) return null;
        return (
            <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem' }}>
                {Object.entries(changes).map(([field, [oldVal, newVal]]) => (
                    <li key={field}>
                        <strong>{field}</strong>:{' '}
                        <span style={{ textDecoration: 'line-through', color: '#999' }}>{oldVal || '—'}</span>
                        {' → '}
                        <span style={{ color: '#1976d2' }}>{newVal || '—'}</span>
                    </li>
                ))}
            </Box>
        );
    };

    return (
        <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LogIcon color="primary" />
                <Typography variant="h5" fontWeight="bold">Journal d'audit — Module Laboratoire</Typography>
                <IconButton onClick={fetchLogs} size="small" sx={{ ml: 'auto' }}>
                    <RefreshIcon />
                </IconButton>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                            <TextField
                                select fullWidth size="small" label="Action"
                                name="action" value={filters.action} onChange={handleFilterChange}
                            >
                                <MenuItem value="">Toutes</MenuItem>
                                <MenuItem value="create">Création</MenuItem>
                                <MenuItem value="update">Modification</MenuItem>
                                <MenuItem value="delete">Suppression</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                select fullWidth size="small" label="Type"
                                name="target_type" value={filters.target_type} onChange={handleFilterChange}
                            >
                                <MenuItem value="">Tous</MenuItem>
                                <MenuItem value="lab_test">Tests</MenuItem>
                                <MenuItem value="subcontractor">Sous-traitants</MenuItem>
                                <MenuItem value="subcontractor_price">Tarifs S/T</MenuItem>
                                <MenuItem value="lab_order">Commandes</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth size="small" label="Du" type="date"
                                name="date_from" value={filters.date_from} onChange={handleFilterChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth size="small" label="Au" type="date"
                                name="date_to" value={filters.date_to} onChange={handleFilterChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Table */}
            {loading ? (
                <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
            ) : (
                <Paper>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><strong>Horodatage</strong></TableCell>
                                    <TableCell><strong>Utilisateur</strong></TableCell>
                                    <TableCell><strong>Action</strong></TableCell>
                                    <TableCell><strong>Type</strong></TableCell>
                                    <TableCell><strong>Élément</strong></TableCell>
                                    <TableCell><strong>Modifications</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                            Aucun log trouvé
                                        </TableCell>
                                    </TableRow>
                                ) : logs.map(log => (
                                    <TableRow key={log.id} hover>
                                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.85rem' }}>{log.user_name}</TableCell>
                                        <TableCell>
                                            <Tooltip title={log.action_label}>
                                                <Chip
                                                    icon={ACTION_ICONS[log.action]}
                                                    label={log.action_label}
                                                    color={ACTION_COLORS[log.action] || 'default'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={TARGET_LABELS[log.target_type] || log.target_type}
                                                size="small"
                                                variant="outlined"
                                                color="info"
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.85rem', maxWidth: 200 }}>
                                            <Tooltip title={log.target_id}>
                                                <span>{log.target_name}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            {formatChanges(log.changes)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
}
