// Bandeau d'etat hors ligne / synchro (app native et navigateur) :
// - hors ligne : « Hors ligne — vos saisies sont gardées sur cet appareil »
// - en ligne avec des envois en attente : « N enregistrement(s) à envoyer »
// - envois refuses par le serveur : liste, avec Réessayer / Abandonner

import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Typography,
} from '@mui/material';
import { CloudOff, CloudSync, ErrorOutline } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { onPendingChange, syncNow, notifyPending } from '../../services/offline/syncEngine';
import { onConnectivityChange } from '../../services/offline/connectivity';
import { failedMutations, removeMutation, retryMutation } from '../../services/offline/mutationQueue';

// Codes -> cles de traduction (resolues au rendu)
const ENTITY_LABEL = {
  clients: 'offline:entities.clients', suppliers: 'offline:entities.suppliers', products: 'offline:entities.products',
  invoices: 'offline:entities.invoices', purchaseOrders: 'offline:entities.purchaseOrders',
};
const OP_LABEL = {
  create: 'offline:operations.create', update: 'offline:operations.update', delete: 'offline:operations.delete',
  settle: 'offline:operations.settle',
};

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

const describe = (m, t) => {
  const p = m.payload || {};
  const name = p.name || p.title || p.invoice_number || p.po_number || '';
  const entity = ENTITY_LABEL[m.entity] ? t(ENTITY_LABEL[m.entity]) : m.entity;
  const op = OP_LABEL[m.op] ? t(OP_LABEL[m.op]) : m.op;
  return name
    ? t('offline:failedDialog.itemWithName', { entity, op, name })
    : t('offline:failedDialog.item', { entity, op });
};

export default function OfflineBanner() {
  const { t } = useTranslation(['offline', 'common']);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [open, setOpen] = useState(false);
  const [failedList, setFailedList] = useState([]);
  // Visiteur non connecté (site public) : rien à synchroniser, pas de bandeau
  const connecte = useSelector((state) => state.auth?.isAuthenticated);

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
      <DialogTitle>{t('offline:failedDialog.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {t('offline:failedDialog.description')}
        </Typography>
        <List dense>
          {failedList.map((m) => (
            <ListItem key={m.mutation_id} disableGutters
              secondaryAction={(
                <Box display="flex" gap={0.5}>
                  <Button size="small" onClick={() => act(m, retryMutation)}>{t('offline:failedDialog.retry')}</Button>
                  <Button size="small" color="error" onClick={() => act(m, removeMutation)}>{t('offline:failedDialog.discard')}</Button>
                </Box>
              )}>
              <ListItemText sx={{ pr: 22 }} primary={describe(m, t)} secondary={readableError(m.last_error)} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>{t('common:buttons.close')}</Button></DialogActions>
    </Dialog>
  );

  let banner = null;
  if (!connecte) {
    banner = null;
  } else if (offline) {
    banner = (
      <Box sx={bar('#5a6478')} role="status">
        <CloudOff sx={{ fontSize: 18 }} />
        <Typography sx={text}>
          {pending > 0 ? t('offline:banner.offlinePending', { count: pending }) : t('offline:banner.offlineSaved')}
        </Typography>
      </Box>
    );
  } else if (pending > 0) {
    banner = (
      <Box sx={bar('#2563eb', true)} onClick={() => syncNow()} role="status">
        <CloudSync sx={{ fontSize: 18 }} />
        <Typography sx={text}>
          {t('offline:banner.pending', { count: pending })}
        </Typography>
      </Box>
    );
  } else if (failed > 0) {
    banner = (
      <Box sx={bar('#b45309', true)} onClick={showFailed} role="status">
        <ErrorOutline sx={{ fontSize: 18 }} />
        <Typography sx={text}>
          {t('offline:banner.failed', { count: failed })}
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
