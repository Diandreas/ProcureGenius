import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

// Petite courbe SVG (sans librairie) : series = [{ nom, couleur, points: [{ x: Date|number, y }] }].
// `etiquetteX(x)` formate l'axe horizontal. Les points sans valeur sont ignorés.
const CourbeSimple = ({ series, hauteur = 140, etiquetteX, unite = '', seuils = [] }) => {
    const theme = useTheme();
    const tous = series.flatMap(s => s.points.filter(p => p.y !== null && p.y !== undefined && p.y !== ''));
    if (tous.length === 0) {
        return <Typography variant="body2" color="text.secondary">Pas encore de mesure enregistrée.</Typography>;
    }
    const xs = tous.map(p => +p.x);
    const ys = tous.map(p => +p.y).concat(seuils.map(s => s.y));
    const [xmin, xmax] = [Math.min(...xs), Math.max(...xs)];
    const [ymin0, ymax0] = [Math.min(...ys), Math.max(...ys)];
    const marge = (ymax0 - ymin0) * 0.15 || 5;
    const [ymin, ymax] = [ymin0 - marge, ymax0 + marge];
    const L = 600, G = 36, D = 12, H = 10, B = 22;
    const px = x => (xmax === xmin ? (L + G - D) / 2 : G + ((+x - xmin) / (xmax - xmin)) * (L - G - D));
    const py = y => H + (1 - (+y - ymin) / (ymax - ymin)) * (hauteur - H - B);
    const texte = theme.palette.text.secondary;
    return (
        <Box>
            <svg viewBox={`0 0 ${L} ${hauteur}`} width="100%" role="img" aria-label="Évolution des mesures">
                {seuils.map(s => (
                    <g key={s.libelle}>
                        <line x1={G} x2={L - D} y1={py(s.y)} y2={py(s.y)} stroke={s.couleur || theme.palette.error.light} strokeDasharray="4 4" />
                        <text x={L - D} y={py(s.y) - 4} fontSize="11" textAnchor="end" fill={texte}>{s.libelle}</text>
                    </g>
                ))}
                {[ymin0, ymax0].map(v => (
                    <text key={v} x={G - 6} y={py(v) + 4} fontSize="11" textAnchor="end" fill={texte}>{Math.round(v)}</text>
                ))}
                {series.map(s => {
                    const pts = s.points.filter(p => p.y !== null && p.y !== undefined && p.y !== '');
                    return (
                        <g key={s.nom}>
                            {pts.length > 1 && (
                                <polyline fill="none" stroke={s.couleur} strokeWidth="2"
                                    points={pts.map(p => `${px(p.x)},${py(p.y)}`).join(' ')} />
                            )}
                            {pts.map((p, i) => (
                                <circle key={i} cx={px(p.x)} cy={py(p.y)} r={i === pts.length - 1 ? 5 : 3.5} fill={s.couleur}>
                                    <title>{`${s.nom} : ${p.y}${unite}${etiquetteX ? ' — ' + etiquetteX(p.x) : ''}`}</title>
                                </circle>
                            ))}
                        </g>
                    );
                })}
                {etiquetteX && (
                    <>
                        <text x={G} y={hauteur - 4} fontSize="11" fill={texte}>{etiquetteX(xmin)}</text>
                        {xmax !== xmin && <text x={L - D} y={hauteur - 4} fontSize="11" textAnchor="end" fill={texte}>{etiquetteX(xmax)}</text>}
                    </>
                )}
            </svg>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {series.map(s => (
                    <Typography key={s.nom} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.couleur, display: 'inline-block' }} />
                        {s.nom}
                    </Typography>
                ))}
            </Box>
        </Box>
    );
};

export default CourbeSimple;
