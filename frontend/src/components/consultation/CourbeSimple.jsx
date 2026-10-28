import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha, darken, lighten } from '@mui/material/styles';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

/*
 * Courbe d'évolution des mesures (SVG, sans bibliothèque).
 *
 * API historique (inchangée) :
 *   series    = [{ nom, couleur, points: [{ x: Date|number, y }] }]   (les points sans valeur sont ignorés)
 *   hauteur   = hauteur de base du dessin (px)
 *   etiquetteX(x) = formate l'axe horizontal et les infobulles
 *   unite     = ex. " mmHg"
 *   seuils    = [{ y, libelle, couleur }]   lignes de référence en pointillés
 *
 * Ajouts facultatifs :
 *   bandes    = [{ de, a, couleur, libelle }]   zones de référence colorées (de/a facultatifs = ouvert)
 *   series[].sensFavorable = 'baisse' | 'hausse'   colore la tendance (sinon neutre)
 *
 * Interactions : survol / toucher / flèches du clavier (infobulle regroupée par date), légende cliquable.
 */

const FORMES = ['rond', 'losange', 'carre', 'triangle'];
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const fmt = (v, decimales) => (decimales === undefined
    ? NOMBRE.format(v)
    : new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(v));
const valide = (p) => p && p.y !== null && p.y !== undefined && p.y !== '' && Number.isFinite(+p.y) && Number.isFinite(+p.x);
const sansEspace = (u) => String(u || '').trim();
const avecUnite = (v, unite) => `${fmt(v)}${sansEspace(unite) ? ` ${sansEspace(unite)}` : ''}`;
const largeurTexte = (t, taille = 12) => String(t).length * taille * 0.56;
const borne = (v, a, b) => Math.min(Math.max(v, a), b);

const alphaSur = (c, a) => { try { return alpha(c, a); } catch { return c; } };

// Pas « rond » (1, 2, 5 × 10^n) pour des graduations lisibles.
const pasNet = (brut) => {
    const e = Math.floor(Math.log10(brut));
    const f = brut / 10 ** e;
    const n = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;
    return n * 10 ** e;
};
const echelleNette = (lo, hi, cible) => {
    const positif = lo >= 0;
    if (hi === lo) { const p = Math.max(Math.abs(hi) * 0.08, 1); lo -= p; hi += p; }
    const marge = (hi - lo) * 0.1;
    lo -= marge; hi += marge;
    const pas = pasNet((hi - lo) / Math.max(cible - 1, 1));
    let min = Math.floor(lo / pas + 1e-9) * pas;
    const max = Math.ceil(hi / pas - 1e-9) * pas;
    if (positif && min < 0) min = 0;
    const decimales = pas >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(pas) - 1e-9));
    const graduations = [];
    for (let v = min; v <= max + pas / 1000; v += pas) graduations.push(+v.toFixed(decimales + 2));
    return { min, max, graduations, decimales };
};

// Forme du marqueur : la couleur n'est jamais le seul repère entre deux séries.
const Marque = ({ forme, cx, cy, r, fill, stroke = 'none', sw = 0 }) => {
    const commun = { fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' };
    if (forme === 'losange') {
        const d = r * 1.35;
        return <path d={`M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`} {...commun} />;
    }
    if (forme === 'carre') {
        const d = r * 0.95;
        return <rect x={cx - d} y={cy - d} width={2 * d} height={2 * d} rx={1.6} {...commun} />;
    }
    if (forme === 'triangle') {
        const d = r * 1.4;
        return <path d={`M${cx} ${cy - d}L${cx + d * 0.98} ${cy + d * 0.72}L${cx - d * 0.98} ${cy + d * 0.72}Z`} {...commun} />;
    }
    return <circle cx={cx} cy={cy} r={r} {...commun} />;
};

const Glyphe = ({ forme, couleur, taille = 16, r = 4.6 }) => (
    <svg width={taille} height={taille} viewBox="0 0 16 16" aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
        <Marque forme={forme} cx={8} cy={8} r={r} fill={couleur} />
    </svg>
);

const SR_ONLY = { position: 'absolute', width: 1, height: 1, p: 0, m: '-1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 };

const IconeTendance = ({ delta, ...rest }) => {
    const Icone = delta > 0 ? TrendingUpIcon : delta < 0 ? TrendingDownIcon : TrendingFlatIcon;
    return <Icone aria-hidden="true" {...rest} />;
};
const libelleDelta = (d) => (d === 0 ? 'stable' : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}`);

const CourbeSimple = ({ series = [], hauteur = 140, etiquetteX, unite = '', seuils = [], bandes = [] }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const idUnique = useId().replace(/[^a-zA-Z0-9_-]/g, '');

    const boite = useRef(null);
    const [largeur, setLargeur] = useState(600);
    const [masquees, setMasquees] = useState([]);
    const [actif, setActif] = useState(null);
    const svgRef = useRef(null);

    useEffect(() => {
        const el = boite.current;
        if (!el) return undefined;
        const mesurer = () => { const w = Math.round(el.clientWidth); if (w > 0) setLargeur(w); };
        mesurer();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(mesurer);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Un toucher en dehors de la courbe ferme l'infobulle (utile sur tablette / téléphone).
    useEffect(() => {
        if (actif === null) return undefined;
        const dehors = (e) => { if (boite.current && !boite.current.contains(e.target)) setActif(null); };
        document.addEventListener('pointerdown', dehors);
        return () => document.removeEventListener('pointerdown', dehors);
    }, [actif]);

    const couleurTexte = (c) => { try { return sombre ? lighten(c, 0.25) : darken(c, 0.2); } catch { return c; } };
    const parDefaut = [theme.palette.primary.main, '#D85A30', '#1D9E75', '#7C3AED'];

    const sers = useMemo(() => series.map((s, i) => {
        const couleur = s.couleur || parDefaut[i % parDefaut.length];
        const pts = (s.points || []).filter(valide).map(p => ({ x: +p.x, y: +p.y })).sort((a, b) => a.x - b.x);
        return { ...s, cle: s.nom ?? `s${i}`, couleur, texte: couleurTexte(couleur), forme: FORMES[i % FORMES.length], pts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [series, sombre]);

    const total = sers.reduce((n, s) => n + s.pts.length, 0);
    const avecPoints = sers.filter(s => s.pts.length);
    const visibles = avecPoints.filter(s => !masquees.includes(s.cle));
    const surface = theme.palette.background.paper;
    const texteSec = theme.palette.text.secondary;
    const grille = alphaSur(texteSec, sombre ? 0.2 : 0.17);
    const axe = alphaSur(texteSec, 0.4);

    const phone = largeur < 520;
    const police = phone ? 12.5 : 12;
    const H = Math.round(Math.max(hauteur, 150) * (phone ? 1.2 : 1));
    const L = largeur;
    const aEtiquette = typeof etiquetteX === 'function';
    const unitTxt = sansEspace(unite);

    // ---------- État vide ----------
    if (total === 0) {
        const hVide = Math.min(H, 132);
        return (
            <Box ref={boite} role="status" sx={{
                position: 'relative', overflow: 'hidden', minHeight: hVide, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px dashed', borderColor: sombre ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)', borderRadius: '14px',
                bgcolor: sombre ? 'rgba(255,255,255,0.02)' : 'background.subtle', px: 2, py: 2,
            }}>
                <svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    {[20, 45, 70].map(y => <line key={y} x1="0" x2="400" y1={y} y2={y} stroke={grille} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
                    <path d="M0 78 C 60 70, 90 40, 150 52 S 250 30, 300 36 S 370 18, 400 22" fill="none"
                        stroke={alphaSur(texteSec, 0.28)} strokeWidth="2" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
                </svg>
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: alphaSur(surface, 0.9), borderRadius: '12px', px: 1.5, py: 1, maxWidth: '100%' }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', flexShrink: 0, display: 'grid', placeItems: 'center',
                        bgcolor: alphaSur(theme.palette.primary.main, sombre ? 0.2 : 0.1), color: 'primary.main' }}>
                        <ShowChartIcon />
                    </Box>
                    <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Pas encore de mesure enregistrée.</Typography>
                        <Typography variant="caption" color="text.secondary">La courbe apparaîtra dès la première mesure.</Typography>
                    </Box>
                </Box>
            </Box>
        );
    }

    // ---------- Domaine ----------
    const donneesY = visibles.flatMap(s => s.pts.map(p => p.y));
    let lo = Math.min(...donneesY), hi = Math.max(...donneesY);
    const etendue = Math.max(hi - lo, Math.abs(hi) * 0.25, 10);
    const pertinent = (y) => Number.isFinite(+y) && y >= lo - etendue && y <= hi + etendue;
    const seuilsOk = (seuils || []).filter(s => s && pertinent(+s.y));
    const dataLo = lo;
    seuilsOk.forEach(s => { lo = Math.min(lo, +s.y); hi = Math.max(hi, +s.y); });
    const echelle = echelleNette(lo, hi, H < 200 ? 4 : 5);
    const { min: ymin, max: ymax } = echelle;
    // une valeur strictement positive ne doit pas descendre sous zéro
    const yvalMin = dataLo >= 0 ? Math.max(ymin, 0) : ymin;

    const xsTous = visibles.flatMap(s => s.pts.map(p => p.x));
    const xmin = Math.min(...xsTous), xmax = Math.max(...xsTous);
    const groupes = [...new Set(xsTous)].sort((a, b) => a - b);

    const etiqs = (x) => (aEtiquette ? String(etiquetteX(x)) : '');
    const largeurEtiqMax = aEtiquette ? Math.max(...[xmin, xmax].map(x => largeurTexte(etiqs(x), police))) : 0;
    const etiqsY = echelle.graduations.map(v => fmt(v, echelle.decimales));
    const G = Math.max(...etiqsY.map(t => largeurTexte(t, police))) + 12;
    const T = unitTxt ? 22 : 14;
    const B = aEtiquette ? 30 : 14;
    const largeurSeuils = Math.max(0, ...seuilsOk.map(s => (s.libelle ? largeurTexte(s.libelle, police - 1) * 1.1 + 12 : 0)));
    const D = Math.max(14, largeurEtiqMax / 2 + 2, largeurSeuils);
    const X0 = G + 12, X1 = Math.max(L - D - 12, X0 + 1);
    const px = (x) => (xmax === xmin ? (X0 + X1) / 2 : X0 + ((x - xmin) / (xmax - xmin)) * (X1 - X0));
    const py = (y) => T + (1 - (y - ymin) / (ymax - ymin || 1)) * (H - T - B);
    const bas = H - B;

    // Graduations X : autant que la largeur le permet, sans chevauchement.
    let ticksX = [];
    if (aEtiquette) {
        if (xmax === xmin) ticksX = [xmin];
        else {
            const dates = xmax > 1e11; // millisecondes : une date
            const place = largeurEtiqMax + 18;
            let n = 2;
            for (let k = 6; k >= 2; k -= 1) {
                if ((X1 - X0) / (k - 1) >= place) { n = k; break; }
            }
            if (!dates) {
                // âges, numéros… : graduations « rondes » (5, 10, 15 mois) plutôt que des valeurs arrondies de travers
                for (let k = n; k >= 2 && !ticksX.length; k -= 1) {
                    const pas = pasNet((xmax - xmin) / (k - 1));
                    const premier = Math.ceil(xmin / pas - 1e-9) * pas;
                    const liste = [];
                    for (let v = premier; v <= xmax + pas / 1000; v += pas) liste.push(+v.toFixed(6));
                    if (liste.length >= 2 && (X1 - X0) * (pas / (xmax - xmin)) >= place) ticksX = liste;
                }
            }
            if (!ticksX.length) {
                ticksX = Array.from({ length: n }, (_, i) => xmin + (i * (xmax - xmin)) / (n - 1));
                ticksX = ticksX.filter((x, i) => i === 0 || etiqs(x) !== etiqs(ticksX[i - 1]));
            }
        }
    }

    // ---------- Interaction ----------
    const trouver = (clientX) => {
        const r = svgRef.current?.getBoundingClientRect();
        if (!r || !r.width) return null;
        const lx = ((clientX - r.left) * L) / r.width;
        let meilleur = 0, d = Infinity;
        groupes.forEach((g, i) => { const dd = Math.abs(px(g) - lx); if (dd < d) { d = dd; meilleur = i; } });
        return meilleur;
    };
    const surPointeur = (e) => {
        if (e.type === 'pointermove' && e.pointerType !== 'mouse' && e.buttons === 0) return;
        const i = trouver(e.clientX);
        if (i !== null) setActif(i);
    };
    const surClavier = (e) => {
        const n = groupes.length;
        if (!n) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            setActif(a => borne((a === null ? n - 1 : a + (e.key === 'ArrowRight' ? 1 : -1)), 0, n - 1));
        } else if (e.key === 'Home') { e.preventDefault(); setActif(0); }
        else if (e.key === 'End') { e.preventDefault(); setActif(n - 1); }
        else if (e.key === 'Escape') setActif(null);
    };

    const basculer = (cle) => {
        setMasquees(m => {
            if (m.includes(cle)) return m.filter(c => c !== cle);
            if (avecPoints.filter(s => !m.includes(s.cle)).length <= 1) return m; // une courbe au moins reste affichée
            return [...m, cle];
        });
        setActif(null);
    };

    const iActif = actif !== null && actif < groupes.length ? actif : null;
    const xActif = iActif !== null ? groupes[iActif] : null;
    const lignesActif = xActif === null ? [] : visibles.map(s => {
        const k = s.pts.findIndex(p => p.x === xActif);
        if (k < 0) return null;
        return { s, p: s.pts[k], delta: k > 0 ? Math.round((s.pts[k].y - s.pts[k - 1].y) * 10) / 10 : null };
    }).filter(Boolean);

    // ---------- Étiquettes des dernières valeurs (sans chevauchement) ----------
    const hPill = 22;
    const derniers = visibles.map(s => ({ s, p: s.pts[s.pts.length - 1] })).sort((a, b) => py(a.p.y) - py(b.p.y));
    const posees = seuilsOk.filter(sl => sl.libelle).map(sl => ({ x: L - D + 4, w: largeurTexte(sl.libelle, police - 1) * 1.1 + 8, y: py(+sl.y) - 9, h: 18 }));
    const pills = derniers.map(({ s, p }) => {
        const texte = fmt(p.y);
        const w = largeurTexte(texte, police + 1) + 14;
        const cx = px(p.x), cy = py(p.y);
        const gauche = borne(cx - w / 2, 2, L - w - 2);
        const essais = [cy - 17 - hPill / 2, cy + 17 - hPill / 2, cy - 17 - hPill * 1.5 - 4, cy + 17 + hPill / 2 + 4];
        let top = essais[0];
        for (const t of essais) {
            const dedans = t >= 1 && t + hPill <= H - 1;
            const choc = posees.some(r => !(gauche + w < r.x || gauche > r.x + r.w || t + hPill < r.y || t > r.y + (r.h || hPill)));
            if (dedans && !choc) { top = t; break; }
        }
        posees.push({ x: gauche, w, y: top });
        return { s, texte, w, x: gauche, y: top, cx, cy };
    });

    // ---------- Bandes de référence ----------
    const rects = (bandes || []).map((b, i) => {
        const de = b.de === undefined || b.de === null ? -Infinity : +b.de;
        const a = b.a === undefined || b.a === null ? Infinity : +b.a;
        if (!(a > ymin) || !(de < ymax)) return null;
        const y1 = py(Math.min(a, ymax)), y2 = py(Math.max(de, yvalMin));
        const couleur = b.couleur || theme.palette.success.main;
        return { i, b, y1, y2, couleur, h: y2 - y1, texte: couleurTexte(couleur) };
    }).filter(Boolean);

    // Étiquette de chaque bande : placée là où elle gêne le moins (ni points, ni courbes, ni seuils).
    const echantillons = visibles.flatMap(sr => sr.pts.flatMap((p, i) => {
        const a = [{ x: px(p.x), y: py(p.y) }];
        if (i > 0) {
            const q = sr.pts[i - 1], n = Math.max(1, Math.ceil(Math.abs(px(p.x) - px(q.x)) / 5));
            for (let k = 1; k < n; k += 1) a.push({ x: px(q.x) + ((px(p.x) - px(q.x)) * k) / n, y: py(q.y) + ((py(p.y) - py(q.y)) * k) / n });
        }
        return a;
    }));
    rects.forEach((r) => {
        if (!r.b.libelle || r.h < 15) return;
        const w = largeurTexte(r.b.libelle, police - 1) * 1.12 + 10;
        const haut = Math.max(r.y1, T), bord = Math.min(r.y2, bas);
        const xs = [G + 8, G + (L - D - G) * 0.3 - w / 2, G + (L - D - G) * 0.55 - w / 2, L - D - 10 - w];
        const ys = bord - haut >= 32 ? [haut + 14, bord - 7] : [(haut + bord) / 2 + 4];
        let meilleur = null;
        ys.forEach((yb) => xs.forEach((xb) => {
            if (yb - 11 < haut - 2 || yb + 3 > bord + 2) return;
            const gene = echantillons.filter(e => e.x > xb - 6 && e.x < xb + w + 6 && e.y > yb - 18 && e.y < yb + 9).length
                + seuilsOk.filter(sl => Math.abs(py(+sl.y) - (yb - 4)) < 11).length * 6;
            if (!meilleur || gene < meilleur.gene) meilleur = { gene, x: xb, y: yb };
        }));
        if (meilleur) { r.lx = meilleur.x; r.ly = meilleur.y; }
    });

    // ---------- Texte d'accessibilité ----------
    const dateTxt = (x) => (aEtiquette ? etiqs(x) : '');
    const resume = avecPoints.map(s => {
        const d = s.pts[s.pts.length - 1];
        return `${s.nom} : ${s.pts.length} mesure${s.pts.length > 1 ? 's' : ''}, dernière valeur ${avecUnite(d.y, unite)}${dateTxt(d.x) ? ` (${dateTxt(d.x)})` : ''}`;
    }).join(' ; ');
    const annonce = lignesActif.length
        ? `${dateTxt(xActif) ? `${dateTxt(xActif)} : ` : ''}${lignesActif.map(l => `${l.s.nom} ${avecUnite(l.p.y, unite)}`).join(', ')}`
        : '';

    const largeurTip = Math.min(Math.max(150, 28 + Math.max(0, ...lignesActif.map(l => largeurTexte(l.s.nom, 12.5) + largeurTexte(avecUnite(l.p.y, unite), 14) * 1.12 + (l.delta === null ? 22 : 62)))), L - 8);
    const xTip = iActif !== null ? px(xActif) : 0;
    // côté libre en priorité ; sinon l'infobulle est plaquée contre le bord (elle recouvre alors le repère)
    const tipDroite = iActif !== null && !(xTip + 14 + largeurTip <= L - 4) && (xTip - 14 - largeurTip >= 4);
    const tipCoince = iActif !== null && !(xTip + 14 + largeurTip <= L - 4) && !tipDroite;
    const moyenneY = lignesActif.length ? lignesActif.reduce((n, l) => n + py(l.p.y), 0) / lignesActif.length : 0;
    const tipEnBas = moyenneY < (T + bas) / 2;
    const idArea = `aire-${idUnique}`;
    const uneSeule = visibles.length === 1 ? visibles[0] : null;
    const mesuresUniques = avecPoints.every(s => s.pts.length <= 1);

    return (
        <Box ref={boite} sx={{ width: '100%', minWidth: 0 }}>
            {/* Légende cliquable + dernière valeur + tendance */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {sers.map((s) => {
                    const cliquable = sers.filter(x => x.pts.length).length > 1 && s.pts.length > 0;
                    const masquee = masquees.includes(s.cle);
                    const dernier = s.pts[s.pts.length - 1];
                    const avant = s.pts.length > 1 ? s.pts[s.pts.length - 2] : null;
                    const delta = avant ? Math.round((dernier.y - avant.y) * 10) / 10 : null;
                    const favorable = delta === null || delta === 0 || !s.sensFavorable ? null
                        : (s.sensFavorable === 'baisse' ? delta < 0 : delta > 0);
                    const couleurTend = favorable === null ? texteSec
                        : favorable ? (sombre ? theme.palette.success.light : theme.palette.success.dark)
                            : (sombre ? theme.palette.error.light : theme.palette.error.dark);
                    const contenu = (
                        <>
                            <Box sx={{ width: 36, height: 36, borderRadius: '10px', flexShrink: 0, display: 'grid', placeItems: 'center',
                                bgcolor: masquee ? alphaSur(texteSec, 0.12) : alphaSur(s.couleur, sombre ? 0.22 : 0.12) }}>
                                <Glyphe forme={s.forme} couleur={masquee ? texteSec : s.couleur} />
                            </Box>
                            <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                                <Typography component="span" sx={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'text.secondary', lineHeight: 1.3, textDecoration: masquee ? 'line-through' : 'none' }}>
                                    {s.nom}
                                </Typography>
                                {s.pts.length === 0 ? (
                                    <Typography component="span" sx={{ display: 'block', fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>Aucune mesure</Typography>
                                ) : masquee ? (
                                    <Typography component="span" sx={{ display: 'block', fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>Masquée</Typography>
                                ) : (
                                    <>
                                        <Typography component="span" sx={{ display: 'block', lineHeight: 1.25 }}>
                                            <Box component="span" sx={{ fontSize: 19, fontWeight: 700, color: s.texte, letterSpacing: '-0.01em' }}>{fmt(dernier.y)}</Box>
                                            {unitTxt && <Box component="span" sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', ml: 0.5 }}>{unitTxt}</Box>}
                                        </Typography>
                                        <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontSize: 12, lineHeight: 1.4, color: couleurTend, fontWeight: 600 }}>
                                            {delta === null ? (
                                                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>1re mesure</Box>
                                            ) : (
                                                <>
                                                    <IconeTendance delta={delta} sx={{ fontSize: 16 }} />
                                                    {libelleDelta(delta)}
                                                    {!phone && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>depuis la précédente</Box>}
                                                </>
                                            )}
                                        </Typography>
                                    </>
                                )}
                            </Box>
                        </>
                    );
                    const style = {
                        display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 52, py: 0.75, pl: 0.875, pr: 1.5,
                        border: '1px solid', borderColor: sombre ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)', borderRadius: '10px',
                        bgcolor: 'background.paper', font: 'inherit', color: 'text.primary',
                        flex: phone ? '1 1 140px' : '0 1 auto', minWidth: 0,
                        opacity: masquee ? 0.7 : 1,
                    };
                    return cliquable ? (
                        <Box key={s.cle} component="button" type="button" onClick={() => basculer(s.cle)} aria-pressed={!masquee}
                            aria-label={`${masquee ? 'Afficher' : 'Masquer'} la courbe ${s.nom}`}
                            sx={{ ...style, cursor: 'pointer', transition: 'background-color .15s, border-color .15s',
                                '&:hover': { bgcolor: 'action.hover' },
                                '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 } }}>
                            {contenu}
                        </Box>
                    ) : (
                        <Box key={s.cle} sx={style}>{contenu}</Box>
                    );
                })}
            </Box>

            {phone && (
                <Box sx={{ minHeight: 56, mb: 0.5, display: 'flex', alignItems: 'center' }}>
                    {iActif !== null && lignesActif.length > 0 ? (
                        <Box sx={{ width: '100%', px: 1.25, py: 0.75, borderRadius: '10px', bgcolor: 'background.subtle',
                            border: '1px solid', borderColor: sombre ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)' }}>
                            {dateTxt(xActif) && <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', lineHeight: 1.4 }}>{dateTxt(xActif)}</Typography>}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.25 }}>
                                {lignesActif.map(({ s, p, delta }) => (
                                    <Box key={s.cle} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <Glyphe forme={s.forme} couleur={s.couleur} taille={14} r={4.2} />
                                        <Typography component="span" sx={{ fontSize: 12.5, color: 'text.secondary' }}>{s.nom}</Typography>
                                        <Typography component="span" sx={{ fontSize: 14, fontWeight: 700, color: s.texte }}>{avecUnite(p.y, unite)}</Typography>
                                        {delta !== null && (
                                            <Typography component="span" sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 11.5, color: 'text.secondary', fontWeight: 600 }}>
                                                <IconeTendance delta={delta} sx={{ fontSize: 14 }} />{libelleDelta(delta)}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            {avecPoints.some(s => s.pts.length > 1) ? 'Variation depuis la mesure précédente. ' : ''}Touchez la courbe pour lire une mesure.
                        </Typography>
                    )}
                </Box>
            )}

            {/* Graphique */}
            <Box
                tabIndex={0} role="group" aria-roledescription="graphique" aria-label={`Évolution des mesures. ${resume}. Flèches gauche et droite pour parcourir les mesures.`}
                onKeyDown={surClavier}
                onFocus={() => setActif(a => (a === null ? groupes.length - 1 : a))}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setActif(null); }}
                sx={{ position: 'relative', height: H, borderRadius: '10px', outline: 'none', WebkitTapHighlightColor: 'transparent',
                    '&:focus-visible': { boxShadow: `0 0 0 2px ${theme.palette.primary.main}` } }}
            >
                <svg ref={svgRef} viewBox={`0 0 ${L} ${H}`} width="100%" height={H} aria-hidden="true" focusable="false"
                    style={{ display: 'block', overflow: 'visible', fontFamily: theme.typography.fontFamily }}>
                    <defs>
                        {uneSeule && (
                            <linearGradient id={idArea} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor={uneSeule.couleur} stopOpacity={sombre ? 0.3 : 0.2} />
                                <stop offset="1" stopColor={uneSeule.couleur} stopOpacity="0" />
                            </linearGradient>
                        )}
                        <clipPath id={`zone-${idUnique}`}><rect x={G} y={T - 2} width={Math.max(L - D - G, 1)} height={bas - T + 4} /></clipPath>
                    </defs>

                    {/* bandes de référence */}
                    <g clipPath={`url(#zone-${idUnique})`}>
                        {rects.map(r => (
                            <rect key={`b${r.i}`} x={G} y={r.y1} width={Math.max(L - D - G, 0)} height={Math.max(r.h, 0)}
                                fill={alphaSur(r.couleur, sombre ? 0.13 : 0.11)} />
                        ))}
                    </g>

                    {/* quadrillage + graduations Y */}
                    {echelle.graduations.map((v, i) => (
                        <g key={v}>
                            <line x1={G} x2={L - D} y1={py(v)} y2={py(v)} stroke={i === 0 && v === ymin ? axe : grille} strokeWidth="1" />
                            <text x={G - 8} y={py(v) + police * 0.35} fontSize={police} textAnchor="end" fill={texteSec}>{etiqsY[i]}</text>
                        </g>
                    ))}
                    {unitTxt && <text x={2} y={11} fontSize={police - 1} fontWeight="600" textAnchor="start" fill={texteSec}>{unitTxt}</text>}

                    {/* libellés des bandes */}
                    {rects.map(r => r.b.libelle && r.lx !== undefined && (
                        <text key={`bl${r.i}`} x={r.lx} y={r.ly} fontSize={police - 1} fontWeight="600" fill={r.texte}>{r.b.libelle}</text>
                    ))}

                    {/* seuils */}
                    {seuilsOk.map((s, i) => {
                        const c = s.couleur || (sombre ? theme.palette.error.light : theme.palette.error.main);
                        const y = py(+s.y);
                        return (
                            <g key={`s${i}`}>
                                <line x1={G} x2={L - D} y1={y} y2={y} stroke={c} strokeWidth="1.5" strokeDasharray="5 4" />
                                {s.libelle && <text x={L - D + 6} y={y + (police - 1) * 0.36} fontSize={police - 1} fontWeight="700" textAnchor="start" fill={sombre ? lighten(c, 0.1) : darken(c, 0.15)}>{s.libelle}</text>}
                            </g>
                        );
                    })}

                    {/* axe X */}
                    <line x1={G} x2={L - D} y1={bas} y2={bas} stroke={axe} strokeWidth="1" />
                    {groupes.map(g => <line key={`r${g}`} x1={px(g)} x2={px(g)} y1={bas} y2={bas + 3} stroke={grille} strokeWidth="1.5" />)}
                    {ticksX.map((x, i) => <line key={`k${i}`} x1={px(x)} x2={px(x)} y1={bas} y2={bas + 6} stroke={axe} strokeWidth="1" />)}
                    {ticksX.map((x, i) => {
                        const cx = px(x);
                        return <text key={`t${i}`} x={cx} y={bas + 10 + police} fontSize={police} textAnchor="middle" fill={texteSec}>{etiqs(x)}</text>;
                    })}

                    {/* repère de la date active */}
                    {xActif !== null && <line x1={px(xActif)} x2={px(xActif)} y1={T - 2} y2={bas} stroke={alphaSur(texteSec, 0.55)} strokeWidth="1" strokeDasharray="3 3" />}

                    {/* courbes */}
                    {uneSeule && uneSeule.pts.length > 1 && (
                        <path d={`M${px(uneSeule.pts[0].x)} ${bas}${uneSeule.pts.map(p => `L${px(p.x)} ${py(p.y)}`).join('')}L${px(uneSeule.pts[uneSeule.pts.length - 1].x)} ${bas}Z`}
                            fill={`url(#${idArea})`} />
                    )}
                    {visibles.map(s => (
                        <g key={s.cle}>
                            {s.pts.length > 1 && (
                                <polyline fill="none" stroke={s.couleur} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                                    points={s.pts.map(p => `${px(p.x)},${py(p.y)}`).join(' ')} />
                            )}
                            {s.pts.map((p, i) => {
                                const dernier = i === s.pts.length - 1;
                                const survol = p.x === xActif;
                                return (
                                    <g key={i}>
                                        {(dernier || survol) && <circle cx={px(p.x)} cy={py(p.y)} r={dernier ? 11 : 9} fill={alphaSur(s.couleur, 0.2)} />}
                                        <Marque forme={s.forme} cx={px(p.x)} cy={py(p.y)} r={dernier ? 5.5 : survol ? 5 : 3.8} fill={s.couleur} stroke={surface} sw={2} />
                                    </g>
                                );
                            })}
                        </g>
                    ))}

                    {/* dernière valeur écrite */}
                    {pills.map(({ s, texte, w, x, y }) => (
                        <g key={`p${s.cle}`}>
                            <rect x={x} y={y} width={w} height={hPill} rx={7} fill={surface} stroke={alphaSur(s.couleur, 0.55)} strokeWidth="1" />
                            <text x={x + w / 2} y={y + hPill / 2 + (police + 1) * 0.36} fontSize={police + 1} fontWeight="700" textAnchor="middle" fill={s.texte}>{texte}</text>
                        </g>
                    ))}

                    {/* zone sensible : survol et toucher (cibles larges) */}
                    <rect x={0} y={0} width={L} height={H} fill="transparent" style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
                        onPointerMove={surPointeur} onPointerDown={surPointeur}
                        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActif(null); }} />
                </svg>

                {/* infobulle */}
                {!phone && iActif !== null && lignesActif.length > 0 && (
                    <Box aria-hidden="true" sx={{
                        position: 'absolute', zIndex: 2, pointerEvents: 'none',
                        ...(tipCoince ? { right: 4 } : tipDroite ? { right: L - xTip + 14 } : { left: xTip + 14 }), whiteSpace: 'nowrap',
                        ...(tipEnBas ? { bottom: B + 8 } : { top: T + 4 }),
                        minWidth: 150, maxWidth: Math.max(L - 24, 150), px: 1.5, py: 1, borderRadius: '10px',
                        bgcolor: surface, color: 'text.primary',
                        border: '1px solid', borderColor: sombre ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.12)',
                        boxShadow: sombre ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(15,23,42,0.16)',
                    }}>
                        {dateTxt(xActif) && <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{dateTxt(xActif)}</Typography>}
                        {lignesActif.map(({ s, p, delta }) => (
                            <Box key={s.cle} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
                                <Glyphe forme={s.forme} couleur={s.couleur} taille={14} r={4.2} />
                                <Typography component="span" sx={{ fontSize: 12.5, color: 'text.secondary', mr: 'auto', pr: 1 }}>{s.nom}</Typography>
                                <Typography component="span" sx={{ fontSize: 14, fontWeight: 700, color: s.texte }}>{avecUnite(p.y, unite)}</Typography>
                                {delta !== null && (
                                    <Typography component="span" sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 11.5, color: 'text.secondary', fontWeight: 600, ml: 0.5 }}>
                                        <IconeTendance delta={delta} sx={{ fontSize: 14 }} />{delta === 0 ? '0' : libelleDelta(delta)}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                    </Box>
                )}

                <Box sx={SR_ONLY} aria-live="polite" role="status">{annonce}</Box>
            </Box>

            {/* repères des bandes */}
            {rects.some(r => r.b.libelle) && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, columnGap: 2, mt: 0.75 }}>
                    {rects.filter(r => r.b.libelle).map(r => {
                        const { de, a } = r.b;
                        const plage = (de ?? null) !== null && (a ?? null) !== null ? `${fmt(+de)} à ${fmt(+a)}`
                            : (a ?? null) !== null ? `jusqu'à ${fmt(+a)}` : (de ?? null) !== null ? `à partir de ${fmt(+de)}` : '';
                        return (
                            <Typography key={r.i} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: 'text.secondary' }}>
                                <Box component="span" sx={{ width: 14, height: 10, borderRadius: '3px', bgcolor: alphaSur(r.couleur, sombre ? 0.35 : 0.28), border: `1px solid ${alphaSur(r.couleur, 0.7)}` }} />
                                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>{r.b.libelle}</Box>
                                {plage && <span>({plage}{unitTxt ? ` ${unitTxt}` : ''})</span>}
                            </Typography>
                        );
                    })}
                </Box>
            )}

            {mesuresUniques && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    Une seule mesure pour l'instant : la courbe se dessinera dès la prochaine.
                </Typography>
            )}

            {/* alternative textuelle complète pour les lecteurs d'écran */}
            <Box component="ul" sx={SR_ONLY}>
                {avecPoints.flatMap(s => s.pts.map((p, i) => (
                    <li key={`${s.cle}${i}`}>{`${s.nom} : ${avecUnite(p.y, unite)}${dateTxt(p.x) ? `, ${dateTxt(p.x)}` : ''}`}</li>
                )))}
            </Box>
        </Box>
    );
};

export default CourbeSimple;
