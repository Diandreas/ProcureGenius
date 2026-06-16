import React, { useEffect } from 'react';
import { Box, Container, Typography, useTheme, Chip, Button, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { getPostBySlug, BLOG_POSTS } from '../../data/blogPosts';

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const post = getPostBySlug(slug);

  useEffect(() => {
    document.title = post ? `${post.title} | Procura` : 'Article | Procura';
    window.scrollTo(0, 0);
  }, [post]);

  const headingColor = isDark ? '#fff' : '#0f172a';
  const textColor = isDark ? 'rgba(255,255,255,0.78)' : '#374151';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : '#64748b';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const accent = '#2563eb';

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ py: 12, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: headingColor, mb: 2 }}>Article introuvable</Typography>
        <Button variant="contained" onClick={() => navigate('/blog')} sx={{ bgcolor: accent, textTransform: 'none', fontWeight: 700 }}>
          Retour au blog
        </Button>
      </Container>
    );
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // articles liés : priorité au même profil, complété par les autres
  const sameAudience = BLOG_POSTS.filter((p) => p.slug !== post.slug && p.audience === post.audience);
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug && p.audience !== post.audience);
  const related = [...sameAudience, ...others].slice(0, 2);

  const renderBlock = (block, i) => {
    switch (block.type) {
      case 'h2':
        return (
          <Typography key={i} variant="h2" sx={{ fontSize: { xs: '1.4rem', md: '1.7rem' }, fontWeight: 800, color: headingColor, mt: 5, mb: 2, letterSpacing: '-0.01em' }}>
            {block.text}
          </Typography>
        );
      case 'p':
        return (
          <Typography key={i} sx={{ color: textColor, fontSize: '1.08rem', lineHeight: 1.75, mb: 2.5 }}>
            {block.text}
          </Typography>
        );
      case 'list':
        return (
          <Box key={i} component="ul" sx={{ pl: 3, mb: 3 }}>
            {block.items.map((it, j) => (
              <Typography key={j} component="li" sx={{ color: textColor, fontSize: '1.05rem', lineHeight: 1.7, mb: 1 }}>
                {it}
              </Typography>
            ))}
          </Box>
        );
      case 'quote':
        return (
          <Box key={i} sx={{ borderLeft: `4px solid ${accent}`, pl: 3, py: 1, my: 4, bgcolor: `${accent}08`, borderRadius: '0 8px 8px 0' }}>
            <Typography sx={{ color: headingColor, fontSize: '1.25rem', fontWeight: 600, fontStyle: 'italic', lineHeight: 1.5 }}>
              {block.text}
            </Typography>
          </Box>
        );
      case 'image':
        return (
          <Box key={i} sx={{ my: 4 }}>
            <Box
              component="img"
              src={block.src}
              alt={block.alt}
              loading="lazy"
              sx={{ width: '100%', borderRadius: 3, border: `1px solid ${borderColor}`, boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.4)' : '0 16px 40px rgba(15,23,42,0.1)' }}
            />
            {block.caption && (
              <Typography sx={{ color: mutedColor, fontSize: '0.85rem', textAlign: 'center', mt: 1.5, fontStyle: 'italic' }}>
                {block.caption}
              </Typography>
            )}
          </Box>
        );
      case 'cta':
        return (
          <Box key={i} sx={{ my: 5, p: { xs: 3, md: 4 }, borderRadius: 4, textAlign: 'center', background: `linear-gradient(135deg, ${accent}, #8b5cf6)` }}>
            <Typography sx={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, mb: 2 }}>
              Prêt à reprendre le contrôle ?
            </Typography>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate(block.href)}
              sx={{ bgcolor: '#fff', color: accent, textTransform: 'none', fontWeight: 800, fontSize: '1rem', px: 4, py: 1.2, borderRadius: 3, '&:hover': { bgcolor: '#f1f5f9' } }}
            >
              {block.text}
            </Button>
            <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem', mt: 1.5 }}>
              30 jours d'essai gratuit — sans carte bancaire
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ py: { xs: 5, md: 8 }, minHeight: '100vh' }}>
      <Container maxWidth="md">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/blog')} sx={{ color: mutedColor, textTransform: 'none', fontWeight: 600, mb: 3, '&:hover': { color: accent } }}>
            Tous les articles
          </Button>

          <Chip label={post.category} size="small" sx={{ mb: 2.5, bgcolor: `${accent}15`, color: accent, fontWeight: 700 }} />

          <Typography variant="h1" sx={{ fontSize: { xs: '1.9rem', md: '2.7rem' }, fontWeight: 800, color: headingColor, mb: 2, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            {post.title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: mutedColor, fontSize: '0.9rem', mb: 4 }}>
            <span>{formatDate(post.date)}</span>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 16 }} /> {post.readingTime}
            </Box>
          </Box>

          <Box
            component="img"
            src={post.cover}
            alt={post.title}
            sx={{ width: '100%', borderRadius: 4, border: `1px solid ${borderColor}`, mb: 5, boxShadow: isDark ? '0 20px 50px rgba(0,0,0,0.45)' : '0 20px 50px rgba(15,23,42,0.12)' }}
          />

          {post.body.map(renderBlock)}

          {/* Articles liés */}
          {related.length > 0 && (
            <>
              <Divider sx={{ my: 6, borderColor }} />
              <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: headingColor, mb: 3 }}>
                À lire aussi
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                {related.map((r) => (
                  <Box
                    key={r.slug}
                    onClick={() => navigate(`/blog/${r.slug}`)}
                    sx={{ cursor: 'pointer', borderRadius: 3, overflow: 'hidden', border: `1px solid ${borderColor}`, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-3px)' } }}
                  >
                    <Box sx={{ height: 140, backgroundImage: `url(${r.cover})`, backgroundSize: 'cover', backgroundPosition: 'top center' }} />
                    <Box sx={{ p: 2.5 }}>
                      <Typography sx={{ fontWeight: 700, color: headingColor, fontSize: '1rem', lineHeight: 1.3 }}>
                        {r.title}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </motion.div>
      </Container>
    </Box>
  );
}
