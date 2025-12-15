import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Send,
  Close,
  Email,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

function SendInvoiceEmailModal({ open, onClose, invoice, onSent }) {
  const { enqueueSnackbar } = useSnackbar();
  const [recipientEmail, setRecipientEmail] = useState(invoice?.client?.email || '');
  const [subject, setSubject] = useState(`Facture ${invoice?.invoice_number || ''} - ProcureGenius`);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!recipientEmail) {
      enqueueSnackbar('Veuillez saisir un email destinataire', { variant: 'error' });
      return;
    }

    try {
      setSending(true);
      const response = await fetch(`/api/invoices/${invoice.id}/send-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          subject: subject,
          message: message,
        }),
      });

      const data = await response.json();
      if (data.success || response.ok) {
        enqueueSnackbar(data.message || 'Facture envoyée avec succès', { variant: 'success' });
        if (onSent) onSent();
        onClose();
      } else {
        enqueueSnackbar(data.error || 'Erreur lors de l\'envoi', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      enqueueSnackbar('Erreur lors de l\'envoi de l\'email', { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email />
            <Typography variant="h6">Envoyer la facture par email</Typography>
          </Box>
          <Button onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 0.5 }}>
            <Close />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            La facture sera envoyée en PDF en pièce jointe.
          </Alert>

          <TextField
            fullWidth
            label="Email destinataire"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Objet"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message (optionnel)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message personnalisé à inclure dans l'email..."
          />

          <Divider />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Détails de la facture:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Numéro: {invoice.invoice_number || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Montant: {invoice.total_amount?.toFixed(2) || '0.00'} €
            </Typography>
            {invoice.client && (
              <Typography variant="body2" color="text.secondary">
                Client: {invoice.client.name || invoice.client.first_name + ' ' + invoice.client.last_name}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Annuler
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          startIcon={sending ? <CircularProgress size={16} /> : <Send />}
          disabled={sending || !recipientEmail}
        >
          {sending ? 'Envoi...' : 'Envoyer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SendInvoiceEmailModal;

