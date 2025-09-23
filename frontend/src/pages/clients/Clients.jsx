import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material';
import { Add, Edit, Email, Phone, Person } from '@mui/icons-material';
import { clientsAPI } from '../../services/api';

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientsAPI.list();
      setClients(response.data.results || response.data);
    } catch (err) {
      setError('Erreur lors du chargement des clients');
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'success' : 'default';
  };

  const getStatusLabel = (isActive) => {
    return isActive ? 'Actif' : 'Inactif';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Clients</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/clients/create')}
        >
          Nouveau client
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Date création</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {client.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{client.name}</Typography>
                          {client.address && (
                            <Typography variant="caption" color="textSecondary">
                              {client.address}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {client.contact_person && (
                        <Box display="flex" alignItems="center">
                          <Person fontSize="small" sx={{ mr: 1 }} />
                          {client.contact_person}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.email && (
                        <Box display="flex" alignItems="center">
                          <Email fontSize="small" sx={{ mr: 1 }} />
                          {client.email}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.phone && (
                        <Box display="flex" alignItems="center">
                          <Phone fontSize="small" sx={{ mr: 1 }} />
                          {client.phone}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(client.is_active)}
                        color={getStatusColor(client.is_active)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => navigate(`/clients/${client.id}/edit`)}
                      >
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {clients.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary">
                Aucun client trouvé
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/clients/create')}
                sx={{ mt: 2 }}
              >
                Créer le premier client
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Clients;