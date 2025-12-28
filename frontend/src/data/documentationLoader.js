/**
 * Documentation Loader - Bilingual Support
 *
 * Automatically loads the correct documentation based on user's language preference.
 */

import i18n from '../i18n/config';

// Import both language versions
import * as docFR from './documentation';
import * as docEN from './documentationEN';

/**
 * Get the current documentation based on active language
 */
export const getCurrentDocumentation = () => {
  const currentLanguage = i18n.language || 'fr';

  // Return English documentation if language is 'en', otherwise French
  if (currentLanguage === 'en') {
    return {
      categories: docEN.documentationCategories,
      articles: docEN.documentationArticles,
      searchDocumentation: docEN.searchDocumentation,
      getCategoryById: docEN.getCategoryById,
      getArticleById: docEN.getArticleById,
      getRelatedArticles: docEN.getRelatedArticles,
      getArticlesByCategory: docEN.getArticlesByCategory,
    };
  }

  // Default to French
  return {
    categories: docFR.documentationCategories,
    articles: docFR.documentationArticles,
    searchDocumentation: docFR.searchDocumentation,
    getCategoryById: docFR.getCategoryById,
    getArticleById: docFR.getArticleById,
    getRelatedArticles: docFR.getRelatedArticles,
    getArticlesByCategory: docFR.getArticlesByCategory,
  };
};

/**
 * Export individual functions that automatically use the current language
 */
export const documentationCategories = () => getCurrentDocumentation().categories;
export const documentationArticles = () => getCurrentDocumentation().articles;
export const searchDocumentation = (query) => getCurrentDocumentation().searchDocumentation(query);
export const getCategoryById = (categoryId) => getCurrentDocumentation().getCategoryById(categoryId);
export const getArticleById = (articleId) => getCurrentDocumentation().getArticleById(articleId);
export const getRelatedArticles = (article) => getCurrentDocumentation().getRelatedArticles(article);
export const getArticlesByCategory = (categoryId) => getCurrentDocumentation().getArticlesByCategory(categoryId);

export default getCurrentDocumentation;
