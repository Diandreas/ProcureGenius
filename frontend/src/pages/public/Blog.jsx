import React, { useEffect, useState, useMemo } from 'react';
import { Box, Container, Typography, useTheme, Chip, Grid, Card, CardActionArea, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ArticleIcon from '@mui/icons-material/Article';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { BLOG_POSTS, AUDIENCES } from '../../data/blogPosts';

export default function Blog() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [audience, setAudience] = useState('all');

  useEffect(() => {
    document.title = 'Blog | Procura';
    window.scrollTo(0, 0);
  }, []);

  const headingColor = isDark ? '#fff' : '#0f172a';
  const textColor = isDark ? 'rgba(255,255,255,0.6)' : '#475569';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const accent = '#2563eb';

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const filtered = useMemo(
    () => (audience === 'all' ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.audience === audience)),
    [audience],
  );
  const [featured, ...rest] = filtered;

  return (
    <Box sx={{ py: { xs: 6, md: 10 }, minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          {/* En-tête */}
          <Box sx={{ mb: { xs: 5, md: 7 }, textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, p: 1, px: 2, mb: 2, borderRadius: 99, bgcolor: `${accent}12` }}>
              <ArticleIcon sx={{ color: accent, fontSize: 20 }} />
              <Typography sx={{ color: accent, fontWeight: 700, fontSize: '0.85rem' }}>Le blog Procura</Typography>
            </Box>
            <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 800, letterSpacing: '-0.02em', color: headingColor, mb: 1.5 }}>
              Reprends le contrôle de ton activité
            </Typography>
            <Typography sx={{ color: textColor, fontSize: { xs: '1rem', md: '1.15rem' }, maxWidth: 640, mx: 'auto' }}>
              Des conseils concrets pour gérer ton business sans t'éparpiller — et des coulisses de l'IA qui bosse pour toi.
            </Typography>
          </Box>

          {/* Filtre par profil */}
          <Stack direction="row" spacing={1.2} useFlexGap flexWrap="wrap" justifyContent="center" sx={{ mb: 5 }}>
            {AUDIENCES.map((a) => {
              const active = audience === a.key;
              return (
                <Chip
                  key={a.key}
                  label={a.label}
                  onClick={() => setAudience(a.key)}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    px: 0.5,
                    cursor: 'pointer',
                    bgcolor: active ? accent : (isDark ? 'rgba(255,255,255,0.05)' : '#fff'),
                    color: active ? '#fff' : (isDark ? 'rgba(255,255,255,0.8)' : '#475569'),
                    border: `1px solid ${active ? accent : borderColor}`,
                    '&:hover': { bgcolor: active ? accent : `${accent}12` },
                  }}
                />
              );
            })}
          </Stack>

          {/* Article à la une */}
          {featured && (
            <Card
              elevation={0}
              sx={{ mb: 5, borderRadius: 4, overflow: 'hidden', border: `1px solid ${borderColor}`, bgcolor: cardBg }}
            >
              <CardActionArea onClick={() => navigate(`/blog/${featured.slug}`)}>
                <Grid container>
                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        height: { xs: 220, md: '100%' },
                        minHeight: { md: 320 },
                        backgroundImage: `url(${featured.cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'top center',
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: { xs: 3, md: 5 } }}>
                      <Chip label={featured.category} size="small" sx={{ mb: 2, bgcolor: `${accent}15`, color: accent, fontWeight: 700 }} />
                      <Typography variant="h2" sx={{ fontSize: { xs: '1.4rem', md: '1.8rem' }, fontWeight: 800, color: headingColor, mb: 1.5, lineHeight: 1.2 }}>
                        {featured.title}
                      </Typography>
                      <Typography sx={{ color: textColor, fontSize: '1rem', mb: 3, lineHeight: 1.6 }}>
                        {featured.excerpt}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: textColor, fontSize: '0.85rem' }}>
                        <span>{formatDate(featured.date)}</span>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 16 }} /> {featured.readingTime}
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardActionArea>
            </Card>
          )}

          {/* Autres articles */}
          <Grid container spacing={4}>
            {rest.map((post) => (
              <Grid item xs={12} sm={6} md={4} key={post.slug}>
                <Card
                  elevation={0}
                  sx={{ height: '100%', borderRadius: 4, overflow: 'hidden', border: `1px solid ${borderColor}`, bgcolor: cardBg, transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.3)' : '0 12px 32px rgba(15,23,42,0.08)' } }}
                >
                  <CardActionArea onClick={() => navigate(`/blog/${post.slug}`)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ height: 180, backgroundImage: `url(${post.cover})`, backgroundSize: 'cover', backgroundPosition: 'top center' }} />
                    <Box sx={{ p: 3, flexGrow: 1 }}>
                      <Chip label={post.category} size="small" sx={{ mb: 1.5, bgcolor: `${accent}12`, color: accent, fontWeight: 700, fontSize: '0.72rem' }} />
                      <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: headingColor, mb: 1, lineHeight: 1.25 }}>
                        {post.title}
                      </Typography>
                      <Typography sx={{ color: textColor, fontSize: '0.9rem', mb: 2, lineHeight: 1.5 }}>
                        {post.excerpt}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: textColor, fontSize: '0.8rem' }}>
                        <span>{formatDate(post.date)}</span>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 14 }} /> {post.readingTime}
                        </Box>
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Container>
    </Box>
  );
}
