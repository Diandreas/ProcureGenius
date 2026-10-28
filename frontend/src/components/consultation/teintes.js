// Couleurs d'accent partagées par les primitives visuelles de la consultation (SectionCarte, Pastilles).
// Une teinte donne : `main` (couleur vive, pour les bordures / tuiles / focus), `texte` (version assez
// foncée en clair, assez claire en sombre pour rester lisible sur un lavis de la même teinte) et
// `surCouleur` (couleur du pictogramme posé sur un aplat de `texte`).
const TEXTE_CLAIR = {
    primary: '#1d4ed8',
    success: '#047857',
    warning: '#b45309',
    error: '#b91c1c',
    info: '#1d4ed8',
    secondary: '#334155',
};

export const accentDe = (theme, teinte = 'primary') => {
    const palette = theme.palette[teinte] || theme.palette.primary;
    const sombre = theme.palette.mode === 'dark';
    return {
        main: palette.main,
        texte: sombre ? palette.light : (TEXTE_CLAIR[teinte] || palette.dark),
        surCouleur: sombre ? '#0f172a' : '#ffffff',
    };
};
