import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box, ButtonBase, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText,
    DialogTitle, IconButton, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddPhotoIcon from '@mui/icons-material/AddAPhoto';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import CalendarIcon from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import HistoryIcon from '@mui/icons-material/History';
import NotesIcon from '@mui/icons-material/NotesOutlined';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import ZoomIcon from '@mui/icons-material/ZoomOutMap';

// Photos cliniques : galerie classée par moment (avant / après / suivi), comparateur à curseur dès qu'il existe
// une photo « avant » ET une photo « après », visionneuse plein écran, suppression avec confirmation.
//
// Props
//   photos          [{ id, url, moment ('avant'|'apres'|'suivi'), moment_display, zone, notes, created_at }]
//   onSupprimer(id) appelée après confirmation ; peut renvoyer une promesse (le bouton attend)
//   peutSupprimer   affiche ou non les boutons de suppression

const MOMENTS = {
    avant: { cle: 'avant', libelle: 'Avant', icone: HistoryIcon, teinte: 'warning' },
    apres: { cle: 'apres', libelle: 'Après', icone: AutoAwesomeIcon, teinte: 'success' },
    suivi: { cle: 'suivi', libelle: 'Suivi', icone: EventRepeatIcon, teinte: 'primary' },
};
const ORDRE = ['avant', 'apres', 'suivi'];
const momentDe = (p) => MOMENTS[p?.moment] || MOMENTS.suivi;

// ---------- utilitaires ----------
const borne = (v, mini, maxi) => Math.min(maxi, Math.max(mini, v));
const dateDe = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};
const dateCourte = (d) => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');
const dateMoyenne = (d) => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date inconnue');
const dateLongue = (d) => (d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date inconnue');
const heureDe = (d) => {
    if (!d) return '';
    const h = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return h === '00:00' ? '' : h;
};
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
const ecartEntre = (a, b) => {
    if (!a || !b) return '';
    const jours = Math.round(Math.abs(b - a) / 86400000);
    if (jours === 0) return 'Même jour';
    if (jours < 14) return pluriel(jours, 'jour', 'jours');
    if (jours < 70) return pluriel(Math.round(jours / 7), 'semaine', 'semaines');
    const mois = Math.round(jours / 30.44);
    if (mois < 24) return `${mois} mois`;
    return pluriel(Math.round(mois / 12), 'an', 'ans');
};
const parDate = (a, b) => (dateDe(a.created_at)?.getTime() ?? 0) - (dateDe(b.created_at)?.getTime() ?? 0);
const libellePhoto = (p) => `Photo ${momentDe(p).libelle.toLowerCase()}, ${dateLongue(dateDe(p.created_at))}${p.zone ? `, ${p.zone}` : ''}`;

// Couleurs d'une teinte : texte foncé en clair, vif en sombre (jamais la couleur seule : toujours icône + mot)
const teinteDe = (theme, nom) => {
    const clair = theme.palette.mode === 'light';
    const base = theme.palette[nom] || theme.palette.primary;
    return { fg: clair ? base.dark : base.main, bg: alpha(base.main, clair ? 0.12 : 0.16) };
};
const ombreCarte = (theme) => (theme.palette.mode === 'light'
    ? '0 1px 2px rgba(15,23,42,0.05), 0 6px 18px rgba(15,23,42,0.05)'
    : '0 1px 2px rgba(0,0,0,0.35)');
const carte = (theme) => ({
    bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '14px', boxShadow: ombreCarte(theme),
});

const Tuile = ({ teinte = 'primary', taille = 32, children, sx }) => (
    <Box
        aria-hidden
        sx={(theme) => {
            const t = teinteDe(theme, teinte);
            return {
                width: taille, height: taille, borderRadius: '10px', flexShrink: 0, display: 'grid', placeItems: 'center',
                bgcolor: t.bg, color: t.fg, '& svg': { fontSize: Math.round(taille * 0.56) }, ...sx,
            };
        }}
    >
        {children}
    </Box>
);

// Image avec repli si le fichier est introuvable
const Image = ({ src, alt, fit = 'cover', sx, message = false }) => {
    const [erreur, setErreur] = useState(false);
    useEffect(() => { setErreur(false); }, [src]);
    if (erreur) {
        return (
            <Box
                role="img"
                aria-label={`${alt} (image indisponible)`}
                sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 0.5, bgcolor: 'background.subtle', color: 'text.disabled', ...sx }}
            >
                <BrokenImageIcon sx={{ justifySelf: 'center' }} />
                {message && <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Image indisponible</Typography>}
            </Box>
        );
    }
    return (
        <Box
            component="img"
            src={src}
            alt={alt}
            draggable={false}
            onError={() => setErreur(true)}
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: fit, ...sx }}
        />
    );
};

// ---------- étiquette posée sur l'image (lisible sur n'importe quelle photo) ----------
const Etiquette = ({ moment, date, cote }) => {
    const M = MOMENTS[moment];
    const Icone = M.icone;
    return (
        <Box
            sx={{
                position: 'absolute', top: 10, [cote]: 10, display: 'inline-flex', alignItems: 'center', gap: 0.75,
                height: 30, pl: 1, pr: 1.25, borderRadius: '15px', color: '#fff', pointerEvents: 'none',
                bgcolor: 'rgba(15,23,42,0.74)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.18)',
                fontSize: 12.5, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap',
            }}
        >
            <Icone sx={{ fontSize: 15 }} aria-hidden />
            <span>{M.libelle}</span>
            {date && <Box component="span" sx={{ fontWeight: 400, opacity: 0.8, display: { xs: 'none', sm: 'inline' } }}>{date}</Box>}
        </Box>
    );
};

// ---------- comparateur à curseur ----------
const Comparateur = ({ avant, apres }) => {
    const [pos, setPos] = useState(50);
    const [glisse, setGlisse] = useState(false);
    const zone = useRef(null);
    const poignee = useRef(null);
    const suivi = useRef(false);

    const depuisX = useCallback((x) => {
        const r = zone.current?.getBoundingClientRect();
        if (!r || !r.width) return;
        setPos(borne(((x - r.left) / r.width) * 100, 0, 100));
    }, []);

    const debut = (e) => {
        if (e.button > 0) return;
        try { zone.current?.setPointerCapture?.(e.pointerId); } catch { /* pointeur non capturable : on suit quand même */ }
        suivi.current = true;
        setGlisse(true);
        depuisX(e.clientX);
        poignee.current?.focus({ preventScroll: true });
    };
    const mouvement = (e) => { if (suivi.current) depuisX(e.clientX); };
    const fin = (e) => {
        suivi.current = false;
        setGlisse(false);
        try { zone.current?.releasePointerCapture?.(e.pointerId); } catch { /* déjà relâché */ }
    };
    const clavier = (e) => {
        const pas = e.shiftKey ? 10 : 2;
        const table = { ArrowLeft: -pas, ArrowDown: -pas, ArrowRight: pas, ArrowUp: pas, PageDown: -10, PageUp: 10 };
        if (e.key in table) { e.preventDefault(); setPos(p => borne(p + table[e.key], 0, 100)); }
        else if (e.key === 'Home') { e.preventDefault(); setPos(0); }
        else if (e.key === 'End') { e.preventDefault(); setPos(100); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPos(50); }
    };

    const dAvant = dateDe(avant.created_at);
    const dApres = dateDe(apres.created_at);
    const transition = glisse ? 'none' : 'left 140ms ease-out, clip-path 140ms ease-out';

    return (
        <Box>
            <Box
                ref={zone}
                role="group"
                aria-label="Comparaison avant et après"
                onPointerDown={debut}
                onPointerMove={mouvement}
                onPointerUp={fin}
                onPointerCancel={fin}
                sx={{
                    position: 'relative', width: '100%', aspectRatio: { xs: '1 / 1', sm: '3 / 2' }, maxHeight: 520, borderRadius: '10px',
                    overflow: 'hidden', bgcolor: '#0b0f14', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none',
                    cursor: glisse ? 'grabbing' : 'ew-resize', '@media (prefers-reduced-motion: reduce)': { '& *': { transition: 'none !important' } },
                }}
            >
                {/* Après : en dessous, visible à droite */}
                <Box sx={{ position: 'absolute', inset: 0 }}>
                    <Image src={apres.url} alt={libellePhoto(apres)} message />
                    <Etiquette moment="apres" date={dateCourte(dApres)} cote="right" />
                </Box>
                {/* Avant : au-dessus, découpé à gauche du séparateur */}
                <Box sx={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)`, transition }}>
                    <Image src={avant.url} alt={libellePhoto(avant)} message />
                    <Etiquette moment="avant" date={dateCourte(dAvant)} cote="left" />
                </Box>
                {/* Séparateur */}
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 2, ml: '-1px', bgcolor: '#fff',
                        boxShadow: '0 0 0 1px rgba(15,23,42,0.28), 0 0 12px rgba(0,0,0,0.35)', transition, pointerEvents: 'none',
                    }}
                />
                <Box
                    ref={poignee}
                    role="slider"
                    tabIndex={0}
                    aria-label="Séparateur entre la photo avant et la photo après"
                    aria-orientation="horizontal"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pos)}
                    aria-valuetext={`${Math.round(pos)} % de la photo avant visible`}
                    onKeyDown={clavier}
                    sx={{
                        position: 'absolute', top: '50%', left: `${pos}%`, width: 44, height: 44, ml: '-22px', mt: '-22px', borderRadius: '50%',
                        display: 'grid', placeItems: 'center', bgcolor: '#fff', color: 'primary.dark', touchAction: 'none', cursor: 'inherit',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.35)', outline: 'none', transition,
                        transform: glisse ? 'scale(1.08)' : 'none',
                        '&:focus-visible': (theme) => ({ boxShadow: `0 0 0 3px #fff, 0 0 0 6px ${theme.palette.primary.main}` }),
                    }}
                >
                    <CompareArrowsIcon />
                </Box>
            </Box>
        </Box>
    );
};

// ---------- choix des deux photos à comparer ----------
const ChoixPhoto = ({ moment, photos, choisie, onChoix }) => {
    const M = MOMENTS[moment];
    const Icone = M.icone;
    return (
        <Box role="radiogroup" aria-label={`Photo « ${M.libelle} » à comparer`} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', width: 64, flexShrink: 0 }}>
                <Icone sx={{ fontSize: 16 }} aria-hidden />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{M.libelle}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', py: '3px', px: '3px', mx: '-3px' }}>
                {photos.map((p) => {
                    const sel = p.id === choisie;
                    return (
                        <ButtonBase
                            key={p.id}
                            role="radio"
                            aria-checked={sel}
                            aria-label={libellePhoto(p)}
                            title={`${dateMoyenne(dateDe(p.created_at))}${p.zone ? ` · ${p.zone}` : ''}`}
                            onClick={() => onChoix(p.id)}
                            sx={(theme) => ({
                                position: 'relative', width: 44, height: 44, flexShrink: 0, borderRadius: '8px', overflow: 'hidden',
                                outline: sel ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                                outlineOffset: sel ? 2 : 0, opacity: sel ? 1 : 0.72,
                                '&:hover': { opacity: 1 },
                                '&.Mui-focusVisible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                            })}
                        >
                            <Image src={p.url} alt="" />
                        </ButtonBase>
                    );
                })}
            </Box>
        </Box>
    );
};

// ---------- carte « comparaison » ----------
const BlocComparaison = ({ avants, apres }) => {
    const [idAvant, setIdAvant] = useState(null);
    const [idApres, setIdApres] = useState(null);
    const avant = avants.find(p => p.id === idAvant) || avants[0];
    const apresPhoto = apres.find(p => p.id === idApres) || apres[apres.length - 1];
    const dA = dateDe(avant.created_at);
    const dP = dateDe(apresPhoto.created_at);
    const ecart = ecartEntre(dA, dP);
    const plusieurs = avants.length > 1 || apres.length > 1;

    const Cote = ({ photo, moment, date, align }) => {
        const M = MOMENTS[moment];
        const Icone = M.icone;
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, justifyContent: align === 'right' ? 'flex-end' : 'flex-start', textAlign: align === 'right' ? 'right' : 'left', flexDirection: align === 'right' ? 'row-reverse' : 'row' }}>
                <Tuile teinte={M.teinte} taille={32}><Icone /></Tuile>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, lineHeight: 1.25 }}>{M.libelle}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap' }}>{dateMoyenne(date)}</Typography>
                    {photo.zone && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.25 }}>{photo.zone}</Typography>
                    )}
                </Box>
            </Box>
        );
    };

    return (
        <Box sx={(theme) => ({ ...carte(theme), p: { xs: 1.5, sm: 2 } })}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Tuile teinte="primary" taille={36}><CompareArrowsIcon /></Tuile>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" component="h3" sx={{ lineHeight: 1.3 }}>Comparaison avant / après</Typography>
                    <Typography variant="caption" color="text.secondary">Faites glisser le séparateur, ou utilisez les flèches du clavier.</Typography>
                </Box>
            </Box>

            <Comparateur key={`${avant.id}-${apresPhoto.id}`} avant={avant} apres={apresPhoto} />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 1, mt: 1.5 }}>
                <Cote photo={avant} moment="avant" date={dA} />
                <Box
                    sx={(theme) => ({
                        display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 28, px: 1.25, borderRadius: '14px',
                        bgcolor: 'action.hover', color: 'text.secondary', border: `1px solid ${theme.palette.divider}`,
                    })}
                >
                    <Typography variant="caption" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{ecart || '—'}</Typography>
                </Box>
                <Cote photo={apresPhoto} moment="apres" date={dP} align="right" />
            </Box>

            {plusieurs && (
                <Box sx={(theme) => ({ mt: 1.5, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}`, display: 'grid', gap: 1 })}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Choisir les photos à comparer</Typography>
                    {avants.length > 1 && <ChoixPhoto moment="avant" photos={avants} choisie={avant.id} onChoix={setIdAvant} />}
                    {apres.length > 1 && <ChoixPhoto moment="apres" photos={apres} choisie={apresPhoto.id} onChoix={setIdApres} />}
                </Box>
            )}
        </Box>
    );
};

// ---------- il manque la moitié de la paire ----------
const PaireIncomplete = ({ avants, apres }) => {
    const aAvant = avants.length > 0;
    const manque = aAvant ? MOMENTS.apres : MOMENTS.avant;
    const present = aAvant ? avants[0] : apres[0];
    const Icone = manque.icone;
    const casePresente = (
        <Box sx={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '10px', overflow: 'hidden', bgcolor: '#0b0f14', minWidth: 0 }}>
            <Image src={present.url} alt={libellePhoto(present)} />
            <Etiquette moment={present.moment} date={dateCourte(dateDe(present.created_at))} cote="left" />
        </Box>
    );
    const caseVide = (
        <Box
            sx={(theme) => ({
                aspectRatio: '1 / 1', borderRadius: '10px', minWidth: 0, display: 'grid', placeItems: 'center', textAlign: 'center', p: 1,
                border: `1.5px dashed ${theme.palette.divider}`, borderColor: alpha(theme.palette.text.secondary, 0.4), bgcolor: 'background.subtle',
            })}
        >
            <Box sx={{ display: 'grid', justifyItems: 'center', gap: 0.75 }}>
                <Tuile teinte={manque.teinte} taille={36}><Icone /></Tuile>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{manque.libelle} : à prendre</Typography>
            </Box>
        </Box>
    );
    return (
        <Box sx={(theme) => ({ ...carte(theme), p: { xs: 1.5, sm: 2 } })}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Tuile teinte="primary" taille={36}><CompareArrowsIcon /></Tuile>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" component="h3" sx={{ lineHeight: 1.3 }}>Comparaison avant / après</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Ajoutez une photo « {manque.libelle} » pour activer le comparateur.
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, maxWidth: 420 }}>
                {aAvant ? casePresente : caseVide}
                {aAvant ? caseVide : casePresente}
            </Box>
        </Box>
    );
};

// ---------- vignette ----------
const Vignette = ({ photo, onOuvrir, onSupprimer, peutSupprimer }) => {
    const d = dateDe(photo.created_at);
    return (
        <Box sx={{ minWidth: 0, width: { xs: 'calc((100% - 10px) / 2)', sm: 116 }, flexShrink: 0 }}>
            <ButtonBase
                onClick={onOuvrir}
                aria-label={`Agrandir : ${libellePhoto(photo)}`}
                sx={(theme) => ({
                    position: 'relative', display: 'block', width: '100%', aspectRatio: '1 / 1', borderRadius: '10px', overflow: 'hidden',
                    border: `1px solid ${theme.palette.divider}`, bgcolor: 'action.hover',
                    '& .zoom': { opacity: 0, transition: 'opacity 120ms' },
                    '&:hover .zoom, &.Mui-focusVisible .zoom': { opacity: 1 },
                    '&.Mui-focusVisible': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                    '@media (hover: none)': { '& .zoom': { opacity: 1 } },
                })}
            >
                <Image src={photo.url} alt="" />
                <Box
                    className="zoom"
                    aria-hidden
                    sx={{ position: 'absolute', right: 6, bottom: 6, width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'rgba(15,23,42,0.68)' }}
                >
                    <ZoomIcon sx={{ fontSize: 15 }} />
                </Box>
            </ButtonBase>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.25, mt: 0.5 }}>
                <Box sx={{ minWidth: 0, flex: 1, pt: '5px' }}>
                    <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 600, lineHeight: 1.3 }}>
                        {photo.zone || dateMoyenne(d)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.5, lineHeight: 1.3 }}>
                        {photo.zone ? dateMoyenne(d) : (heureDe(d) || ' ')}
                        {photo.notes && (<><NotesIcon sx={{ fontSize: 13 }} aria-hidden /><Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>avec une note</Box></>)}
                    </Typography>
                </Box>
                {peutSupprimer && (
                    <IconButton
                        aria-label={`Supprimer : ${libellePhoto(photo)}`}
                        onClick={onSupprimer}
                        sx={(theme) => ({
                            width: 36, height: 36, flexShrink: 0, color: 'text.disabled',
                            '&:hover, &:focus-visible': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.1) },
                        })}
                    >
                        <DeleteIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                )}
            </Box>
        </Box>
    );
};

const SectionMoment = ({ moment, photos, onOuvrir, onSupprimer, peutSupprimer }) => {
    const M = MOMENTS[moment];
    const Icone = M.icone;
    return (
        <Box component="section" aria-label={`Photos « ${M.libelle} »`} sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' }, minWidth: 0, maxWidth: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                <Tuile teinte={M.teinte} taille={28}><Icone /></Tuile>
                <Typography variant="h6" component="h4">{M.libelle}</Typography>
                <Box
                    sx={{ minWidth: 22, height: 22, px: 0.75, borderRadius: '11px', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.secondary', fontSize: 12, fontWeight: 600 }}
                    aria-label={pluriel(photos.length, 'photo', 'photos')}
                >
                    {photos.length}
                </Box>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, rowGap: 1.5 }}>
                {photos.map(p => (
                    <Vignette key={p.id} photo={p} onOuvrir={() => onOuvrir(p.id)} onSupprimer={() => onSupprimer(p)} peutSupprimer={peutSupprimer} />
                ))}
            </Box>
        </Box>
    );
};

// ---------- visionneuse plein écran ----------
const Visionneuse = ({ ordre, idOuvert, onChanger, onFermer, onSupprimer, peutSupprimer }) => {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down('sm'));
    const index = ordre.findIndex(p => p.id === idOuvert);
    const photo = ordre[index];
    const depart = useRef(null);
    const bandeau = useRef(null);

    const aller = useCallback((delta) => {
        const i = index + delta;
        if (i >= 0 && i < ordre.length) onChanger(ordre[i].id);
    }, [index, ordre, onChanger]);

    useEffect(() => {
        const sel = bandeau.current?.querySelector('[aria-current="true"]');
        sel?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
    }, [idOuvert]);

    if (!photo) return null;
    const M = momentDe(photo);
    const Icone = M.icone;
    const d = dateDe(photo.created_at);
    const bouton = {
        color: '#fff', bgcolor: 'rgba(255,255,255,0.14)', width: 44, height: 44,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.06)' },
        '&.Mui-focusVisible, &:focus-visible': { outline: '3px solid #fff', outlineOffset: 2 },
    };

    return (
        <Dialog
            open
            onClose={onFermer}
            fullScreen={mobile}
            fullWidth
            maxWidth="lg"
            aria-label={libellePhoto(photo)}
            onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') { e.preventDefault(); aller(-1); }
                if (e.key === 'ArrowRight') { e.preventDefault(); aller(1); }
            }}
            PaperProps={{
                sx: {
                    bgcolor: '#0b0f14', color: '#fff', backgroundImage: 'none', display: 'flex', flexDirection: 'column',
                    height: mobile ? '100%' : 'min(88vh, 780px)', m: mobile ? 0 : 2, overflow: 'hidden', borderRadius: mobile ? 0 : '14px',
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, flexShrink: 0 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, height: 30, pl: 1, pr: 1.5, borderRadius: '15px', bgcolor: 'rgba(255,255,255,0.14)', fontSize: 13, fontWeight: 600 }}>
                    <Icone sx={{ fontSize: 16 }} aria-hidden />
                    {M.libelle}
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }} aria-live="polite">{index + 1} sur {ordre.length}</Typography>
                <Box sx={{ flex: 1 }} />
                {peutSupprimer && (
                    <IconButton aria-label="Supprimer cette photo" onClick={() => onSupprimer(photo)} sx={bouton}>
                        <DeleteIcon />
                    </IconButton>
                )}
                <IconButton aria-label="Fermer la visionneuse" onClick={onFermer} sx={bouton}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box
                sx={{ position: 'relative', flex: 1, minHeight: 0, touchAction: 'pan-y' }}
                onPointerDown={(e) => { depart.current = { x: e.clientX, y: e.clientY }; }}
                onPointerUp={(e) => {
                    const o = depart.current; depart.current = null;
                    if (!o) return;
                    const dx = e.clientX - o.x; const dy = e.clientY - o.y;
                    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) aller(dx < 0 ? 1 : -1);
                }}
            >
                <Image message src={photo.url} alt={libellePhoto(photo)} fit="contain" sx={{ position: 'absolute', inset: 0, bgcolor: 'transparent' }} />
                <IconButton aria-label="Photo précédente" disabled={index <= 0} onClick={() => aller(-1)} sx={{ ...bouton, position: 'absolute', left: 10, top: '50%', mt: '-22px' }}>
                    <ChevronLeftIcon />
                </IconButton>
                <IconButton aria-label="Photo suivante" disabled={index >= ordre.length - 1} onClick={() => aller(1)} sx={{ ...bouton, position: 'absolute', right: 10, top: '50%', mt: '-22px' }}>
                    <ChevronRightIcon />
                </IconButton>
            </Box>

            <Box sx={{ px: 2, pt: 1.25, pb: 1, flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 2, rowGap: 0.5 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 14, fontWeight: 600 }}>
                        <CalendarIcon sx={{ fontSize: 18, opacity: 0.8 }} aria-hidden />
                        {dateLongue(d)}{heureDe(d) ? ` à ${heureDe(d)}` : ''}
                    </Box>
                    {photo.zone && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                            <PlaceIcon sx={{ fontSize: 18, opacity: 0.8 }} aria-hidden />
                            {photo.zone}
                        </Box>
                    )}
                </Box>
                {photo.notes ? (
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, color: 'rgba(255,255,255,0.88)', maxHeight: 76, overflowY: 'auto' }}>
                        <NotesIcon sx={{ fontSize: 18, mt: '2px', opacity: 0.8, flexShrink: 0 }} aria-hidden />
                        <Typography variant="body2" sx={{ color: 'inherit', whiteSpace: 'pre-wrap' }}>{photo.notes}</Typography>
                    </Box>
                ) : null}
            </Box>

            {ordre.length > 1 && (
                <Box ref={bandeau} sx={{ display: 'flex', gap: 0.75, px: 2, py: 1, overflowX: 'auto', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {ordre.map((p, i) => {
                        const courant = i === index;
                        return (
                            <ButtonBase
                                key={p.id}
                                aria-label={`Afficher : ${libellePhoto(p)}`}
                                aria-current={courant ? 'true' : undefined}
                                onClick={() => onChanger(p.id)}
                                sx={{
                                    width: 52, height: 52, flexShrink: 0, borderRadius: '8px', overflow: 'hidden', opacity: courant ? 1 : 0.55,
                                    outline: courant ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)', outlineOffset: courant ? 2 : 0,
                                    '&:hover': { opacity: 1 }, '&.Mui-focusVisible': { outline: '3px solid #fff', outlineOffset: 2 },
                                }}
                            >
                                <Image src={p.url} alt="" />
                            </ButtonBase>
                        );
                    })}
                </Box>
            )}
        </Dialog>
    );
};

// ---------- confirmation de suppression ----------
const ConfirmerSuppression = ({ photo, onAnnuler, onConfirmer }) => {
    const [envoi, setEnvoi] = useState(false);
    const [echec, setEchec] = useState(false);
    useEffect(() => { setEnvoi(false); setEchec(false); }, [photo]);
    if (!photo) return null;
    const M = momentDe(photo);
    const confirmer = async () => {
        setEnvoi(true); setEchec(false);
        try { await onConfirmer(photo); } catch { setEchec(true); setEnvoi(false); }
    };
    return (
        <Dialog open onClose={envoi ? undefined : onAnnuler} maxWidth="xs" fullWidth aria-labelledby="titre-suppression" aria-describedby="texte-suppression">
            <DialogTitle id="titre-suppression" sx={{ pb: 1 }}>Supprimer cette photo ?</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ width: 64, height: 64, borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: 1, borderColor: 'divider' }}>
                        <Image src={photo.url} alt="" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Photo « {M.libelle} »</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {dateLongue(dateDe(photo.created_at))}{photo.zone ? ` · ${photo.zone}` : ''}
                        </Typography>
                    </Box>
                </Box>
                <DialogContentText id="texte-suppression" variant="body2">
                    Elle sera retirée du dossier du patient. Cette action est définitive.
                </DialogContentText>
                {echec && (
                    <Typography role="alert" variant="body2" sx={{ color: 'error.main', fontWeight: 600, mt: 1 }}>
                        La suppression a échoué. Veuillez réessayer.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button variant="outlined" color="inherit" onClick={onAnnuler} disabled={envoi} sx={(theme) => ({ minHeight: 40, borderColor: alpha(theme.palette.text.secondary, 0.5) })}>Annuler</Button>
                <Button variant="contained" color="error" onClick={confirmer} disabled={envoi} sx={{ minHeight: 40 }}
                    startIcon={envoi ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}>
                    Supprimer
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ---------- état vide ----------
const EtatVide = () => (
    <Box
        sx={(theme) => ({
            ...carte(theme), borderStyle: 'dashed', borderColor: alpha(theme.palette.text.secondary, 0.35), boxShadow: 'none',
            p: { xs: 2.5, sm: 4 }, textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 1.5,
        })}
    >
        <Tuile teinte="primary" taille={56} sx={{ borderRadius: '14px' }}><AddPhotoIcon /></Tuile>
        <Box>
            <Typography variant="h5" component="h3">Aucune photo clinique</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mt: 0.5 }}>
                Les photos prises pendant la consultation apparaîtront ici. Avec une photo « Avant » et une photo « Après », le comparateur à curseur se débloque.
            </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {ORDRE.map((cle) => {
                const M = MOMENTS[cle];
                const Icone = M.icone;
                return (
                    <Box key={cle} sx={(theme) => ({ display: 'inline-flex', alignItems: 'center', gap: 0.75, height: 32, pl: 0.5, pr: 1.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.subtle' })}>
                        <Tuile teinte={M.teinte} taille={24} sx={{ borderRadius: '12px' }}><Icone /></Tuile>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{M.libelle}</Typography>
                    </Box>
                );
            })}
        </Box>
    </Box>
);

// ---------- composant principal ----------
const ComparaisonPhotos = ({ photos = [], onSupprimer, peutSupprimer = false }) => {
    const groupes = useMemo(() => {
        const g = { avant: [], apres: [], suivi: [] };
        (photos || []).forEach(p => { g[momentDe(p).cle].push(p); });
        ORDRE.forEach(k => g[k].sort(parDate));
        return g;
    }, [photos]);
    const ordre = useMemo(() => ORDRE.flatMap(k => groupes[k]), [groupes]);

    const [idOuvert, setIdOuvert] = useState(null);
    const [aSupprimer, setASupprimer] = useState(null);

    const supprimer = async (photo) => {
        // Photo voisine à montrer ensuite si la visionneuse est ouverte
        const i = ordre.findIndex(p => p.id === photo.id);
        const voisine = ordre[i + 1] || ordre[i - 1] || null;
        if (onSupprimer) await onSupprimer(photo.id);
        setASupprimer(null);
        setIdOuvert(cur => (cur === photo.id ? (voisine ? voisine.id : null) : cur));
    };

    // Si la photo ouverte disparaît (suppression ailleurs), on referme proprement
    useEffect(() => {
        if (idOuvert != null && !ordre.some(p => p.id === idOuvert)) setIdOuvert(null);
    }, [ordre, idOuvert]);

    const total = ordre.length;
    if (total === 0) return <EtatVide />;

    const aPaire = groupes.avant.length > 0 && groupes.apres.length > 0;
    const resume = ORDRE.filter(k => groupes[k].length).map(k => `${groupes[k].length} ${MOMENTS[k].libelle.toLowerCase()}`).join(' · ');

    return (
        <Box sx={{ display: 'grid', gap: 2 }}>
            {aPaire && <BlocComparaison avants={groupes.avant} apres={groupes.apres} />}
            {!aPaire && (groupes.avant.length > 0 || groupes.apres.length > 0) && <PaireIncomplete avants={groupes.avant} apres={groupes.apres} />}

            <Box sx={(theme) => ({ ...carte(theme), p: { xs: 1.5, sm: 2 } })}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Tuile teinte="primary" taille={36}><PhotoLibraryIcon /></Tuile>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h5" component="h3" sx={{ lineHeight: 1.3 }}>
                            Photos cliniques <Typography component="span" variant="h5" color="text.secondary" sx={{ fontWeight: 500 }}>({total})</Typography>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{resume}</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 4, rowGap: 2.5 }}>
                    {ORDRE.filter(k => groupes[k].length > 0).map(k => (
                        <SectionMoment
                            key={k}
                            moment={k}
                            photos={groupes[k]}
                            onOuvrir={setIdOuvert}
                            onSupprimer={setASupprimer}
                            peutSupprimer={peutSupprimer}
                        />
                    ))}
                </Box>
            </Box>

            {idOuvert != null && (
                <Visionneuse
                    ordre={ordre}
                    idOuvert={idOuvert}
                    onChanger={setIdOuvert}
                    onFermer={() => setIdOuvert(null)}
                    onSupprimer={setASupprimer}
                    peutSupprimer={peutSupprimer}
                />
            )}
            <ConfirmerSuppression photo={aSupprimer} onAnnuler={() => setASupprimer(null)} onConfirmer={supprimer} />
        </Box>
    );
};

export default ComparaisonPhotos;
