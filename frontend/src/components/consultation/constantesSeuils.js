// Seuils cliniques et petites fonctions pures des constantes vitales (aucun effet de bord, aucun rendu).
// Repères ADULTE standard. Pour un enfant, seuls la température et la saturation sont interprétées : les autres
// valeurs de référence dépendent de l'âge et ne sont pas codées ici.
//
// Un « état » est { niveau, mot, critique? } :
//   niveau   normal | limite | anormal | verifier (valeur improbable : probable faute de frappe ou mauvaise unité)
//   mot      le mot affiché (jamais la couleur seule)
//   critique true pour les valeurs qui demandent une action immédiate (pastille pleine)

/** Nombre à partir de la saisie brute (accepte la virgule). null si vide ou illisible. */
export const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};

const formats = {};
/** Nombre à la française : formater(37.5, 1, 1) -> « 37,5 ». */
export const formater = (n, min = 0, max = 1) => {
    const cle = `${min}-${max}`;
    if (!formats[cle]) formats[cle] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max });
    return formats[cle].format(n);
};

const dans = (v, bas, haut) => v >= bas && v <= haut;
const etat = (niveau, mot, critique = false) => ({ niveau, mot, ...(critique ? { critique: true } : {}) });
const A_VERIFIER = etat('verifier', 'À vérifier');

/** Pas d'interprétation (poids, taille) : seulement un garde-fou contre les fautes de frappe. */
export const evaluerPlausible = (v, bas, haut) => (v === null || dans(v, bas, haut) ? null : A_VERIFIER);

export function evaluerTemperature(v) {
    if (v === null) return null;
    if (!dans(v, 25, 45)) return A_VERIFIER;
    if (v < 35) return etat('anormal', 'Hypothermie', true);
    if (v < 36.1) return etat('limite', 'Basse');
    if (v <= 37.5) return etat('normal', 'Normale');
    if (v < 38) return etat('limite', 'Fébricule');
    if (v < 40) return etat('anormal', 'Fièvre');
    return etat('anormal', 'Hyperthermie', true);
}

export function evaluerSaturation(v) {
    if (v === null) return null;
    if (!dans(v, 50, 100)) return A_VERIFIER;
    if (v >= 95) return etat('normal', 'Normale');
    if (v >= 90) return etat('limite', 'Limite');
    return etat('anormal', 'Hypoxémie', true);
}

export function evaluerFrequenceCardiaque(v) {
    if (v === null) return null;
    if (!dans(v, 20, 250)) return A_VERIFIER;
    if (v < 40) return etat('anormal', 'Bradycardie', true);
    if (v < 50) return etat('anormal', 'Bradycardie');
    if (v < 60) return etat('limite', 'Basse');
    if (v <= 100) return etat('normal', 'Normale');
    if (v <= 120) return etat('limite', 'Tachycardie');
    return etat('anormal', 'Tachycardie', v > 150);
}

export function evaluerFrequenceRespiratoire(v) {
    if (v === null) return null;
    if (!dans(v, 4, 80)) return A_VERIFIER;
    if (v < 10) return etat('anormal', 'Bradypnée');
    if (v < 12) return etat('limite', 'Basse');
    if (v <= 20) return etat('normal', 'Normale');
    if (v <= 24) return etat('limite', 'Polypnée');
    return etat('anormal', 'Polypnée', v > 30);
}

/** Glycémie en g/L, à jeun. */
export function evaluerGlycemie(v) {
    if (v === null) return null;
    if (!dans(v, 0.1, 10)) return A_VERIFIER;
    if (v < 0.54) return etat('anormal', 'Hypoglycémie', true);
    if (v < 0.7) return etat('limite', 'Basse');
    if (v <= 1.1) return etat('normal', 'Normale');
    if (v < 1.26) return etat('limite', 'Élevée');
    return etat('anormal', 'Hyperglycémie', v >= 3);
}

/**
 * Tension artérielle (classes ESC/ESH). Il faut les deux valeurs. La classe est la plus haute des deux.
 * Hypotension : TAS < 90, ou TAD < 60 avec TAS < 120 (une TAD basse isolée chez un patient à TAS élevée
 * est une pression pulsée large, pas une hypotension).
 */
export function evaluerTension(tas, tad) {
    if (tas === null || tad === null) return null;
    if (!dans(tas, 50, 300) || !dans(tad, 30, 200) || tad >= tas) return A_VERIFIER;
    if (tas < 90 || (tad < 60 && tas < 120)) return etat('anormal', 'Hypotension', tas < 70);
    const classe = (valeur, seuils) => seuils.filter((s) => valeur >= s).length; // 0..5
    const rang = Math.max(classe(tas, [120, 130, 140, 160, 180]), classe(tad, [80, 85, 90, 100, 110]));
    return [
        etat('normal', 'Optimale'),
        etat('normal', 'Normale'),
        etat('limite', 'Normale haute'),
        etat('anormal', 'HTA grade 1'),
        etat('anormal', 'HTA grade 2'),
        etat('anormal', 'HTA grade 3', true),
    ][rang];
}

/** Segments de la jauge d'IMC (classes OMS adulte) : de, à (exclu), niveau, libellé court. */
export const SEGMENTS_IMC = [
    { de: 15, a: 16, niveau: 'anormal', mot: 'Maigreur sévère' },
    { de: 16, a: 18.5, niveau: 'limite', mot: 'Insuffisance' },
    { de: 18.5, a: 25, niveau: 'normal', mot: 'Normal' },
    { de: 25, a: 30, niveau: 'limite', mot: 'Surpoids' },
    { de: 30, a: 35, niveau: 'anormal', mot: 'Obésité I' },
    { de: 35, a: 40, niveau: 'anormal', mot: 'Obésité II' },
    { de: 40, a: 45, niveau: 'anormal', mot: 'Obésité III' },
];
export const IMC_MIN = SEGMENTS_IMC[0].de;
export const IMC_MAX = SEGMENTS_IMC[SEGMENTS_IMC.length - 1].a;

export function evaluerImc(v) {
    if (v === null) return null;
    if (!dans(v, 8, 80)) return A_VERIFIER;
    const segment = [...SEGMENTS_IMC].reverse().find((s) => v >= s.de) || SEGMENTS_IMC[0];
    return etat(segment.niveau, segment.mot);
}

/** IMC à partir d'un poids (kg) et d'une taille (cm). */
export const calculerImc = (poids, taille) => (poids > 0 && taille > 0 ? poids / ((taille / 100) ** 2) : null);

/**
 * Valeurs passées d'une constante, de la plus ancienne à la plus récente.
 * `extraire(mesure)` renvoie un tableau de nombres (1 ou 2 valeurs) ou null si la visite n'a rien noté.
 */
export function serieHistorique(mesures, extraire) {
    return [...(mesures || [])]
        .filter((m) => m && m.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((m) => ({ date: m.date, valeurs: extraire(m) }))
        .filter((p) => p.valeurs && p.valeurs[0] !== null && p.valeurs[0] !== undefined);
}

/** « 08/06 », ou « 08/06/2025 » si ce n'est pas l'année en cours. */
export function dateCourte(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const jourMois = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    return d.getFullYear() === new Date().getFullYear() ? jourMois : `${jourMois}/${d.getFullYear()}`;
}

/** « 7 mois » avant deux ans, « 4 ans » ensuite. */
export const libelleAge = (age) => {
    if (!age) return '';
    if (age.ans < 2 && age.mois != null) return age.mois < 1 ? 'moins d\'un mois' : `${age.mois} mois`;
    return `${age.ans} an${age.ans > 1 ? 's' : ''}`;
};
