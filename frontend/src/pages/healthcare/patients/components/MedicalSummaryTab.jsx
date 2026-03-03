import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Chip,
    CircularProgress,
    Divider,
    Avatar,
} from '@mui/material';
import {
    Warning as WarningIcon,
    Favorite as HeartIcon,
    Science as LabIcon,
    MedicalServices as ConsultIcon,
    LocalPharmacy as RxIcon,
    TrackChanges as FollowUpIcon,
    Thermostat as TempIcon,
    MonitorWeight as WeightIcon,
    Air as RespIcon,
    WaterDrop as GlucoseIcon,
    ErrorOutline as CriticalIcon,
} from '@mui/icons-material';
import patientAPI from '../../../../services/patientAPI';
import { formatDate } from '../../../../utils/formatters';

const MedicalSummaryTab = ({ patientId, initialSummary = null }) => {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        if (initialSummary) {
            setSummary(initialSummary);
            return;
        }
        let cancelled = false;
        setLoading(true);
        patientAPI.getMedicalSummary(patientId)
            .then(data => { if (!cancelled) setSummary(data); })
            .catch(err => console.error('Error fetching medical summary:', err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!summary) {
        return <Typography color="text.secondary">Impossible de charger le résumé médical.</Typography>;
    }

    const v = summary.latest_vitals;
    const hasCritical = summary.abnormal_results?.some(r => r.is_critical);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* ── BLOC 1 : Alertes + Groupe sanguin ───────────────────── */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Groupe sanguin — badge héroïque */}
                <Box sx={{
                    minWidth: 100,
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    borderRadius: 3,
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(220,38,38,0.3)',
                }}>
                    <HeartIcon sx={{ fontSize: 28, mb: 0.5, opacity: 0.8 }} />
                    <Typography variant="h3" fontWeight={900} lineHeight={1}>
                        {summary.alerts?.blood_type || '?'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, mt: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Groupe
                    </Typography>
                </Box>

                {/* Allergies */}
                <Box sx={{
                    flex: 1,
                    minWidth: 200,
                    bgcolor: summary.alerts?.allergies ? '#fef2f2' : '#f0fdf4',
                    border: '2px solid',
                    borderColor: summary.alerts?.allergies ? '#fecaca' : '#bbf7d0',
                    borderRadius: 3,
                    p: 2,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <WarningIcon sx={{ fontSize: 18, color: summary.alerts?.allergies ? '#dc2626' : '#16a34a' }} />
                        <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.8}
                            color={summary.alerts?.allergies ? 'error.main' : 'success.dark'}>
                            Allergies
                        </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}
                        color={summary.alerts?.allergies ? 'error.dark' : 'success.dark'}>
                        {summary.alerts?.allergies || 'Aucune allergie connue'}
                    </Typography>
                </Box>

                {/* Conditions chroniques */}
                <Box sx={{
                    flex: 1.5,
                    minWidth: 220,
                    bgcolor: '#eff6ff',
                    border: '2px solid #bfdbfe',
                    borderRadius: 3,
                    p: 2,
                }}>
                    <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing={0.8} color="primary.main">
                        Conditions Chroniques
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }} color="text.primary">
                        {summary.alerts?.chronic_conditions || 'Aucune condition chronique signalée'}
                    </Typography>
                </Box>

                {/* Compteurs rapides */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'stretch' }}>
                    {[
                        { label: 'Consultations', value: summary.statistics?.total_consultations ?? 0, color: '#6366f1' },
                        { label: 'Examens Labo', value: summary.statistics?.total_lab_orders ?? 0, color: '#0891b2' },
                        { label: 'Visites', value: summary.statistics?.total_visits ?? 0, color: '#059669' },
                    ].map(stat => (
                        <Box key={stat.label} sx={{
                            minWidth: 80,
                            bgcolor: '#fff',
                            border: '1.5px solid #e5e7eb',
                            borderTop: `4px solid ${stat.color}`,
                            borderRadius: 2,
                            p: 1.5,
                            textAlign: 'center',
                        }}>
                            <Typography variant="h4" fontWeight={800} sx={{ color: stat.color, lineHeight: 1 }}>
                                {stat.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {stat.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* ── BLOC 2 : Paramètres vitaux ──────────────────────────── */}
            {v && (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <HeartIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                        <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.8} color="text.secondary">
                            Derniers Paramètres Vitaux
                        </Typography>
                        {v.date && (
                            <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                                {formatDate(v.date)}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {v.systolic && v.diastolic && (
                            <VitalCard
                                icon={<HeartIcon />}
                                label="Tension"
                                value={`${v.systolic}/${v.diastolic}`}
                                unit="mmHg"
                                color="#ef4444"
                                bg="#fff1f2"
                            />
                        )}
                        {v.temperature && (
                            <VitalCard icon={<TempIcon />} label="Température" value={v.temperature} unit="°C" color="#f97316" bg="#fff7ed" />
                        )}
                        {v.heart_rate && (
                            <VitalCard icon={<HeartIcon />} label="FC" value={v.heart_rate} unit="bpm" color="#ec4899" bg="#fdf2f8" />
                        )}
                        {v.spo2 && (
                            <VitalCard icon={<RespIcon />} label="SpO2" value={v.spo2} unit="%" color="#3b82f6" bg="#eff6ff" />
                        )}
                        {v.respiratory_rate && (
                            <VitalCard icon={<RespIcon />} label="FR" value={v.respiratory_rate} unit="c/min" color="#06b6d4" bg="#ecfeff" />
                        )}
                        {v.weight && (
                            <VitalCard icon={<WeightIcon />} label="Poids" value={v.weight} unit="kg" color="#8b5cf6" bg="#f5f3ff" />
                        )}
                        {v.blood_glucose && (
                            <VitalCard icon={<GlucoseIcon />} label="Glycémie" value={v.blood_glucose} unit="g/L" color="#10b981" bg="#ecfdf5" />
                        )}
                    </Box>
                </Box>
            )}

            {/* ── BLOC 3 : Résultats anormaux + Ordonnances ───────────── */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {/* Résultats anormaux */}
                {summary.abnormal_results?.length > 0 && (
                    <Box sx={{
                        flex: 1,
                        minWidth: 260,
                        bgcolor: hasCritical ? '#fff1f2' : '#fffbeb',
                        border: '2px solid',
                        borderColor: hasCritical ? '#fecdd3' : '#fde68a',
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: hasCritical ? '#fee2e2' : '#fef3c7', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CriticalIcon sx={{ fontSize: 18, color: hasCritical ? '#dc2626' : '#d97706' }} />
                            <Typography variant="subtitle2" fontWeight={700} color={hasCritical ? 'error.dark' : '#92400e'}>
                                Résultats Anormaux Récents
                            </Typography>
                            <Chip label={summary.abnormal_results.length} size="small"
                                sx={{ ml: 'auto', height: 20, fontSize: '0.7rem', bgcolor: hasCritical ? '#fca5a5' : '#fcd34d', color: hasCritical ? '#7f1d1d' : '#78350f' }} />
                        </Box>
                        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {summary.abnormal_results.map((r, i) => (
                                <Box key={i} sx={{
                                    bgcolor: '#fff',
                                    borderRadius: 2,
                                    p: 1.5,
                                    borderLeft: '3px solid',
                                    borderColor: r.is_critical ? '#dc2626' : '#f59e0b',
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="body2" fontWeight={700}>{r.test_name}</Typography>
                                        {r.is_critical && (
                                            <Chip label="CRITIQUE" size="small" color="error"
                                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} />
                                        )}
                                    </Box>
                                    <Typography variant="body1" fontWeight={800} color={r.is_critical ? 'error.main' : '#b45309'}>
                                        {r.result_value}
                                    </Typography>
                                    <Typography variant="caption" color="text.disabled">
                                        Réf: {r.reference_range || '—'} · {r.date ? formatDate(r.date) : ''}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Ordonnances récentes */}
                {summary.active_prescriptions?.length > 0 && (
                    <Box sx={{
                        flex: 1,
                        minWidth: 260,
                        bgcolor: '#f0fdf4',
                        border: '2px solid #bbf7d0',
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}>
                        <Box sx={{ px: 2, py: 1.5, bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <RxIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                            <Typography variant="subtitle2" fontWeight={700} color="success.dark">
                                Ordonnances Récentes
                            </Typography>
                        </Box>
                        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {summary.active_prescriptions.map((rx, i) => (
                                <Box key={i}>
                                    {i > 0 && <Divider sx={{ mb: 1.5 }} />}
                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>
                                        {rx.date ? formatDate(rx.date) : ''}
                                    </Typography>
                                    {rx.items?.map((item, j) => (
                                        <Box key={j} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', mt: '5px', flexShrink: 0 }} />
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>{item.medication_name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {[item.dosage, item.frequency, item.duration].filter(Boolean).join(' · ')}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>

            {/* ── BLOC 4 : Dernière consultation ──────────────────────── */}
            {summary.last_consultation && (
                <Box sx={{
                    bgcolor: '#fafafa',
                    border: '1.5px solid #e5e7eb',
                    borderLeft: '5px solid #6366f1',
                    borderRadius: 3,
                    p: 2.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: '#6366f1' }}>
                            <ConsultIcon sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Dernière Consultation</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatDate(summary.last_consultation.date)} · Dr. {summary.last_consultation.doctor_name || '—'}
                            </Typography>
                        </Box>
                        <Chip
                            label={summary.last_consultation.status_display}
                            size="small"
                            color={summary.last_consultation.status === 'completed' ? 'success' : 'warning'}
                            sx={{ ml: 'auto' }}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {summary.last_consultation.chief_complaint && (
                            <Box sx={{ flex: 1, minWidth: 160 }}>
                                <Typography variant="caption" color="text.disabled" textTransform="uppercase" letterSpacing={0.6}>Motif</Typography>
                                <Typography variant="body2" sx={{ mt: 0.3 }}>{summary.last_consultation.chief_complaint}</Typography>
                            </Box>
                        )}
                        {summary.last_consultation.diagnosis && (
                            <Box sx={{ flex: 2, minWidth: 200, bgcolor: '#fff1f2', borderRadius: 2, px: 1.5, py: 1 }}>
                                <Typography variant="caption" color="error.light" textTransform="uppercase" letterSpacing={0.6}>Diagnostic</Typography>
                                <Typography variant="body2" fontWeight={700} color="error.main" sx={{ mt: 0.3 }}>
                                    {summary.last_consultation.diagnosis}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            )}

            {/* ── BLOC 5 : Derniers suivis ────────────────────────────── */}
            {summary.recent_follow_ups?.length > 0 && (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <FollowUpIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                        <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.8} color="text.secondary">
                            Derniers Suivis
                        </Typography>
                        <Chip label={`${summary.recent_follow_ups.length}`} size="small"
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem', bgcolor: '#ede9fe', color: '#5b21b6' }} />
                    </Box>

                    {/* Timeline verticale */}
                    <Box sx={{ position: 'relative', pl: 3 }}>
                        {/* Ligne verticale */}
                        <Box sx={{
                            position: 'absolute',
                            left: 10,
                            top: 10,
                            bottom: 10,
                            width: 2,
                            bgcolor: '#ddd6fe',
                        }} />

                        {summary.recent_follow_ups.map((fu, idx) => (
                            <Box key={fu.id} sx={{ position: 'relative', mb: 2, pl: 2 }}>
                                {/* Dot */}
                                <Box sx={{
                                    position: 'absolute',
                                    left: -13,
                                    top: 12,
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: '#7c3aed',
                                    border: '2px solid #fff',
                                    boxShadow: '0 0 0 2px #ddd6fe',
                                }} />

                                <Box sx={{
                                    bgcolor: idx === 0 ? '#faf5ff' : '#fafafa',
                                    border: '1.5px solid',
                                    borderColor: idx === 0 ? '#ddd6fe' : '#e5e7eb',
                                    borderRadius: 2.5,
                                    p: 2,
                                }}>
                                    {/* En-tête */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={700} color="#5b21b6">
                                            {fu.follow_up_date ? formatDate(fu.follow_up_date) : '—'}
                                        </Typography>
                                        {fu.provided_by_name && (
                                            <Typography variant="caption" color="text.secondary">{fu.provided_by_name}</Typography>
                                        )}
                                    </Box>

                                    {/* Vitaux en chips compacts */}
                                    {(fu.blood_pressure || fu.temperature || fu.heart_rate || fu.oxygen_saturation || fu.weight) && (
                                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
                                            {fu.blood_pressure && <MiniVital label="TA" value={`${fu.blood_pressure} mmHg`} color="#ef4444" />}
                                            {fu.temperature && <MiniVital label="T°" value={`${fu.temperature}°C`} color="#f97316" />}
                                            {fu.heart_rate && <MiniVital label="FC" value={`${fu.heart_rate} bpm`} color="#ec4899" />}
                                            {fu.oxygen_saturation && <MiniVital label="SpO2" value={`${fu.oxygen_saturation}%`} color="#3b82f6" />}
                                            {fu.weight && <MiniVital label="Poids" value={`${fu.weight} kg`} color="#8b5cf6" />}
                                            {fu.blood_glucose && <MiniVital label="Gly" value={`${fu.blood_glucose}`} color="#10b981" />}
                                        </Box>
                                    )}

                                    {/* Données cliniques */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                        {fu.chief_complaint && <ClinRow label="Plaintes" value={fu.chief_complaint} />}
                                        {fu.physical_examination && <ClinRow label="Examen" value={fu.physical_examination} />}
                                        {fu.diagnosis && <ClinRow label="Diagnostic" value={fu.diagnosis} color="error.main" bold />}
                                        {fu.evolution && <ClinRow label="Évolution" value={fu.evolution} />}
                                        {fu.treatment && <ClinRow label="Traitement" value={fu.treatment} color="success.dark" />}
                                        {fu.notes && (
                                            <Box sx={{ bgcolor: '#fffbeb', borderRadius: 1, px: 1.5, py: 0.75, mt: 0.5 }}>
                                                <Typography variant="caption" color="#92400e" fontStyle="italic">{fu.notes}</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
};

/* ── Sous-composants ──────────────────────────────────────────────────────── */

const VitalCard = ({ icon, label, value, unit, color, bg }) => (
    <Box sx={{
        bgcolor: bg,
        borderRadius: 2.5,
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        border: '1.5px solid',
        borderColor: color + '33',
        minWidth: 120,
    }}>
        <Box sx={{ color, fontSize: 22, display: 'flex', alignItems: 'center' }}>
            {React.cloneElement(icon, { sx: { fontSize: 22 } })}
        </Box>
        <Box>
            <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
                {label}
            </Typography>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2} sx={{ color }}>
                {value} <Typography component="span" variant="caption" color="text.secondary">{unit}</Typography>
            </Typography>
        </Box>
    </Box>
);

const MiniVital = ({ label, value, color }) => (
    <Box sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: color + '15',
        border: '1px solid ' + color + '40',
        borderRadius: 10,
        px: 1,
        py: 0.25,
    }}>
        <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: '0.65rem' }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.primary', fontSize: '0.72rem', fontWeight: 600 }}>{value}</Typography>
    </Box>
);

const ClinRow = ({ label, value, color = 'text.primary', bold = false }) => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Typography variant="caption" sx={{
            fontWeight: 700,
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
            pt: '1px',
            minWidth: 70,
        }}>
            {label}
        </Typography>
        <Typography variant="caption" sx={{ color, fontWeight: bold ? 700 : 500, lineHeight: 1.5, flex: 1 }}>
            {value}
        </Typography>
    </Box>
);

export default MedicalSummaryTab;
