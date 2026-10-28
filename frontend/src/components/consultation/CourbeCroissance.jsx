import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, ButtonBase, Button, Collapse, Typography, alpha, useTheme } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import MonitorWeightOutlined from '@mui/icons-material/MonitorWeightOutlined';
import HeightOutlined from '@mui/icons-material/HeightOutlined';
import FaceOutlined from '@mui/icons-material/FaceOutlined';
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';
import TrendingFlat from '@mui/icons-material/TrendingFlat';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import ScaleOutlined from '@mui/icons-material/ScaleOutlined';
import ExpandMore from '@mui/icons-material/ExpandMore';
import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import {
    lireDate, construireEnregistrements, construireSerie, vitesseMoyenne, formatNombre, formatSigne,
    dateCourte, dateComplete, domaineX, domaineY, graduationsMois, cheminLisse, moisEntre, imc as calculImc,
} from './croissanceOutils';

// Courbes de croissance de l'enfant, tracées UNIQUEMENT d'après ses propres mesures (aucune courbe de référence).
// Autonome : SVG maison, aucun appel réseau, aucune dépendance au reste du module consultation.
//
// Props : { contexte, constantes: { weight, height, pc }, age: { mois, ans } | null }
// Facultatives : maintenant (Date, pour les aperçus), onglet (onglet initial), detailOuvert, animer.

const NBSP = ' ';
const SEUIL_COMPACT = 540;
const AGE_MAX_PC_MOIS = 36;

const GRANDEURS = {
    poids: {
        id: 'poids', libelle: 'Poids', champ: 'poids', unite: 'kg', decimales: 2, icone: MonitorWeightOutlined,
        vitesse: { unite: 'g/mois', facteur: 1000, decimales: 0 },
        conseil: 'Saisissez le poids de l\'enfant dans l\'onglet Vitals : la courbe se dessine dès la première mesure.',
    },
    taille: {
        id: 'taille', libelle: 'Taille', champ: 'taille', unite: 'cm', decimales: 1, icone: HeightOutlined,
        vitesse: { unite: 'cm/mois', facteur: 1, decimales: 1 },
        conseil: 'Saisissez la taille de l\'enfant dans l\'onglet Vitals : la courbe se dessine dès la première mesure.',
    },
    pc: {
        id: 'pc', libelle: 'Périmètre crânien', champ: 'pc', unite: 'cm', decimales: 1, icone: FaceOutlined,
        vitesse: { unite: 'cm/mois', facteur: 1, decimales: 1 },
        conseil: 'Renseignez le périmètre crânien de l\'enfant : la courbe se dessine dès la première mesure.',
    },
};

// Une couleur par grandeur ; jamais la seule information (étiquettes, valeurs et icônes les accompagnent).
const COULEURS = {
    light: {
        poids: { ligne: '#2563eb', texte: '#1d4ed8', fond: '#2563eb', surFond: '#ffffff' },
        taille: { ligne: '#059669', texte: '#047857', fond: '#047857', surFond: '#ffffff' },
        pc: { ligne: '#7c3aed', texte: '#6d28d9', fond: '#6d28d9', surFond: '#ffffff' },
    },
    dark: {
        poids: { ligne: '#60a5fa', texte: '#93c5fd', fond: '#60a5fa', surFond: '#0b1220' },
        taille: { ligne: '#34d399', texte: '#6ee7b7', fond: '#34d399', surFond: '#06251b' },
        pc: { ligne: '#a78bfa', texte: '#c4b5fd', fond: '#a78bfa', surFond: '#1a1033' },
    },
};

const tracer = keyframes`from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; }`;
const apparaitre = keyframes`from { opacity: 0; } to { opacity: 1; }`;

/* ------------------------------ petits éléments ------------------------------ */

const TuileIcone = ({ Icone, couleur, taille = 36, rayon = 10 }) => (
    <Box
        aria-hidden="true"
        sx={{
            width: taille, height: taille, borderRadius: `${rayon}px`, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(couleur, 0.12), color: couleur,
        }}
    >
        <Icone sx={{ fontSize: taille * 0.56 }} />
    </Box>
);

const Onglets = ({ items, actif, onChange, compact, idBase, accents }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const refs = useRef([]);
    const auClavier = (e, i) => {
        let n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % items.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = items.length - 1;
        if (n === null) return;
        e.preventDefault();
        onChange(items[n].id);
        refs.current[n]?.focus();
    };
    return (
        <Box
            role="tablist"
            aria-label="Grandeur à afficher"
            sx={{
                display: 'flex', gap: '2px', p: '3px', borderRadius: '12px',
                bgcolor: sombre ? '#161b22' : '#eef1f6',
                border: '1px solid', borderColor: 'divider',
                width: compact ? '100%' : 'auto',
            }}
        >
            {items.map((it, i) => {
                const choisi = it.id === actif;
                const Icone = it.icone;
                return (
                    <ButtonBase
                        key={it.id}
                        ref={(el) => { refs.current[i] = el; }}
                        role="tab"
                        id={`${idBase}-onglet-${it.id}`}
                        aria-selected={choisi}
                        aria-controls={`${idBase}-panneau`}
                        tabIndex={choisi ? 0 : -1}
                        onClick={() => onChange(it.id)}
                        onKeyDown={(e) => auClavier(e, i)}
                        sx={{
                            minHeight: 38, px: compact ? 1 : 1.75, borderRadius: '9px', gap: 0.75,
                            flex: compact ? '1 1 auto' : '0 0 auto', justifyContent: 'center',
                            fontFamily: 'inherit', fontSize: '0.8125rem', whiteSpace: 'nowrap',
                            fontWeight: choisi ? 700 : 500,
                            color: choisi ? 'text.primary' : 'text.secondary',
                            bgcolor: choisi ? (sombre ? '#2a3342' : '#ffffff') : 'transparent',
                            boxShadow: choisi ? (sombre ? '0 1px 2px rgba(0,0,0,.4)' : '0 1px 2px rgba(15,23,42,.08), 0 1px 3px rgba(15,23,42,.08)') : 'none',
                            transition: 'background-color .15s ease, color .15s ease',
                            '&:hover': { bgcolor: choisi ? undefined : 'action.hover', color: 'text.primary' },
                            '&.Mui-focusVisible': { outline: '2px solid', outlineColor: accents[it.id], outlineOffset: 1 },
                        }}
                    >
                        {!compact && <Icone sx={{ fontSize: 18, color: choisi ? accents[it.id] : 'inherit' }} />}
                        {it.libelle}
                    </ButtonBase>
                );
            })}
        </Box>
    );
};

const Indicateur = ({ Icone, couleur, libelle, valeur, unite, sous, attenue = false, pleine = false, compact = false }) => (
    <Box
        role="group"
        aria-label={libelle}
        sx={{
            minWidth: 0, p: compact ? 1.25 : 1.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider',
            bgcolor: (t) => (t.palette.mode === 'dark' ? '#222a36' : '#f8fafc'),
            gridColumn: pleine ? '1 / -1' : 'auto',
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 0.75 : 1, mb: 0.75 }}>
            <TuileIcone Icone={Icone} couleur={couleur} taille={compact ? 28 : 30} rayon={9} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', lineHeight: 1.25, minWidth: 0 }}>{libelle}</Typography>
        </Box>
        <Typography component="div" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.15, fontWeight: 700, fontSize: '1.375rem', color: attenue ? 'text.disabled' : couleur, letterSpacing: '-0.01em' }}>
            {valeur}
            {unite && <Box component="span" sx={{ ml: 0.5, fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary', letterSpacing: 0 }}>{unite}</Box>}
        </Typography>
        {sous && <Typography sx={{ mt: 0.5, fontSize: '0.75rem', lineHeight: 1.4, color: 'text.secondary' }}>{sous}</Typography>}
    </Box>
);

/* ------------------------------ graphique SVG ------------------------------ */

const Graphique = ({ points, g, couleurs, largeur, hauteur, animer, titre, maintenant, pointInitial }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const uid = useId().replace(/:/g, '');
    const [actif, setActif] = useState(pointInitial ?? null);
    const compact = largeur < SEUIL_COMPACT;

    const marge = { g: compact ? 40 : 48, d: compact ? 14 : 20, h: 34, b: 58 };
    const iw = Math.max(80, largeur - marge.g - marge.d);
    const ih = Math.max(80, hauteur - marge.h - marge.b);

    const geo = useMemo(() => {
        const [x0, x1] = domaineX(points.map((p) => p.x));
        const dy = domaineY(points.map((p) => p.y), compact ? 4 : 5);
        const gm = graduationsMois(x0, x1, Math.max(3, Math.floor(iw / 78)));
        const px = (x) => marge.g + ((x - x0) / (x1 - x0)) * iw;
        const py = (y) => marge.h + (1 - (y - dy.bas) / (dy.haut - dy.bas)) * ih;
        const xy = points.map((p) => ({ ...p, cx: px(p.x), cy: py(p.y) }));
        return { x0, x1, dy, gm, px, py, xy };
    }, [points, iw, ih, compact, marge.g, marge.h]);

    const { xy, dy, gm, py, px } = geo;
    const base = marge.h + ih;
    const dernier = xy[xy.length - 1];
    const chemin = cheminLisse(xy.map((p) => ({ x: p.cx, y: p.cy })));
    const aire = xy.length > 1 ? `${chemin}L${dernier.cx},${base}L${xy[0].cx},${base}Z` : '';

    const decimalesAxe = dy.pas >= 1 ? 0 : (dy.pas < 0.1 ? 2 : 1);
    const fmtValeur = (v) => formatNombre(v, g.decimales);
    const trait = sombre ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)';
    const traitAxe = sombre ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.28)';
    const texteDoux = theme.palette.text.secondary;
    const surface = theme.palette.background.paper;

    // pastille de la dernière valeur : au-dessus du point, ou en dessous si elle masquerait un autre point
    const texteDernier = `${fmtValeur(dernier.y)}${NBSP}${g.unite}`;
    const lp = texteDernier.length * 7.6 + 20;
    const pastilleX = Math.min(Math.max(dernier.cx - lp / 2, 4), largeur - lp - 4);
    const masque = (y) => xy.slice(0, -1).some((p) => p.cx > pastilleX - 12 && p.cx < pastilleX + lp + 12 && p.cy > y - 12 && p.cy < y + 26 + 12);
    let pastilleY = dernier.cy - 44;
    if (pastilleY < 2 || masque(pastilleY)) {
        const dessous = dernier.cy + 20;
        if (dessous + 26 < hauteur - marge.b + 8 && !masque(dessous)) pastilleY = dessous;
        else if (pastilleY < 2) pastilleY = dessous;
    }

    // étiquettes de valeur au-dessus des points quand il y a la place
    const espaceMin = xy.length > 1 ? Math.min(...xy.slice(1).map((p, i) => p.cx - xy[i].cx)) : 999;
    const toutEtiqueter = xy.length <= 12 && espaceMin >= 40;
    const etiquetee = (i) => {
        if (i === xy.length - 1) return false;
        const p = xy[i];
        if (p.cx > pastilleX - 16 && p.cx < pastilleX + lp + 16 && p.cy - 24 < pastilleY + 26 && p.cy > pastilleY - 4) return false;
        if (toutEtiqueter) return true;
        return i === 0 && xy.length > 1 && xy[1].cx - xy[0].cx > 70;
    };

    const choisirProche = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        let meilleur = null; let dmin = e.pointerType === 'touch' ? 46 : 38;
        xy.forEach((p, i) => {
            const d = Math.hypot(p.cx - mx, p.cy - my);
            if (d < dmin) { dmin = d; meilleur = i; }
        });
        setActif(meilleur);
    };

    const pCible = actif !== null ? xy[actif] : null;
    const largeurInfo = Math.min(214, largeur - 8);
    const infoGauche = pCible ? Math.min(Math.max(pCible.cx - largeurInfo / 2, 4), largeur - largeurInfo - 4) : 0;
    const infoEnDessous = pCible ? pCible.cy < 150 : false;

    const libelleAxeY = `${g.libelle} (${g.unite})`;

    return (
        <Box sx={{ position: 'relative', width: largeur, height: hauteur, maxWidth: '100%' }}>
            <svg
                width={largeur}
                height={hauteur}
                viewBox={`0 0 ${largeur} ${hauteur}`}
                role="group"
                aria-label={`${titre}. Survolez ou sélectionnez un point pour lire la mesure.`}
                style={{ display: 'block', touchAction: 'pan-y', overflow: 'visible' }}
                onPointerMove={(e) => { if (e.pointerType !== 'touch') choisirProche(e); }}
                onPointerDown={choisirProche}
                onPointerLeave={(e) => { if (e.pointerType !== 'touch') setActif(null); }}
            >
                <defs>
                    <linearGradient id={`${uid}-aire`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={couleurs.ligne} stopOpacity={sombre ? 0.32 : 0.22} />
                        <stop offset="100%" stopColor={couleurs.ligne} stopOpacity="0" />
                    </linearGradient>
                    <clipPath id={`${uid}-zone`}>
                        <rect x={marge.g - 2} y={marge.h - 14} width={iw + marge.d + 2} height={ih + 14 + 2} />
                    </clipPath>
                </defs>

                {/* grille et graduations Y */}
                <text x={4} y={16} fontSize="12" fontWeight="600" fill={texteDoux}>{libelleAxeY}</text>
                {dy.ticks.map((v) => (
                    <g key={v}>
                        <line x1={marge.g} x2={marge.g + iw} y1={py(v)} y2={py(v)} stroke={v === dy.bas ? traitAxe : trait} strokeWidth="1" strokeDasharray={v === dy.bas ? undefined : '3 4'} />
                        <text x={marge.g - 8} y={py(v) + 4} textAnchor="end" fontSize="12" fill={texteDoux} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNombre(v, decimalesAxe)}</text>
                    </g>
                ))}
                {/* graduations X (âge en mois) */}
                {gm.ticks.map((m) => (
                    <g key={m}>
                        <line x1={px(m)} x2={px(m)} y1={base} y2={base + 5} stroke={traitAxe} />
                        <text x={px(m)} y={base + 20} textAnchor="middle" fontSize="12" fill={texteDoux} style={{ fontVariantNumeric: 'tabular-nums' }}>{m}</text>
                        {m > 0 && m % 12 === 0 && (
                            <text x={px(m)} y={base + 34} textAnchor="middle" fontSize="11" fontWeight="600" fill={couleurs.texte}>{m / 12 === 1 ? '1 an' : `${m / 12} ans`}</text>
                        )}
                    </g>
                ))}
                <text x={marge.g + iw / 2} y={hauteur - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill={texteDoux}>Âge (mois)</text>

                {/* repère de la dernière mesure */}
                <line x1={dernier.cx} x2={dernier.cx} y1={dernier.cy} y2={base} stroke={couleurs.ligne} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 4" />

                <g clipPath={`url(#${uid}-zone)`}>
                    {aire && <Box component="path" d={aire} fill={`url(#${uid}-aire)`} sx={animer ? { animation: `${apparaitre} .6s ease-out both` } : undefined} />}
                    {xy.length > 1 && (
                        <Box
                            component="path" d={chemin} pathLength="1" fill="none" stroke={couleurs.ligne} strokeWidth="3"
                            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1"
                            sx={animer ? { animation: `${tracer} .7s ease-out both`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } } : undefined}
                        />
                    )}
                </g>

                {/* étiquettes de valeur (contour de la couleur de fond : lisibles par-dessus la courbe) */}
                {xy.map((p, i) => (etiquetee(i) ? (
                    <text
                        key={`e${i}`} x={p.cx} y={p.cy - 13} textAnchor="middle" fontSize="12" fontWeight="600" fill={theme.palette.text.primary}
                        stroke={surface} strokeWidth="4" paintOrder="stroke" strokeLinejoin="round" style={{ fontVariantNumeric: 'tabular-nums' }}
                        aria-hidden="true"
                    >{fmtValeur(p.y)}</text>
                ) : null))}

                {/* points : cibles tactiles de 36 px, atteignables au clavier */}
                {xy.map((p, i) => {
                    const est_dernier = i === xy.length - 1;
                    const survol = actif === i;
                    const nom = `${g.libelle} ${fmtValeur(p.y)} ${g.unite}, ${p.jour ? 'mesure du jour' : `le ${dateComplete(p.date)}`}, à ${p.libelleAge}`;
                    return (
                        <Box
                            component="g" key={p.cle} tabIndex={0} role="button" aria-label={nom}
                            onFocus={() => setActif(i)} onBlur={() => setActif((a) => (a === i ? null : a))}
                            onKeyDown={(e) => { if (e.key === 'Escape') setActif(null); }}
                            sx={{ outline: 'none', cursor: 'pointer', '&:focus-visible .anneau': { opacity: 1 } }}
                        >
                            <circle className="anneau" cx={p.cx} cy={p.cy} r={est_dernier ? 15 : 11} fill="none" stroke={couleurs.ligne} strokeWidth="2" opacity="0" />
                            {est_dernier && <circle cx={p.cx} cy={p.cy} r={survol ? 17 : 14} fill={couleurs.ligne} fillOpacity={sombre ? 0.28 : 0.2} />}
                            <circle
                                cx={p.cx} cy={p.cy}
                                r={est_dernier ? 7.5 : (survol ? 6.5 : 5)}
                                fill={est_dernier ? couleurs.ligne : surface}
                                stroke={est_dernier ? surface : couleurs.ligne} strokeWidth={est_dernier ? 3 : 2.5}
                            />
                            <circle cx={p.cx} cy={p.cy} r="18" fill="transparent" />
                        </Box>
                    );
                })}

                {/* pastille de la dernière valeur */}
                <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
                    <rect x={pastilleX} y={pastilleY} width={lp} height={26} rx="13" fill={couleurs.fond} />
                    <text x={pastilleX + lp / 2} y={pastilleY + 17.5} textAnchor="middle" fontSize="13" fontWeight="700" fill={couleurs.surFond} style={{ fontVariantNumeric: 'tabular-nums' }}>{texteDernier}</text>
                </g>
            </svg>

            {pCible && (
                <Box
                    role="status"
                    sx={{
                        position: 'absolute', left: infoGauche, width: largeurInfo, pointerEvents: 'none', zIndex: 2,
                        ...(infoEnDessous ? { top: pCible.cy + 26 } : { bottom: hauteur - pCible.cy + 26 }),
                        px: 1.5, py: 1.25, borderRadius: '10px', boxShadow: 4,
                        bgcolor: sombre ? '#f1f5f9' : '#1e293b', color: sombre ? '#0f172a' : '#f8fafc',
                    }}
                >
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.85, lineHeight: 1.3 }}>
                        {pCible.jour ? 'Mesure du jour' : dateComplete(pCible.date)}{' · '}{pCible.libelleAge}
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.25, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtValeur(pCible.y)}<Box component="span" sx={{ fontSize: '0.8125rem', fontWeight: 600, ml: 0.5 }}>{g.unite}</Box>
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.35, opacity: 0.9 }}>
                        {pCible.precedent
                            ? `${formatSigne(pCible.y - pCible.precedent.y, g.decimales)}${NBSP}${g.unite} depuis le ${dateCourte(pCible.precedent.date, maintenant)}`
                            : 'Première mesure'}
                    </Typography>
                    {pCible.imc && g.id !== 'pc' && (
                        <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.35, opacity: 0.9 }}>IMC{NBSP}: {formatNombre(pCible.imc, 1, 1)}{NBSP}kg/m²</Typography>
                    )}
                </Box>
            )}
        </Box>
    );
};

/* ------------------------------ états vides ------------------------------ */

const EtatVide = ({ Icone, couleur, titre, texte, fantome = true, largeur }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const trait = sombre ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.13)';
    return (
        <Box
            sx={{
                position: 'relative', overflow: 'hidden', borderRadius: '12px', border: '1px dashed', borderColor: sombre ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)',
                minHeight: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2, py: 3,
                bgcolor: sombre ? '#222a36' : '#f8fafc',
            }}
        >
            {fantome && (
                <svg aria-hidden="true" viewBox="0 0 400 180" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: sombre ? 0.9 : 1 }}>
                    {[40, 80, 120, 160].map((y) => <line key={y} x1="0" x2="400" y1={y} y2={y} stroke={trait} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />)}
                    <path d="M20,150 C90,138 130,110 190,92 C250,74 300,58 380,30" fill="none" stroke={trait} strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
            )}
            <Box sx={{ position: 'relative', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderRadius: '12px', bgcolor: sombre ? 'rgba(34,42,54,0.92)' : 'rgba(248,250,252,0.94)' }}>
                <TuileIcone Icone={Icone} couleur={couleur} taille={48} rayon={14} />
                <Typography component="p" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.35, color: 'text.primary' }}>{titre}</Typography>
                <Typography component="p" sx={{ fontSize: '0.8125rem', lineHeight: 1.55, color: 'text.secondary' }}>{texte}</Typography>
            </Box>
        </Box>
    );
};

/* ------------------------------ composant principal ------------------------------ */

const CourbeCroissance = ({ contexte, constantes, age, maintenant: maintenantProp, onglet: ongletInitial, detailOuvert = false, animer = true, pointInitial }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const idBase = useId().replace(/:/g, '');
    const racine = useRef(null);
    const [largeurRacine, setLargeurRacine] = useState(720);
    const [onglet, setOnglet] = useState(ongletInitial || 'poids');
    const [detail, setDetail] = useState(!!detailOuvert);
    const maintenant = useMemo(() => maintenantProp || new Date(), [maintenantProp]);

    useLayoutEffect(() => {
        const el = racine.current;
        if (!el) return undefined;
        const mesurer = () => setLargeurRacine(Math.round(el.getBoundingClientRect().width));
        mesurer();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const obs = new ResizeObserver(mesurer);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const compact = largeurRacine < SEUIL_COMPACT;
    const rembourrage = compact ? 16 : 24;
    const largeurGraphique = Math.max(240, largeurRacine - 2 * rembourrage - 2);

    const naissance = useMemo(() => lireDate(contexte?.patient?.date_naissance), [contexte?.patient?.date_naissance]);
    const moisAge = age?.mois ?? (naissance ? Math.floor(moisEntre(naissance, maintenant)) : null);

    const enregistrements = useMemo(
        () => (naissance ? construireEnregistrements({ contexte, constantes, maintenant, naissance }) : []),
        [contexte, constantes, maintenant, naissance],
    );
    const series = useMemo(() => ({
        poids: naissance ? construireSerie(enregistrements, 'poids', naissance) : [],
        taille: naissance ? construireSerie(enregistrements, 'taille', naissance) : [],
        pc: naissance ? construireSerie(enregistrements, 'pc', naissance) : [],
    }), [enregistrements, naissance]);

    const grandeursVisibles = useMemo(
        () => [GRANDEURS.poids, GRANDEURS.taille, ...(moisAge !== null && moisAge < AGE_MAX_PC_MOIS ? [GRANDEURS.pc] : [])],
        [moisAge],
    );
    const actifId = grandeursVisibles.some((g) => g.id === onglet) ? onglet : 'poids';
    const g = GRANDEURS[actifId];
    const serie = series[actifId];
    const couleurs = COULEURS[sombre ? 'dark' : 'light'];
    const accents = Object.fromEntries(Object.keys(couleurs).map((k) => [k, couleurs[k].ligne]));
    const c = couleurs[actifId];
    const aucuneMesure = !series.poids.length && !series.taille.length && !series.pc.length;

    const onglets = grandeursVisibles.map((x) => ({ id: x.id, libelle: x.libelle, icone: x.icone }));
    const derniere = serie[serie.length - 1];
    const precedente = derniere?.precedent || null;
    const vitesse = vitesseMoyenne(serie);
    const dernierImc = [...enregistrements].reverse().find((e) => e.poids && e.taille);
    const valeurImc = dernierImc ? calculImc(dernierImc.poids, dernierImc.taille) : null;
    const fmt = (v) => formatNombre(v, g.decimales);

    const sousTitre = !naissance
        ? 'Âge de l\'enfant inconnu'
        : serie.length
            ? `${serie.length} mesure${serie.length > 1 ? 's' : ''} de l'enfant · ${serie.length > 1 ? `du ${dateCourte(serie[0].date, maintenant)} au ${dateCourte(derniere.date, maintenant)}` : `le ${dateCourte(derniere.date, maintenant)}`}`
            : 'D\'après les mesures de l\'enfant';

    // variation
    let variation = { valeur: '—', sous: 'Première mesure : la variation apparaîtra à la prochaine.', Icone: TrendingFlat, couleur: theme.palette.text.secondary, attenue: true };
    if (derniere && precedente) {
        const delta = derniere.y - precedente.y;
        const baisse = delta < 0;
        const mois = derniere.x - precedente.x;
        variation = {
            valeur: formatSigne(delta, g.decimales),
            unite: g.unite,
            sous: `depuis le ${dateCourte(precedente.date, maintenant)}${mois >= 0.3 ? ` · ${formatNombre(mois, mois < 3 ? 1 : 0)} mois` : ''}${baisse ? ` · en baisse${actifId === 'poids' ? '' : ' : à vérifier'}` : ''}`,
            Icone: delta === 0 ? TrendingFlat : (baisse ? TrendingDown : TrendingUp),
            couleur: baisse ? (sombre ? '#fbbf24' : '#b45309') : c.texte,
            attenue: false,
        };
    }
    // vitesse moyenne
    let vit = { valeur: '—', sous: 'Au moins deux mesures espacées d\'un mois sont nécessaires.', attenue: true };
    if (vitesse && !vitesse.court) {
        const v = vitesse.parMois * g.vitesse.facteur;
        vit = {
            valeur: formatSigne(v, g.vitesse.decimales), unite: g.vitesse.unite,
            sous: `en moyenne, sur ${formatNombre(vitesse.mois, vitesse.mois < 10 ? 1 : 0)} mois`,
            attenue: false,
        };
    } else if (vitesse?.court) {
        vit = { valeur: '—', sous: 'Mesures trop rapprochées (moins d\'un mois) pour une vitesse fiable.', attenue: true };
    }

    const montrerImc = actifId !== 'pc';
    const nbTuiles = montrerImc ? 4 : 3;
    const lignesDetail = [...serie].reverse();
    const montrerColImc = !compact && montrerImc && serie.some((p) => p.imc);

    const titreGraphique = serie.length
        ? `Courbe de ${g.libelle.toLowerCase()} : ${serie.length} mesure${serie.length > 1 ? 's' : ''}, de ${fmt(serie[0].y)} à ${fmt(derniere.y)} ${g.unite}`
        : '';

    return (
        <Box
            ref={racine}
            component="section"
            aria-label="Courbes de croissance de l'enfant"
            sx={{
                width: '100%', minWidth: 0, boxSizing: 'border-box', p: `${rembourrage}px`, borderRadius: '14px',
                bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 1,
            }}
        >
            {/* En-tête */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <TuileIcone Icone={ShowChartOutlined} couleur={c.texte} taille={40} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3, color: 'text.primary' }}>Courbes de croissance</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.4 }}>{sousTitre}</Typography>
                    </Box>
                </Box>
                {naissance && !compact && <Onglets items={onglets} actif={actifId} onChange={setOnglet} compact={false} idBase={idBase} accents={accents} />}
            </Box>
            {naissance && compact && (
                <Box sx={{ mb: 2 }}><Onglets items={onglets} actif={actifId} onChange={setOnglet} compact idBase={idBase} accents={accents} /></Box>
            )}

            <Box id={`${idBase}-panneau`} role="tabpanel" aria-labelledby={`${idBase}-onglet-${actifId}`}>
                {!naissance ? (
                    <EtatVide
                        Icone={EventBusyOutlined} couleur={sombre ? '#fbbf24' : '#b45309'}
                        titre="Date de naissance absente du dossier"
                        texte="Sans la date de naissance, l'âge de l'enfant et sa courbe de croissance ne peuvent pas être calculés. Complétez la fiche du patient."
                        fantome={false}
                    />
                ) : aucuneMesure ? (
                    <EtatVide
                        Icone={ShowChartOutlined} couleur={c.texte} titre="Aucune mesure enregistrée"
                        texte="Le poids, la taille et le périmètre crânien de l'enfant, relevés lors des consultations, tracent ici sa courbe de croissance. Dès la première mesure saisie, un point apparaît."
                    />
                ) : !serie.length ? (
                    <EtatVide
                        Icone={g.icone} couleur={c.texte} titre={`Aucune mesure de ${g.libelle.toLowerCase()} enregistrée`}
                        texte={g.conseil}
                    />
                ) : (
                    <>
                        <Box sx={{ display: 'grid', gap: 1.25, mb: 2, gridTemplateColumns: compact ? '1fr 1fr' : `repeat(${nbTuiles}, minmax(0, 1fr))` }}>
                            <Indicateur compact={compact}
                                Icone={g.icone} couleur={c.texte} libelle="Dernière mesure" valeur={fmt(derniere.y)} unite={g.unite}
                                sous={`${derniere.jour ? 'Mesure du jour' : dateCourte(derniere.date, maintenant)} · ${derniere.libelleAge}`}
                            />
                            <Indicateur compact={compact}
                                Icone={variation.Icone} couleur={variation.couleur} libelle="Variation" valeur={variation.valeur} unite={variation.unite}
                                sous={variation.sous} attenue={variation.attenue}
                            />
                            <Indicateur compact={compact}
                                Icone={SpeedOutlined} couleur={c.texte} libelle="Vitesse moyenne" valeur={vit.valeur} unite={vit.unite}
                                sous={vit.sous} attenue={vit.attenue} pleine={compact && !montrerImc}
                            />
                            {montrerImc && (
                                <Indicateur compact={compact}
                                    Icone={ScaleOutlined} couleur={sombre ? '#cbd5e1' : '#475569'} libelle="IMC" valeur={valeurImc ? formatNombre(valeurImc, 1, 1) : '—'}
                                    unite={valeurImc ? 'kg/m²' : undefined} attenue={!valeurImc}
                                    sous={valeurImc ? `poids et taille du ${dernierImc.jour ? 'jour' : dateCourte(dernierImc.date, maintenant)}` : 'Poids et taille relevés le même jour sont nécessaires.'}
                                />
                            )}
                        </Box>

                        <Graphique
                            key={actifId}
                            points={serie} g={g} couleurs={c} largeur={largeurGraphique} hauteur={compact ? 250 : 290}
                            animer={animer} pointInitial={pointInitial} titre={titreGraphique} maintenant={maintenant}
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                            <Button
                                variant="outlined" color="inherit" size="small" onClick={() => setDetail((d) => !d)}
                                aria-expanded={detail} aria-controls={`${idBase}-detail`}
                                endIcon={<ExpandMore sx={{ transition: 'transform .2s', transform: detail ? 'rotate(180deg)' : 'none' }} />}
                                sx={{ minHeight: 38, borderColor: 'divider', color: 'text.primary', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: 'text.secondary' } }}
                            >
                                {detail ? 'Masquer le détail' : `Voir le détail des mesures (${serie.length})`}
                            </Button>
                        </Box>

                        <Collapse in={detail} unmountOnExit>
                            <Box id={`${idBase}-detail`} sx={{ mt: 1.5, overflowX: 'auto' }}>
                                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem' }}>
                                    <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{`Détail des mesures de ${g.libelle.toLowerCase()}`}</caption>
                                    <thead>
                                        <tr>
                                            {['Date', 'Âge', g.libelle === 'Périmètre crânien' ? 'PC' : g.libelle, 'Variation', ...(montrerColImc ? ['IMC'] : [])].map((h, i) => (
                                                <Box component="th" key={h} scope="col" sx={{ textAlign: i === 0 || i === 1 ? 'left' : 'right', py: 0.75, px: 1, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>{h}{i === 2 ? ` (${g.unite})` : ''}</Box>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lignesDetail.map((p) => {
                                            const delta = p.precedent ? p.y - p.precedent.y : null;
                                            return (
                                                <tr key={p.cle}>
                                                    <Box component="td" sx={{ py: 1, px: 1, borderBottom: '1px solid', borderColor: 'divider', minHeight: 36 }}>
                                                        {p.jour ? <><b>Aujourd'hui</b></> : dateComplete(p.date)}
                                                    </Box>
                                                    <Box component="td" sx={{ py: 1, px: 1, borderBottom: '1px solid', borderColor: 'divider', color: 'text.secondary' }}>{p.libelleAge}</Box>
                                                    <Box component="td" sx={{ py: 1, px: 1, textAlign: 'right', fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>{fmt(p.y)}</Box>
                                                    <Box component="td" sx={{ py: 1, px: 1, textAlign: 'right', borderBottom: '1px solid', borderColor: 'divider', color: delta !== null && delta < 0 ? (sombre ? '#fbbf24' : '#b45309') : 'text.secondary', fontWeight: delta !== null && delta < 0 ? 600 : 400 }}>
                                                        {delta === null ? '—' : formatSigne(delta, g.decimales)}
                                                    </Box>
                                                    {montrerColImc && <Box component="td" sx={{ py: 1, px: 1, textAlign: 'right', borderBottom: '1px solid', borderColor: 'divider', color: 'text.secondary' }}>{p.imc ? formatNombre(p.imc, 1, 1) : '—'}</Box>}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Box>
                            </Box>
                        </Collapse>

                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 1.5, color: 'text.secondary' }}>
                            <InfoOutlined sx={{ fontSize: 16, mt: '2px', flexShrink: 0 }} aria-hidden="true" />
                            <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                                Courbe tracée d'après les seules mesures de cet enfant : aucune courbe de référence n'est affichée.
                                {montrerImc && valeurImc ? ' L\'IMC s\'interprète selon l\'âge et le sexe.' : ''}
                            </Typography>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default CourbeCroissance;
