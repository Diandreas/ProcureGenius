import React from 'react';

/**
 * Frontière d'erreur globale.
 *
 * Sans elle, une erreur de rendu OU l'échec de chargement d'un chunk lazy
 * (fréquent juste après un déploiement, quand les anciens hash n'existent plus)
 * laissait un ÉCRAN BLANC total. Ici on affiche un repli propre avec un bouton
 * de rechargement.
 *
 * Volontairement en styles inline (pas de MUI/theme) : le boundary doit pouvoir
 * s'afficher même si le crash vient d'un provider de thème/contexte.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    const msg = (error && (error.message || String(error))) || '';
    // Échec de chargement d'un module dynamique (déploiement récent / offline).
    const isChunkError = /ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch/i.test(msg);
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    // Remonter à Sentry si présent (front), sinon console.
    if (typeof window !== 'undefined' && window.Sentry && window.Sentry.captureException) {
      try { window.Sentry.captureException(error, { extra: errorInfo }); } catch (_) { /* noop */ }
    }
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary a intercepté une erreur:', error, errorInfo);
  }

  handleReload = () => {
    // Sur une erreur de chunk, forcer un rechargement dur pour récupérer les
    // nouveaux assets.
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { isChunkError } = this.state;
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.emoji} aria-hidden="true">{isChunkError ? '🔄' : '⚠️'}</div>
          <h1 style={styles.title}>
            {isChunkError ? 'Une nouvelle version est disponible' : 'Une erreur est survenue'}
          </h1>
          <p style={styles.text}>
            {isChunkError
              ? "L'application a été mise à jour. Rechargez la page pour continuer."
              : "Un problème inattendu est survenu. Vous pouvez recharger la page ; si le problème persiste, réessayez plus tard."}
          </p>
          <div style={styles.actions}>
            <button style={styles.primaryBtn} onClick={this.handleReload}>
              Recharger la page
            </button>
            {!isChunkError && (
              <button style={styles.secondaryBtn} onClick={this.handleHome}>
                Retour à l'accueil
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', background: '#0b0f19', fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    maxWidth: 440, width: '100%', textAlign: 'center', background: '#141a2a',
    borderRadius: 16, padding: '40px 32px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 600, color: '#f1f5f9', margin: '0 0 12px' },
  text: { fontSize: 14, lineHeight: 1.6, color: '#94a3b8', margin: '0 0 28px' },
  actions: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn: {
    background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10,
    padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};

export default ErrorBoundary;
