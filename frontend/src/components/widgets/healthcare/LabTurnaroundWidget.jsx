import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper, Typography, Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, Chip, CircularProgress, Stack, Alert
} from '@mui/material';
import {
  AccessTime as ClockIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Science as LabIcon
} from '@mui/icons-material';
import * as widgetsAPI from '../../../services/widgetsAPI';

const LabTurnaroundWidget = ({ period = 'last_30_days', dateRange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderBy, setOrderBy] = useState('count');
  const [order, setOrder] = useState('desc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = { period };
        if (dateRange?.start_date) params.start_date = dateRange.start_date;
        if (dateRange?.end_date) params.end_date = dateRange.end_date;
        const response = await widgetsAPI.getWidgetData('lab_orders_status', params);
        if (response.success) {
          setData(response.data?.laboratory?.by_test_type || []);
        }
      } catch (error) {
        console.error('Error fetching turnaround data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period, dateRange]);

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let va = a[orderBy], vb = b[orderBy];
      if (va == null) va = order === 'asc' ? Infinity : -Infinity;
      if (vb == null) vb = order === 'asc' ? Infinity : -Infinity;
      if (typeof va === 'string') return order === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return order === 'asc' ? va - vb : vb - va;
    });
  }, [data, orderBy, order]);

  if (loading) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Chargement...</Typography>
      </Paper>
    );
  }

  const totalOverdue = data.reduce((s, t) => s + (t.overdue_count || 0), 0);

  const fmtHours = (h) => {
    if (h == null) return '—';
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 24) return `${h.toFixed(1)} h`;
    return `${(h / 24).toFixed(1)} j`;
  };

  return (
    <Paper elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ClockIcon sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="700">Délais par Examen</Typography>
        </Stack>
        {totalOverdue > 0 && (
          <Chip
            icon={<WarningIcon sx={{ fontSize: 16 }} />}
            label={`${totalOverdue} en retard`}
            size="small"
            color="error"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {!data.length ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <LabIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">Aucune donnee de delai disponible</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>
                  <TableSortLabel active={orderBy === 'test_name'} direction={orderBy === 'test_name' ? order : 'asc'} onClick={() => handleSort('test_name')}>
                    Test
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>
                  <TableSortLabel active={orderBy === 'count'} direction={orderBy === 'count' ? order : 'desc'} onClick={() => handleSort('count')}>
                    Nb
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>
                  <TableSortLabel active={orderBy === 'avg_turnaround_hours'} direction={orderBy === 'avg_turnaround_hours' ? order : 'desc'} onClick={() => handleSort('avg_turnaround_hours')}>
                    Moy (h)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>
                  <TableSortLabel active={orderBy === 'estimated_turnaround_hours'} direction={orderBy === 'estimated_turnaround_hours' ? order : 'desc'} onClick={() => handleSort('estimated_turnaround_hours')}>
                    Est. (h)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Ecart</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>
                  <TableSortLabel active={orderBy === 'overdue_count'} direction={orderBy === 'overdue_count' ? order : 'desc'} onClick={() => handleSort('overdue_count')}>
                    Retard
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((t, i) => {
                const variance = t.variance_hours;
                const isLate = variance != null && variance > 0;
                return (
                  <TableRow
                    key={i}
                    hover
                    sx={t.overdue_count > 0 ? { bgcolor: 'error.50' } : {}}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{t.test_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.category}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>{t.count}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={700}>
                        {fmtHours(t.avg_turnaround_hours)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">{fmtHours(t.estimated_turnaround_hours)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {variance != null ? (
                        <Chip
                          label={`${variance > 0 ? '+' : ''}${variance}h`}
                          size="small"
                          color={isLate ? 'error' : 'success'}
                          sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24 }}
                        />
                      ) : '\u2014'}
                    </TableCell>
                    <TableCell align="center">
                      {t.overdue_count > 0 ? (
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} />
                          <Typography variant="body2" fontWeight={700} color="error.main">{t.overdue_count}</Typography>
                        </Stack>
                      ) : (
                        <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default LabTurnaroundWidget;
