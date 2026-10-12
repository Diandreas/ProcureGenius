import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { PictureAsPdf, CheckCircle, Receipt, Print, Download } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * Dialog pour générer des rapports PDF avec filtres de période et sélection d'éléments
 */
function ReportGenerationDialog({
  open,
  onClose,
  onGenerate,
  items = [],
  title: titleProp,
  itemLabel: itemLabelProp,
  itemsLabel: itemsLabelProp,
  showDateFilter = true,
  showItemSelection = true,
}) {
  const { t } = useTranslation('common');
  const title = titleProp ?? t('common:reportDialog.defaultTitle');
  const itemLabel = itemLabelProp ?? t('common:reportDialog.defaultItemLabel');
  const itemsLabel = itemsLabelProp ?? t('common:reportDialog.defaultItemsLabel');
  const [selectedItems, setSelectedItems] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [autoGenerate, setAutoGenerate] = useState(false);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedItems(items.map((item) => item.id));
      setSelectAll(true);
    } else {
      setSelectedItems([]);
      setSelectAll(false);
    }
  };

  const handleToggleItem = (itemId) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Générer automatiquement le PDF quand autoGenerate est activé
  useEffect(() => {
    if (autoGenerate && !generating && !pdfBlob) {
      const generatePDF = async () => {
        setGenerating(true);
        try {
          const blob = await onGenerate({
            itemIds: selectedItems.length > 0 ? selectedItems : undefined,
            dateStart: dateStart || undefined,
            dateEnd: dateEnd || undefined,
          });
          setPdfBlob(blob);
        } catch (error) {
          console.error('Error generating report:', error);
          setAutoGenerate(false);
        } finally {
          setGenerating(false);
        }
      };
      generatePDF();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate]);

  const handleGenerate = () => {
    setAutoGenerate(true);
  };

  const handlePdfAction = (action) => {
    if (!pdfBlob) return;
    
    if (action === 'download') {
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else if (action === 'preview') {
      const url = window.URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } else if (action === 'print') {
      const url = window.URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          setTimeout(() => window.URL.revokeObjectURL(url), 100);
        };
      }
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedItems([]);
    setDateStart('');
    setDateEnd('');
    setSelectAll(false);
    setPdfBlob(null);
    setAutoGenerate(false);
    onClose();
  };

  const hasSelection = selectedItems.length > 0 || dateStart || dateEnd;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PictureAsPdf color="error" />
          {title}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Filtre de période */}
        {showDateFilter && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              {t('common:reportDialog.period')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              {t('common:reportDialog.periodHint')}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('common:reportDialog.startDate')}
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  max: dateEnd || undefined,
                }}
              />
              <TextField
                label={t('common:reportDialog.endDate')}
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: dateStart || undefined,
                }}
              />
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Sélection d'éléments */}
        {showItemSelection && items.length > 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  {t('common:reportDialog.itemSelection', { itemsLabel })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedItems.length > 0
                    ? t('common:reportDialog.selectedCount', { count: selectedItems.length, itemLabel })
                    : t('common:reportDialog.selectAllHint', { itemsLabel })}
                </Typography>
              </Box>
              <Chip
                label={t('common:reportDialog.available', { count: items.length, itemsLabel })}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            <FormControl component="fieldset" variant="standard" fullWidth>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectAll}
                      indeterminate={selectedItems.length > 0 && selectedItems.length < items.length}
                      onChange={handleSelectAll}
                    />
                  }
                  label={<strong>{t('common:reportDialog.selectAll')}</strong>}
                />

                <Divider sx={{ my: 1 }} />

                <Box
                  sx={{
                    maxHeight: 300,
                    overflow: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  {items.map((item) => (
                    <FormControlLabel
                      key={item.id}
                      control={
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleToggleItem(item.id)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{item.label}</Typography>
                          {item.sublabel && (
                            <Typography variant="caption" color="text.secondary">
                              {item.sublabel}
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ width: '100%', m: 0, py: 0.5 }}
                    />
                  ))}
                </Box>
              </FormGroup>
            </FormControl>
          </Box>
        )}

        {/* Message informatif */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            {selectedItems.length > 0
              ? t('common:reportDialog.infoSelected', { count: selectedItems.length, itemLabel })
              : t('common:reportDialog.infoAll', { itemsLabel })}
            {dateStart && dateEnd && t('common:reportDialog.infoPeriod', { start: dateStart.toLocaleDateString(), end: dateEnd.toLocaleDateString() })}
            {dateStart && !dateEnd && t('common:reportDialog.infoFrom', { start: dateStart.toLocaleDateString() })}
            {!dateStart && dateEnd && t('common:reportDialog.infoUntil', { end: dateEnd.toLocaleDateString() })}
            .
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={generating}>
          {t('common:buttons.cancel')}
        </Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          color="success"
          startIcon={generating ? <CircularProgress size={16} /> : <CheckCircle />}
          disabled={generating}
        >
          {generating ? t('common:reportDialog.generating') : t('common:reportDialog.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReportGenerationDialog;

