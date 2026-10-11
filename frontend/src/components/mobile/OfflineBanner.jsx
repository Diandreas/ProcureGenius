// Bandeau d'etat hors ligne / synchro (app native et navigateur) :
// - hors ligne : « Hors ligne — vos saisies sont gardées sur cet appareil »
// - en ligne avec des envois en attente : « N enregistrement(s) à envoyer »
// - envois refuses par le serveur : liste, avec Réessayer / Abandonner

import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Typography,
} from '@mui/material';
import { CloudOff, CloudSync, ErrorOutline } from '@mui/icons-material';
import { onPendingChange, syncNow, notifyPending } from '../../services/offline/syncEngine';
import { onConnectivityChange } from '../../services/offline/connectivity';
import { failedMutations, removeMutation, retryMutation } from '../../services/offline/mutationQueue';

const ENTITY_LABEL = {
  clients: 'Client', suppliers: 'Fournisseur', products: 'Produit', invoices: 'Facture', purchaseOrders: 'Bon de commande',
};
const OP_LABEL = { create: 'création', update: 'modification', delete: 'suppression', settle: 'paiement' };

const bar = (bgcolor, clickable) => ({
  position: 'sticky', top: 0, zIndex: 1300,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 1, py: 0.75, px: 2, cursor: clickable ? 'pointer' : 'default',
  bgcolor, color: '#fff',
});
const text = { fontSize: '0.8rem', fontWeight: 600 };

// Message lisible a partir de l'erreur renvoyee par le serveur
const readableError = (raw) => {
  try {
    const data = JSON.parse(raw);
    if (typeof data === 'string') return data;
    if (data.detail || data.error) return data.detail || data.error;
    return Object.entries(data).map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ');
  } catch {
    return raw || '';
  }
};

const describe = (m) => {
  const p = m.payload || {};
  const name = p.name || p.title || p.invoice_number || p.po_number || '';
  return `${ENTITY_LABEL[m.entity] || m.entity} — ${OP_LABEL[m.op] || m.op}${name ? ` « ${name} »` : ''}`;
};

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [open, setOpen] = useState(false);
  const [failedList, setFailedList] = useState([]);

  useEffect(() => onConnectivityChange((isOnline) => setOffline(!isOnline)), []);
  useEffect(() => onPendingChange((p, f) => { setPending(p); setFailed(f || 0); }), []);
  useEffect(() => { notifyPending(); }, []);

  const showFailed = async () => {
    setFailedList(await failedMutations());
    setOpen(true);
  };
  const act = async (m, fn) => {
    await fn(m.mutation_id);
    const rest = await failedMutations();
    setFailedList(rest);
    if (!rest.length) setOpen(false);
    await notifyPending();
    syncNow();
  };

  const dialog = (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Enregistrements non envoyés</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Saisis hors ligne, ils ont été refusés par le serveur. Corrigez si besoin puis réessayez, ou abandonnez-les.
        </Typography>
        <List dense>
          {failedList.map((m) => (
            <ListItem key={m.mutation_id} disableGutters
              secondaryAction={(
                <Box display="flex" gap={0.5}>
                  <Button size="small" onClick={() => act(m, retryMutation)}>Réessayer</Button>
                  <Button size="small" color="error" onClick={() => act(m, removeMutation)}>Abandonner</Button>
                </Box>
              )}>
              <ListItemText sx={{ pr: 22 }} primary={describe(m)} secondary={readableError(m.last_error)} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>Fermer</Button></DialogActions>
    </Dialog>
  );

  let banner = null;
  if (offline) {
    banner = (
      <Box sx={bar('#5a6478')} role="status">
        <CloudOff sx={{ fontSize: 18 }} />
        <Typography sx={text}>
          Hors ligne — {pending > 0 ? `${pending} enregistrement${pending > 1 ? 's' : ''} en attente d'envoi` : 'vos saisies sont gardées sur cet appareil'}
        </Typography>
      </Box>
    );
  } else if (pending > 0) {
    banner = (
      <Box sx={bar('#2563eb', true)} onClick={() => syncNow()} role="status">
        <CloudSync sx={{ fontSize: 18 }} />
        <Typography sx={text}>
          {pending} enregistrement{pending > 1 ? 's' : ''} à envoyer — toucher pour réessayer
        </Typography>
      </Box>
    );
  } else if (failed > 0) {
    banner = (
      <Box sx={bar('#b45309', true)} onClick={showFailed} role="status">
        <ErrorOutline sx={{ fontSize: 18 }} />
        <Typography sx={text}>
          {failed} enregistrement{failed > 1 ? 's' : ''} refusé{failed > 1 ? 's' : ''} par le serveur — voir
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {banner}
      {dialog}
    </>
  );
}
