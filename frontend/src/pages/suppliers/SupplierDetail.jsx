import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  Rating,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Edit,
  Delete,
  Email,
  Phone,
  LocationOn,
  Business,
  Person,
  Star,
  ArrowBack,
  MoreVert,
  CheckCircle,
  Warning,
  Block,
  Schedule,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { suppliersAPI } from '../../services/api';
import { getStatusColor, getStatusLabel, formatDate, getPerformanceBadgeColor, parseRating } from '../../utils/formatters';

function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.get(id);
      setSupplier(response.data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement du fournisseur', { variant: 'error' });
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/suppliers/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${supplier.name} ?`)) {
      try {
        await suppliersAPI.delete(id);
        enqueueSnackbar('Fournisseur supprimé avec succès', { variant: 'success' });
        navigate('/suppliers');
      } catch (error) {
        enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
      }
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await suppliersAPI.toggleStatus(id);
      setSupplier(response.data);
      enqueueSnackbar('Statut modifié avec succès', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erreur lors de la modification du statut', { variant: 'error' });
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: <CheckCircle color="success" />,
      pending: <Schedule color="warning" />,
      inactive: <Warning color="action" />,
      blocked: <Block color="error" />,
    };
    return icons[status] || null;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!supplier) {
    return (
      <Alert severity="error">
        Fournisseur introuvable
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/suppliers')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {supplier.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
          >
            Modifier
          </Button>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={handleToggleStatus}>
              {supplier.status === 'active' ? 'Désactiver' : 'Activer'}
            </MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Supprimer
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Informations principales */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                  {supplier.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="h5">
                      {supplier.name}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(supplier.status)}
                      label={getStatusLabel(supplier.status)}
                      color={getStatusColor(supplier.status)}
                    />
                  </Box>
                  {parseRating(supplier.rating) > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating value={parseRating(supplier.rating)} readOnly />
                      <Typography variant="body2" color="text.secondary">
                        ({parseRating(supplier.rating).toFixed(1)}/5)
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                {supplier.contact_person && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Personne contact
                        </Typography>
                        <Typography>{supplier.contact_person}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                
                {supplier.email && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Email
                        </Typography>
                        <Typography>
                          <a href={`mailto:${supplier.email}`} style={{ color: 'inherit' }}>
                            {supplier.email}
                          </a>
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                
                {supplier.phone && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Téléphone
                        </Typography>
                        <Typography>
                          <a href={`tel:${supplier.phone}`} style={{ color: 'inherit' }}>
                            {supplier.phone}
                          </a>
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                
                {(supplier.address || supplier.city || supplier.province) && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LocationOn color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Adresse
                        </Typography>
                        {supplier.address && (
                          <Typography>{supplier.address}</Typography>
                        )}
                        <Typography>
                          {[supplier.city, supplier.province].filter(Boolean).join(', ')}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Catégories */}
          {supplier.categories && supplier.categories.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Catégories
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {supplier.categories.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.name}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Performance */}
          {supplier.performance_badge && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={supplier.performance_badge.text}
                    color={getPerformanceBadgeColor(supplier.performance_badge.class)}
                    size="large"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Basé sur la note moyenne et les évaluations
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Diversité */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Diversité
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    {supplier.is_local ? <CheckCircle color="success" /> : <Block color="disabled" />}
                  </ListItemIcon>
                  <ListItemText primary="Fournisseur local" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {supplier.is_minority_owned ? <CheckCircle color="success" /> : <Block color="disabled" />}
                  </ListItemIcon>
                  <ListItemText primary="Propriété minoritaire" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {supplier.is_woman_owned ? <CheckCircle color="success" /> : <Block color="disabled" />}
                  </ListItemIcon>
                  <ListItemText primary="Propriété féminine" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {supplier.is_indigenous ? <CheckCircle color="success" /> : <Block color="disabled" />}
                  </ListItemIcon>
                  <ListItemText primary="Entreprise autochtone" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations système
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Date de création"
                    secondary={formatDate(supplier.created_at)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Dernière modification"
                    secondary={formatDate(supplier.updated_at)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SupplierDetail;