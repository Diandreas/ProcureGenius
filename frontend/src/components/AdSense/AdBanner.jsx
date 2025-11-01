/**
 * AdBanner Component
 * Displays Google AdSense ads for FREE plan users
 */
import React, { useEffect, useRef } from 'react';
import { Box, Paper } from '@mui/material';
import { ADSENSE_CLIENT_ID } from './AdSenseScript';

/**
 * Ad formats available:
 * - 'leaderboard': 728x90 (horizontal banner)
 * - 'banner': 468x60 (medium banner)
 * - 'rectangle': 300x250 (medium rectangle)
 * - 'large-rectangle': 336x280 (large rectangle)
 * - 'skyscraper': 120x600 (vertical)
 * - 'wide-skyscraper': 160x600 (wide vertical)
 * - 'responsive': Auto-resize based on container
 */

const AD_FORMATS = {
  'leaderboard': {
    width: 728,
    height: 90,
    format: 'horizontal',
  },
  'banner': {
    width: 468,
    height: 60,
    format: 'horizontal',
  },
  'rectangle': {
    width: 300,
    height: 250,
    format: 'rectangle',
  },
  'large-rectangle': {
    width: 336,
    height: 280,
    format: 'rectangle',
  },
  'skyscraper': {
    width: 120,
    height: 600,
    format: 'vertical',
  },
  'wide-skyscraper': {
    width: 160,
    height: 600,
    format: 'vertical',
  },
  'responsive': {
    width: 'auto',
    height: 'auto',
    format: 'auto',
  },
};

const AdBanner = ({
  format = 'rectangle',
  slot = 'auto', // Ad slot ID (you'll get this from AdSense dashboard)
  style = {},
  className = '',
}) => {
  const adRef = useRef(null);
  const adFormat = AD_FORMATS[format] || AD_FORMATS.rectangle;

  useEffect(() => {
    try {
      // Push ad to AdSense queue
      if (window.adsbygoogle && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <Paper
      elevation={1}
      sx={{
        p: 1,
        mb: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        minHeight: format === 'responsive' ? 100 : adFormat.height,
        ...style,
      }}
      className={className}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          width: adFormat.width === 'auto' ? '100%' : adFormat.width,
          height: adFormat.height === 'auto' ? 'auto' : adFormat.height,
        }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={adFormat.format}
        data-full-width-responsive={format === 'responsive' ? 'true' : 'false'}
      />
    </Paper>
  );
};

export default AdBanner;
