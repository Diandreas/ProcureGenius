import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Download, Lock, WhatsApp, Save } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const montant = (v, devise) => {
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v || 0));
  return `${n} ${devise === 'XAF' || devise === 'XOF' ? 'FCFA' : devise}`;
};
const date = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR') : '');

/**
 * Facture préparée par l'IA dans la démo de la page d'accueil. Elle a l'allure du
 * vrai document ; télécharger, envoyer ou garder demande un compte (onLocked).
 */
export default function DemoInvoiceCard({ invoice, onLocked }) {
  const { t } = useTranslation('landing');
  if (!invoice) return null;
  const devise = invoice.currency;
  const encre = '#0f172a';
  const gris = '#64748b';

  return (
    <Box sx={{ width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0', bgcolor: '#fff', color: encre }}>
      {/* Le document */}
      <Box sx={{ p: { xs: 1.5, sm: 2 }, position: 'relative' }}>
        <Typography aria-hidden sx={{
          position: 'absolute', top: '42%', left: 0, right: 0, textAlign: 'center',
          transform: 'rotate(-18deg)', fontSize: { xs: '1.6rem', sm: '2.1rem' }, fontWeight: 900,
          color: 'rgba(37,99,235,0.07)', letterSpacing: 4, pointerEvents: 'none', userSelect: 'none',
        }}>
          {t('liveDemo.invoice.watermark')}
        </Typography>

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', lineHeight: 1.25 }}>{invoice.company?.name}</Typography>
            <Typography sx={{ fontSize: '0.68rem', color: gris }}>{invoice.company?.address}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#2563eb', letterSpacing: 1 }}>{t('liveDemo.invoice.title')}</Typography>
            <Typography sx={{ fontSize: '0.66rem', color: gris }}>{t('liveDemo.invoice.issued', { date: date(invoice.issue_date) })}</Typography>
            <Typography sx={{ fontSize: '0.66rem', color: gris }}>{t('liveDemo.invoice.due', { date: date(invoice.due_date) })}</Typography>
          </Box>
        </Stack>

        <Box sx={{ mb: 1.5, p: 1, borderRadius: 1, bgcolor: '#f8fafc' }}>
          <Typography sx={{ fontSize: '0.62rem', color: gris, textTransform: 'uppercase', fontWeight: 700 }}>{t('liveDemo.invoice.billedTo')}</Typography>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{invoice.client?.name}</Typography>
        </Box>

        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', '& td, & th': { py: 0.6, px: 0.5 } }}>
          <thead>
            <Box component="tr" sx={{ borderBottom: '1px solid #e2e8f0', color: gris, textAlign: 'left' }}>
              <th>{t('liveDemo.invoice.item')}</th>
              <Box component="th" sx={{ textAlign: 'right' }}>{t('liveDemo.invoice.qty')}</Box>
              <Box component="th" sx={{ textAlign: 'right', display: { xs: 'none', sm: 'table-cell' } }}>{t('liveDemo.invoice.unitPrice')}</Box>
              <Box component="th" sx={{ textAlign: 'right' }}>{t('liveDemo.invoice.total')}</Box>
            </Box>
          </thead>
          <tbody>
            {invoice.items.map((l, i) => (
              <Box component="tr" key={i} sx={{ borderBottom: '1px solid #f1f5f9' }}>
                <td>{l.description}</td>
                <Box component="td" sx={{ textAlign: 'right' }}>{l.quantity}</Box>
                <Box component="td" sx={{ textAlign: 'right', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>{montant(l.unit_price, devise)}</Box>
                <Box component="td" sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{montant(l.total, devise)}</Box>
              </Box>
            ))}
          </tbody>
        </Box>

        <Box sx={{ mt: 1, ml: 'auto', width: { xs: '100%', sm: '70%' }, fontSize: '0.74rem' }}>
          <Stack direction="row" justifyContent="space-between"><span>{t('liveDemo.invoice.subtotal')}</span><span>{montant(invoice.subtotal, devise)}</span></Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ color: gris }}>
            <span>{t('liveDemo.invoice.tax', { rate: String(invoice.tax_rate).replace('.', ',') })}</span><span>{montant(invoice.tax_amount, devise)}</span>
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5, pt: 0.5, borderTop: `2px solid ${encre}`, fontWeight: 900, fontSize: '0.88rem' }}>
            <span>{t('liveDemo.invoice.totalDue')}</span><span>{montant(invoice.total, devise)}</span>
          </Stack>
        </Box>
      </Box>

      {/* Ce qu'on fait d'une facture : réservé aux comptes */}
      <Box sx={{ p: 1.25, bgcolor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {[
            { key: 'pdf', icon: <Download sx={{ fontSize: 16 }} />, label: t('liveDemo.invoice.download') },
            { key: 'whatsapp', icon: <WhatsApp sx={{ fontSize: 16 }} />, label: t('liveDemo.invoice.whatsapp') },
            { key: 'save', icon: <Save sx={{ fontSize: 16 }} />, label: t('liveDemo.invoice.save') },
          ].map((a) => (
            <Button key={a.key} size="small" variant={a.key === 'save' ? 'contained' : 'outlined'} disableElevation
              startIcon={a.icon} endIcon={<Lock sx={{ fontSize: '13px !important', opacity: 0.7 }} />}
              onClick={() => onLocked(a.key)}
              sx={{
                textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', borderRadius: 1.5, flex: { xs: '1 1 100%', sm: '1 1 auto' },
                ...(a.key === 'save'
                  ? { bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }
                  : { color: encre, borderColor: '#cbd5e1', bgcolor: '#fff' }),
              }}>
              {a.label}
            </Button>
          ))}
        </Stack>
        {invoice.unknown_items?.length > 0 && (
          <Chip size="small" sx={{ mt: 1, fontSize: '0.66rem', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.25 } }}
            label={t('liveDemo.invoice.unknown', { items: invoice.unknown_items.join(', ') })} />
        )}
      </Box>
    </Box>
  );
}
