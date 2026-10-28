import { alpha } from '@mui/material';

// Couleurs communes à tous les schémas, tirées du thème de l'application (clair / sombre).
// Le corps est dessiné en bleu-gris neutre, volontairement sans teinte de peau : le schéma ne suppose rien du patient.
export const paletteSchema = (theme) => {
    const p = theme.palette;
    const sombre = p.mode === 'dark';
    return {
        sombre,
        // dessin
        trait: sombre ? '#a5b4c8' : '#475569',          // contour principal
        traitFin: sombre ? '#64748b' : '#94a3b8',       // détails fins (plis, côtes, nombril…)
        chair: sombre ? '#334155' : '#e8eef6',          // remplissage principal du corps
        chairClair: sombre ? '#46566d' : '#f8fafc',     // reflets, volumes éclairés
        chairOmbre: sombre ? '#27313f' : '#cbd5e1',     // ombres, volumes en retrait
        os: sombre ? '#8b9bb3' : '#d5dce8',
        // organes (teintes discrètes, lisibles dans les deux thèmes)
        coeur: sombre ? '#c0626d' : '#e08a93',
        poumon: sombre ? '#6f86ad' : '#a9c0e0',
        foie: sombre ? '#9a6a4e' : '#c99273',
        rouge: sombre ? '#d9707b' : '#e5646f',
        // zones cliquables
        zoneRepos: alpha(p.primary.main, sombre ? 0.10 : 0.07),
        zoneTrait: alpha(p.primary.main, sombre ? 0.55 : 0.40),
        zoneSurvol: alpha(p.primary.main, 0.30),
        zoneSelection: alpha(p.primary.main, 0.55),
        selectionTrait: p.primary.main,
        normal: alpha(p.success.main, sombre ? 0.50 : 0.45),
        normalTrait: p.success.main,
        anormal: alpha(p.error.main, sombre ? 0.55 : 0.50),
        anormalTrait: p.error.main,
        repere: p.warning.main,
        // texte
        texte: p.text.secondary,
        fond: p.background.paper,
    };
};

// Teintes de contrôle pour la vue « zones numérotées » des aperçus de développement
export const TEINTES_DEBUG = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080',
    '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffe119'];
