/**
 * Example: Dashboard with AdSense Integration
 * This shows how to integrate ads into your dashboard
 */
import React from 'react';
import { Container, Grid, Box, Typography } from '@mui/material';
import { ConditionalAdBanner } from './AdSense';

function DashboardWithAds() {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Top Leaderboard Ad */}
      <ConditionalAdBanner format="leaderboard" />

      {/* Dashboard Header */}
      <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
        Tableau de bord
      </Typography>

      <Grid container spacing={3}>
        {/* Main Content Area (8 columns) */}
        <Grid item xs={12} md={8}>
          {/* Your dashboard widgets here */}
          <Box sx={{ mb: 3 }}>
            {/* Widget 1 */}
            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, mb: 2 }}>
              <Typography variant="h6">Statistiques du mois</Typography>
              {/* Stats content */}
            </Box>

            {/* Widget 2 */}
            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, mb: 2 }}>
              <Typography variant="h6">Activités récentes</Typography>
              {/* Activities content */}
            </Box>

            {/* Ad between content */}
            <ConditionalAdBanner format="banner" />

            {/* Widget 3 */}
            <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, mt: 2 }}>
              <Typography variant="h6">Graphiques</Typography>
              {/* Charts content */}
            </Box>
          </Box>
        </Grid>

        {/* Sidebar (4 columns) */}
        <Grid item xs={12} md={4}>
          {/* Sidebar Ad */}
          <ConditionalAdBanner format="rectangle" />

          {/* Sidebar Widgets */}
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Actions rapides
            </Typography>
            {/* Quick actions */}
          </Box>

          {/* Another sidebar ad */}
          <Box sx={{ mt: 3 }}>
            <ConditionalAdBanner format="large-rectangle" />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default DashboardWithAds;
