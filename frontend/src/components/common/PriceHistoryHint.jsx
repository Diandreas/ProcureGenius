import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getPriceHistory } from '../../services/api';

const fmt = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);

/**
 * Affiche l'historique des prix d'achat sous le champ prix dans les formulaires PO/Devis.
 * Props : productId, supplierId (optionnel), currentPrice (optionnel)
 */
/**
 * Props :
 *  - productId : ID produit catalogue (mode facture)
 *  - descriptionKey : texte de description libre (mode BdC libre, min 3 chars)
 *  - supplierId : optionnel, filtre par fournisseur
 *  - currentPrice : pour calculer l'écart
 */
const PriceHistoryHint = ({ productId, descriptionKey, supplierId, currentPrice }) => {
  const [data, setData] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const hasQuery = productId || (descriptionKey && descriptionKey.trim().length >= 3);
    if (!hasQuery) {
      setData(null);
      return;
    }

    // Debounce 600ms
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const params = {};
        if (productId) params.product_id = productId;
        if (descriptionKey && descriptionKey.trim().length >= 3) params.description = descriptionKey.trim();
        if (supplierId) params.supplier_id = supplierId;
        if (currentPrice !== undefined && currentPrice !== null && currentPrice !== '') {
          params.current_price = currentPrice;
        }
        const res = await getPriceHistory(params);
        setData(res.data);
      } catch {
        setData(null);
      }
    }, 600);

    return () => clearTimeout(timerRef.current);
  }, [productId, descriptionKey, supplierId, currentPrice]);

  if (!data || data.occurrences === 0) return null;

  const { last_price, last_date, last_supplier, avg_price, deviation_percent, warning } = data;

  const deviationPositive = deviation_percent !== null && deviation_percent > 0;
  const deviationAbs = deviation_percent !== null ? Math.abs(deviation_percent) : null;
  const chipColor = deviation_percent === null ? 'default'
    : deviation_percent > 10 ? 'error'
    : deviation_percent < -10 ? 'success'
    : 'default';
  const DeviationIcon = deviation_percent === null ? Minus
    : deviation_percent > 0 ? TrendingUp : TrendingDown;

  return (
    <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="caption" color="text.secondary">
        Dernier achat : <strong>{fmt(last_price)}</strong>
        {last_date && ` le ${last_date}`}
        {last_supplier && ` (${last_supplier})`}
        {' · '}Moy. : <strong>{fmt(avg_price)}</strong>
      </Typography>

      {deviation_percent !== null && (
        <Chip
          size="small"
          color={chipColor}
          icon={<DeviationIcon size={11} />}
          label={`${deviationPositive ? '+' : ''}${deviation_percent}%`}
          sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
        />
      )}
    </Box>
  );
};

export default PriceHistoryHint;
