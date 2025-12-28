import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Divider,
  Fade,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Description as ArticleIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { searchDocumentation, documentationCategories } from '../../data/documentationLoader';
import { useTranslation } from 'react-i18next';

const SearchBar = ({ autoFocus = false, onResultClick }) => {
  const { t } = useTranslation(['help', 'common']);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Recherches populaires
  const popularSearches = [
    'créer facture',
    'nouveau fournisseur',
    'gestion stock',
    'bon de commande',
  ];

  // Recherche en temps réel
  useEffect(() => {
    if (query.trim().length > 1) {
      const searchResults = searchDocumentation(query);
      setResults(searchResults);
      setShowResults(true);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  // Gestion du clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Navigation au clavier
  const handleKeyDown = (event) => {
    if (!showResults) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setQuery('');
        break;
      default:
        break;
    }
  };

  const handleResultClick = (article) => {
    navigate(`/help/${article.id}`);
    setShowResults(false);
    setQuery('');
    if (onResultClick) {
      onResultClick(article);
    }
  };

  const handlePopularSearchClick = (searchTerm) => {
    setQuery(searchTerm);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const getCategoryInfo = (categoryId) => {
    return documentationCategories().find((cat) => cat.id === categoryId);
  };

  const groupResultsByCategory = () => {
    const grouped = {};
    results.forEach((article) => {
      if (!grouped[article.category]) {
        grouped[article.category] = [];
      }
      grouped[article.category].push(article);
    });
    return grouped;
  };

  const groupedResults = groupResultsByCategory();

  return (
    <Box sx={{ position: 'relative', width: '100%' }} ref={searchRef}>
      <TextField
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setShowResults(true);
        }}
        placeholder={t('help:search.placeholder', 'Rechercher dans la documentation...')}
        autoFocus={autoFocus}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: query && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClear}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
          sx: {
            borderRadius: 3,
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? alpha(theme.palette.grey[100], 0.8)
                : alpha(theme.palette.grey[800], 0.4),
            '&:hover': {
              backgroundColor: (theme) =>
                theme.palette.mode === 'light'
                  ? theme.palette.grey[100]
                  : alpha(theme.palette.grey[800], 0.6),
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
          },
        }}
      />

      {/* Résultats de recherche */}
      <Fade in={showResults && (results.length > 0 || query.length === 0)}>
        <Paper
          ref={resultsRef}
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 500,
            overflow: 'auto',
            zIndex: 1300,
            borderRadius: 2,
          }}
        >
          {/* Recherches populaires (quand pas de query) */}
          {query.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <TrendingIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  {t('help:search.popular', 'Recherches populaires')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {popularSearches.map((term) => (
                  <Chip
                    key={term}
                    label={term}
                    size="small"
                    onClick={() => handlePopularSearchClick(term)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Résultats groupés par catégorie */}
          {results.length > 0 && (
            <List sx={{ py: 0 }}>
              {Object.entries(groupedResults).map(([categoryId, articles], groupIndex) => {
                const categoryInfo = getCategoryInfo(categoryId);
                return (
                  <Box key={categoryId}>
                    {groupIndex > 0 && <Divider />}
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        backgroundColor: (theme) =>
                          alpha(theme.palette.primary.main, 0.05),
                      }}
                    >
                      <Typography variant="caption" color="primary" fontWeight={600}>
                        {categoryInfo?.title || categoryId}
                      </Typography>
                    </Box>
                    {articles.map((article, index) => {
                      const globalIndex = results.indexOf(article);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <ListItem key={article.id} disablePadding>
                          <ListItemButton
                            selected={isSelected}
                            onClick={() => handleResultClick(article)}
                            sx={{
                              py: 1.5,
                              '&.Mui-selected': {
                                backgroundColor: (theme) =>
                                  alpha(theme.palette.primary.main, 0.12),
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <ArticleIcon fontSize="small" color="action" />
                            </ListItemIcon>
                            <ListItemText
                              primary={article.title}
                              secondary={
                                article.content
                                  .substring(0, 100)
                                  .replace(/[#*\n]/g, '')
                                  .trim() + '...'
                              }
                              primaryTypographyProps={{
                                fontWeight: 500,
                                fontSize: '0.9rem',
                              }}
                              secondaryTypographyProps={{
                                fontSize: '0.75rem',
                                noWrap: true,
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </Box>
                );
              })}
            </List>
          )}

          {/* Aucun résultat */}
          {query.length > 1 && results.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('help:search.noResults', 'Aucun résultat trouvé pour')} "{query}"
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('help:search.tryDifferent', 'Essayez avec d\'autres mots-clés')}
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>
    </Box>
  );
};

export default SearchBar;
