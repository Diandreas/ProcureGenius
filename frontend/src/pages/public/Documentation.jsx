import React, { useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';

export default function Documentation() {
  useEffect(() => {
    document.title = "Documentation & API | Procura";
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 12 }}>
      <Container maxWidth="lg">
        <Typography variant="h2" sx={{ fontWeight: 800, mb: 4, color: '#0f172a' }}>Documentation Procura</Typography>
        <Typography sx={{ fontSize: '1.2rem', color: 'text.secondary', mb: 6 }}>
          Bienvenue dans la documentation officielle de Procura. Retrouvez ici tous les guides, tutoriels d'intégration et références API pour bien démarrer.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 300, bgcolor: 'white', p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>Guide de démarrage rapide</Typography>
            <Typography color="text.secondary">Apprenez à configurer votre entreprise, inviter vos collaborateurs et créer votre première facture en moins de 5 minutes.</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 300, bgcolor: 'white', p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>Manuel d'utilisation de l'IA</Typography>
            <Typography color="text.secondary">Comment formuler vos prompts et requêtes à l'analyste privé Procura pour obtenir les meilleurs rapports possibles.</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 300, bgcolor: 'white', p: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>Référence API</Typography>
            <Typography color="text.secondary">Connectez Procura à vos outils ERP existants et manipulez vos données via nos endpoints RESTful.</Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
