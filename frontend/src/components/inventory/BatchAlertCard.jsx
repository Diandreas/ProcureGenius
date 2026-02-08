import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Chip, Stack, Skeleton, alpha } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import batchAPI from '../../services/batchAPI';

const BatchAlertCard = ({ days = 30 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await batchAPI.getExpiringBatches(days);
        setData(result);
      } catch (error) {
        console.error('Error fetching expiring batches:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [days]);

  if (loading) {
    return <Skeleton variant="rounded" height={120} />;
  }

  if (!data || data.total === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: '1px solid',
        borderColor: data.expired_count > 0 ? 'error.main' : 'warning.main',
        borderRadius: 2,
        background: theme => data.expired_count > 0
          ? alpha(theme.palette.error.main, 0.05)
          : alpha(theme.palette.warning.main, 0.05)
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <WarningIcon color={data.expired_count > 0 ? 'error' : 'warning'} />
        <Typography variant="subtitle1" fontWeight="700">
          Alertes Lots
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} mb={1.5}>
        {data.expired_count > 0 && (
          <Chip label={`${data.expired_count} perime(s)`} color="error" size="small" />
        )}
        {data.expiring_soon_count > 0 && (
          <Chip label={`${data.expiring_soon_count} expire(nt) sous 7j`} color="warning" size="small" />
        )}
        <Chip label={`${data.total} lot(s) a surveiller`} variant="outlined" size="small" />
      </Stack>

      {data.batches.slice(0, 5).map(batch => (
        <Box key={batch.id} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
          <Typography variant="body2">
            {batch.product_name} - Lot {batch.batch_number}
          </Typography>
          <Typography
            variant="body2"
            fontWeight="600"
            color={batch.is_expired ? 'error.main' : batch.days_until_expiry <= 7 ? 'warning.main' : 'text.secondary'}
          >
            {batch.is_expired ? 'PERIME' : `${batch.days_until_expiry}j`}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

export default BatchAlertCard;
