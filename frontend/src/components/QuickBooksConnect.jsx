import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle,
  Link as LinkIcon,
  LinkOff,
  Refresh,
} from '@mui/icons-material';
import { quickbooksAPI } from '../services/api';

function QuickBooksConnect({ onConnectionChange }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disconnectDialog, setDisconnectDialog] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await quickbooksAPI.getStatus();
      setStatus(response.data);
      if (onConnectionChange) {
        onConnectionChange(response.data.connected);
      }
    } catch (err) {
      console.error('Erreur statut QuickBooks:', err);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await quickbooksAPI.getAuthUrl();
      const { auth_url } = response.data;

      // Ouvrir QuickBooks OAuth dans une popup
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const popup = window.open(
        auth_url,
        'QuickBooks OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Écouter le message de callback
      const handleMessage = (event) => {
        if (event.data.type === 'quickbooks-connected') {
          popup.close();
          fetchStatus();
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Vérifier si la popup est fermée
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          fetchStatus(); // Rafraîchir le statut même si fermé manuellement
          setLoading(false);
        }
      }, 1000);

    } catch (err) {
      setError('Erreur lors de la connexion à QuickBooks');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await quickbooksAPI.disconnect();
      setStatus({ connected: false });
      setDisconnectDialog(false);
      if (onConnectionChange) {
        onConnectionChange(false);
      }
    } catch (err) {
      setError('Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setLoading(true);
      setError(null);
      await quickbooksAPI.testConnection();
      alert('Connexion QuickBooks OK!');
    } catch (err) {
      setError('Test de connexion échoué');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <img
                src="https://plugin.intuit.com/sbg-web-shell-ui/6.3.0/shell/harmony/images/QBOlogo.svg"
                alt="QuickBooks"
                style={{ height: 32 }}
              />
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                  QuickBooks Online
                </Typography>
                {status?.connected ? (
                  <Chip
                    icon={<CheckCircle />}
                    label="Connecté"
                    size="small"
                    color="success"
                  />
                ) : (
                  <Chip
                    icon={<LinkOff />}
                    label="Non connecté"
                    size="small"
                    color="default"
                  />
                )}
              </Box>
            </Box>

            <Box display="flex" gap={1}>
              {status?.connected ? (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={handleTest}
                    disabled={loading}
                  >
                    Tester
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => setDisconnectDialog(true)}
                    disabled={loading}
                  >
                    Déconnecter
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={handleConnect}
                  disabled={loading}
                >
                  Connecter
                </Button>
              )}
            </Box>
          </Box>

          {status?.connected && (
            <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Entreprise:</strong> {status.company_name || 'Chargement...'}
              </Typography>
              <Typography variant="body2">
                <strong>Connecté le:</strong>{' '}
                {status.connected_at
                  ? new Date(status.connected_at).toLocaleDateString('fr-CA')
                  : '-'}
              </Typography>
              {status.last_sync_at && (
                <Typography variant="body2">
                  <strong>Dernière sync:</strong>{' '}
                  {new Date(status.last_sync_at).toLocaleDateString('fr-CA')}
                </Typography>
              )}
            </Box>
          )}

          {!status?.connected && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Connectez QuickBooks pour importer directement vos fournisseurs, clients, produits
              et factures sans passer par Excel/CSV.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmation de déconnexion */}
      <Dialog open={disconnectDialog} onClose={() => setDisconnectDialog(false)}>
        <DialogTitle>Déconnecter QuickBooks?</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir déconnecter QuickBooks? Vous devrez vous reconnecter pour
            importer des données à nouveau.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialog(false)}>Annuler</Button>
          <Button onClick={handleDisconnect} color="error" variant="contained">
            Déconnecter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default QuickBooksConnect;
