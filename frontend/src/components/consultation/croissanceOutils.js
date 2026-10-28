// Calculs purs de la courbe de croissance (aucune dépendance, aucun effet de bord).
// Tout est tiré des mesures de l'enfant lui-même : aucune valeur de référence n'est inventée.

export const MS_JOUR = 86400000;
export const JOURS_PAR_MOIS = 30.4375;
const NBSP = ' ';

const deux = (n) => String(n).padStart(2, '0');

// Date « AAAA-MM-JJ » lue comme une date locale (évite le décalage d'un jour selon le fuseau).
export const lireDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    const s = String(v).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const cleJour = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;

// Nombre strictement positif, virgule ou point décimal ; sinon null.
export const lireNombre = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
};

export const moisEntre = (naissance, date) => (date.getTime() - naissance.getTime()) / MS_JOUR / JOURS_PAR_MOIS;

const moisComplets = (naissance, date) => {
    let m = (date.getFullYear() - naissance.getFullYear()) * 12 + (date.getMonth() - naissance.getMonth());
    if (date.getDate() < naissance.getDate()) m -= 1;
    return Math.max(0, m);
};

// « 12 jours », « 7 mois », « 4 ans 2 mois »
export const libelleAgeA = (naissance, date) => {
    const jours = Math.floor((date.getTime() - naissance.getTime()) / MS_JOUR);
    if (jours < 0) return '';
    const m = moisComplets(naissance, date);
    if (m < 1) return jours === 0 ? 'Jour de naissance' : `${jours} jour${jours > 1 ? 's' : ''}`;
    if (m < 24) return `${m} mois`;
    const ans = Math.floor(m / 12);
    const reste = m % 12;
    return reste ? `${ans} ans ${reste} mois` : `${ans} ans`;
};

export const formatNombre = (v, max = 1, min = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: max, minimumFractionDigits: min }).format(v);

// « + 0,6 » / « − 0,3 » (vrai signe moins, espace insécable)
export const formatSigne = (v, max = 1) => {
    const arrondi = Number(v.toFixed(max));
    if (arrondi === 0) return `0`;
    return `${arrondi > 0 ? '+' : '−'}${NBSP}${formatNombre(Math.abs(arrondi), max)}`;
};

export const dateCourte = (d, maintenant) => {
    const base = `${deux(d.getDate())}/${deux(d.getMonth() + 1)}`;
    return d.getFullYear() === maintenant.getFullYear() ? base : `${base}/${d.getFullYear()}`;
};
export const dateComplete = (d) => `${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()}`;

export const imc = (poids, taille) => (poids && taille ? poids / ((taille / 100) ** 2) : null);

// Enregistrements datés (un par jour) : historique du dossier + mesure du jour saisie dans le formulaire.
export const construireEnregistrements = ({ contexte, constantes, maintenant, naissance }) => {
    const parJour = new Map();
    (contexte?.mesures || []).forEach((m) => {
        const date = lireDate(m.date);
        if (!date || (naissance && date < naissance)) return;
        const cle = cleJour(date);
        const prec = parJour.get(cle) || { date, cle, jour: false };
        parJour.set(cle, {
            ...prec, date,
            poids: lireNombre(m.poids) ?? prec.poids ?? null,
            taille: lireNombre(m.taille) ?? prec.taille ?? null,
            pc: lireNombre(m.pc) ?? prec.pc ?? null,
        });
    });
    const c = constantes || {};
    const du_jour = { poids: lireNombre(c.weight), taille: lireNombre(c.height), pc: lireNombre(c.pc) };
    if (du_jour.poids || du_jour.taille || du_jour.pc) {
        const cle = cleJour(maintenant);
        const prec = parJour.get(cle) || { date: maintenant, cle };
        parJour.set(cle, {
            ...prec, date: prec.date || maintenant, jour: true,
            poids: du_jour.poids ?? prec.poids ?? null,
            taille: du_jour.taille ?? prec.taille ?? null,
            pc: du_jour.pc ?? prec.pc ?? null,
        });
    }
    return [...parJour.values()].sort((a, b) => a.date - b.date);
};

// Série d'une grandeur : points { date, x (âge en mois), y, jour, imc, libelleAge, precedent }
export const construireSerie = (enregistrements, champ, naissance) => {
    const pts = enregistrements
        .filter((e) => e[champ])
        .map((e) => ({
            date: e.date, cle: e.cle, jour: !!e.jour,
            x: moisEntre(naissance, e.date), y: e[champ],
            imc: imc(e.poids, e.taille),
            libelleAge: libelleAgeA(naissance, e.date),
        }));
    return pts.map((p, i) => ({ ...p, precedent: i > 0 ? pts[i - 1] : null }));
};

// Vitesse moyenne entre la première et la dernière mesure (par mois). null si l'intervalle est trop court.
export const vitesseMoyenne = (serie) => {
    if (serie.length < 2) return null;
    const a = serie[0];
    const b = serie[serie.length - 1];
    const mois = b.x - a.x;
    if (mois < 1) return { court: true, mois };
    return { court: false, mois, parMois: (b.y - a.y) / mois, depuis: a.date };
};

/* ----------------------------- échelles et tracé ----------------------------- */

const arrondiPropre = (v) => Number(v.toFixed(8));

// Graduations « jolies » (1, 2, 2,5, 5 × 10^n) couvrant [min, max]
export const graduationsNettes = (min, max, cible = 5) => {
    if (!(max > min)) { const c = max || 1; min = c - 0.5; max = c + 0.5; }
    const brut = (max - min) / Math.max(1, cible);
    const puissance = 10 ** Math.floor(Math.log10(brut));
    const pas = [1, 2, 5, 10].map((k) => k * puissance).find((p) => p >= brut) || 10 * puissance;
    const debut = Math.floor(min / pas) * pas;
    const fin = Math.ceil(max / pas) * pas;
    const ticks = [];
    for (let v = debut; v <= fin + pas / 1000; v += pas) ticks.push(arrondiPropre(v));
    return { ticks, bas: ticks[0], haut: ticks[ticks.length - 1], pas };
};

export const domaineY = (valeurs, cible) => {
    const mn = Math.min(...valeurs);
    const mx = Math.max(...valeurs);
    const marge = mx > mn ? (mx - mn) * 0.14 : Math.max(mx * 0.06, 0.5);
    let bas = mn - marge;
    if (bas < 0) bas = 0;
    return graduationsNettes(bas, mx + marge, cible);
};

export const domaineX = (xs) => {
    let lo = Math.min(...xs);
    let hi = Math.max(...xs);
    if (hi - lo < 1) { const c = (hi + lo) / 2; lo = c - 3; hi = c + 3; }
    const marge = Math.max((hi - lo) * 0.06, 0.4);
    lo -= marge;
    hi += marge;
    if (lo < Math.max(2, (hi - lo) * 0.15)) lo = 0;
    return [Math.max(0, lo), hi];
};

export const graduationsMois = (lo, hi, maxGrad) => {
    const pas = [1, 2, 3, 6, 12, 24, 36, 60].find((p) => (hi - lo) / p <= maxGrad) || 60;
    const ticks = [];
    for (let v = Math.ceil(lo / pas) * pas; v <= hi + 1e-9; v += pas) ticks.push(v);
    return { ticks, pas };
};

// Courbe lissée monotone (Fritsch–Carlson) : ne dépasse jamais les valeurs mesurées entre deux points.
export const cheminLisse = (pts) => {
    const n = pts.length;
    if (n === 0) return '';
    if (n === 1) return `M${pts[0].x},${pts[0].y}`;
    const f = (v) => Math.round(v * 100) / 100;
    if (n === 2) return `M${f(pts[0].x)},${f(pts[0].y)}L${f(pts[1].x)},${f(pts[1].y)}`;
    const dx = []; const pente = [];
    for (let i = 0; i < n - 1; i++) {
        dx[i] = pts[i + 1].x - pts[i].x;
        pente[i] = dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i];
    }
    const m = new Array(n);
    m[0] = pente[0];
    m[n - 1] = pente[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = pente[i - 1] * pente[i] <= 0 ? 0 : (pente[i - 1] + pente[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
        if (pente[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
        const a = m[i] / pente[i];
        const b = m[i + 1] / pente[i];
        const h = Math.hypot(a, b);
        if (h > 3) { m[i] = (3 * a / h) * pente[i]; m[i + 1] = (3 * b / h) * pente[i]; }
    }
    let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
    for (let i = 0; i < n - 1; i++) {
        const t = dx[i] / 3;
        d += `C${f(pts[i].x + t)},${f(pts[i].y + m[i] * t)} ${f(pts[i + 1].x - t)},${f(pts[i + 1].y - m[i + 1] * t)} ${f(pts[i + 1].x)},${f(pts[i + 1].y)}`;
    }
    return d;
};
