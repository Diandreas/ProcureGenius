import React, { useState } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { Close, ReceiptLong } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { clientsAPI } from '../../services/api';
import { offlineData } from '../../services/offline/entities';
import { clearDemoInvoice, loadDemoInvoice } from '../../utils/demoInvoiceDraft';

/**
 * Après l'inscription : la facture préparée dans la démo IA de la page d'accueil
 * attend le nouvel utilisateur. Un clic crée (ou retrouve) le client et ouvre la
 * facture pré-remplie, qu'il n'a plus qu'à vérifier et enregistrer.
 */
export default function DemoInvoiceRestore() {
  const navigate = useNavigate();
  const [facture, setFacture] = useState(() => loadDemoInvoice());
  const [enCours, setEnCours] = useState(false);
  if (!facture) return null;

  const total = `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(facture.total || 0))} ${['XAF', 'XOF'].includes(facture.currency) ? 'FCFA' : facture.currency}`;

  const reprendre = async () => {
    setEnCours(true);
    let clientId = null;
    const nom = facture.client?.name;
    try {
      if (nom) {
        const { data } = await clientsAPI.list({ search: nom });
        const existant = (data.results || data || []).find((c) => c.name?.toLowerCase() === nom.toLowerCase());
        clientId = existant ? existant.id : (await offlineData.clients.create({ name: nom })).data?.id;
      }
    } catch { /* le client se choisira dans le formulaire */ }
    navigate(`/invoices/new?from=demo${clientId ? `&clientId=${clientId}` : ''}`);
  };

  const ignorer = () => {
    clearDemoInvoice();
    setFacture(null);
  };

  return (
    <Box sx={{
      display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, p: 2, mb: 2, borderRadius: 3,
      bgcolor: '#eff6ff', border: '1px solid #bfdbfe', flexDirection: { xs: 'column', sm: 'row' }, position: 'relative',
      pr: { xs: 2, sm: 6 },
    }}>
      <ReceiptLong sx={{ color: '#2563eb', fontSize: 32, display: { xs: 'none', sm: 'block' } }} />
      <Box sx={{ flex: 1, minWidth: 0, pr: { xs: 4, sm: 0 } }}>
        <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>Votre facture de la démo vous attend</Typography>
        <Typography variant="body2" sx={{ color: '#334155' }}>
          {facture.client?.name} · {facture.items?.length} ligne(s) · {total}. Vérifiez-la, puis enregistrez : elle aura son vrai numéro et votre logo.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Button variant="contained" disableElevation onClick={reprendre} disabled={enCours}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
          Ouvrir ma facture
        </Button>
      </Stack>
      <IconButton size="small" onClick={ignorer} aria-label="Ignorer" sx={{ position: 'absolute', top: 6, right: 6 }}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
}
