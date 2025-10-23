import React, { useState } from 'react';
import { TextField, InputAdornment, Box } from '@mui/material';
import { Search } from '@mui/icons-material';

/**
 * Composant de recherche réutilisable pour les vues avec onglets
 * Affiche une barre de recherche uniquement si le nombre d'éléments dépasse un seuil
 */
function TabSearchBar({ items, onSearch, threshold = 10, placeholder = "Rechercher..." }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Afficher uniquement si le nombre d'éléments dépasse le seuil
  if (!items || items.length <= threshold) {
    return null;
  }

  const handleSearch = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    onSearch(term);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <TextField
        fullWidth
        size="small"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleSearch}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'action.active' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'background.paper',
          },
        }}
      />
    </Box>
  );
}

export default TabSearchBar;
