import React, { useState, useEffect, useId } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatRate, toNumber } from '../../utils/vat';

const CUSTOM = '__custom__';

/**
 * Choix d'un taux de TVA : taux de l'organisation (ex. 19 %, 7 %, 0 % en Allemagne) ou valeur libre.
 */
function VatRateSelect({ value, onChange, rates = [], label, size = 'small', fullWidth = true, disabled = false, sx }) {
  const { t, i18n } = useTranslation(['invoices', 'common']);
  const num = toNumber(value);
  const isKnown = (v) => rates.some((r) => toNumber(r) === toNumber(v));
  const [custom, setCustom] = useState(!isKnown(value));

  // Valeur reçue de l'extérieur (facture chargée, « appliquer à toutes les lignes ») hors des taux proposés
  useEffect(() => {
    if (!isKnown(value)) setCustom(true);
  }, [value, rates.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (e) => {
    if (e.target.value === CUSTOM) {
      setCustom(true);
      return;
    }
    setCustom(false);
    onChange(toNumber(e.target.value));
  };

  const fieldLabel = label || t('invoices:vat.rate');
  const labelId = useId();

  return (
    <Box sx={{ display: 'flex', gap: 1, width: fullWidth ? '100%' : 'auto', ...sx }}>
      <FormControl size={size} fullWidth={fullWidth} disabled={disabled} sx={{ minWidth: 110 }}>
        <InputLabel id={labelId}>{fieldLabel}</InputLabel>
        <Select
          labelId={labelId}
          value={custom ? CUSTOM : String(num)}
          label={fieldLabel}
          onChange={handleSelect}
          sx={{ borderRadius: 2 }}
        >
          {rates.map((r) => (
            <MenuItem key={String(r)} value={String(toNumber(r))}>
              {formatRate(r, i18n.language)} %
            </MenuItem>
          ))}
          <MenuItem value={CUSTOM}>{t('invoices:vat.customRate')}</MenuItem>
        </Select>
      </FormControl>
      {custom && (
        <TextField
          size={size}
          type="number"
          disabled={disabled}
          label={t('invoices:vat.customRateValue')}
          value={value === '' ? '' : num}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? '' : Math.min(100, Math.max(0, parseFloat(v) || 0)));
          }}
          inputProps={{ min: 0, max: 100, step: 0.01 }}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          sx={{ minWidth: 110, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      )}
    </Box>
  );
}

export default VatRateSelect;
