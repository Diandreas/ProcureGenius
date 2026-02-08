import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import { Home as HomeIcon, NavigateNext as NavIcon } from '@mui/icons-material';

const routeLabels = {
  '': 'Tableau de Bord',
  'healthcare': 'Sante',
  'analytics': 'Analyses',
  'inventory': 'Inventaire',
  'laboratory': 'Laboratoire',
  'exam-status': 'Statut Examens',
  'exam-types': 'Types d\'Examens',
  'demographics': 'Demographiques',
  'revenue': 'Revenus',
  'services': 'Revenus Services',
  'activity-indicators': 'Indicateurs d\'Activite',
  'reorder': 'Reapprovisionnement',
  'stockout-risk': 'Risque Rupture',
  'at-risk': 'Produits a Risque',
  'movements': 'Mouvements',
  'wilson-eoq': 'Analyse Wilson QEC',
  'predictive-restock': 'Restockage Predictif',
  'consumption': 'Consommation',
  'products': 'Produits',
  'suppliers': 'Fournisseurs',
  'invoices': 'Factures',
  'settings': 'Parametres',
  'batches': 'Lots',
};

const Breadcrumbs = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);

  // Skip UUID segments
  const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s);

  const crumbs = [];
  let currentPath = '';

  for (const part of pathParts) {
    currentPath += `/${part}`;
    if (isUUID(part)) continue;

    const label = routeLabels[part] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    crumbs.push({ label, path: currentPath });
  }

  if (crumbs.length <= 1) return null;

  return (
    <Box mb={2}>
      <MuiBreadcrumbs separator={<NavIcon fontSize="small" />} sx={{ '& .MuiBreadcrumbs-li': { fontSize: '0.85rem' } }}>
        <Link
          component={RouterLink}
          to="/"
          color="inherit"
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon sx={{ fontSize: 18 }} />
          Accueil
        </Link>
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return isLast ? (
            <Typography key={crumb.path} color="text.primary" fontWeight="600" fontSize="0.85rem">
              {crumb.label}
            </Typography>
          ) : (
            <Link
              key={crumb.path}
              component={RouterLink}
              to={crumb.path}
              color="inherit"
              underline="hover"
              fontSize="0.85rem"
            >
              {crumb.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;
