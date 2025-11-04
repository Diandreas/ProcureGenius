/**
 * ConditionalAdBanner Component
 * Shows ads only for FREE plan users
 */
import React from 'react';
import { useAppSelector } from '../../store/hooks';
import AdBanner from './AdBanner';

interface ConditionalAdBannerProps {
  format?: 'banner' | 'rectangle' | 'leaderboard' | 'smart';
  style?: any;
}

const ConditionalAdBanner: React.FC<ConditionalAdBannerProps> = ({
  format = 'banner',
  style,
}) => {
  const { user } = useAppSelector((state) => state.auth);

  // Only show ads for FREE plan users
  // Assuming user.subscription_plan can be 'free', 'pro', 'enterprise'
  const shouldShowAds = !user?.subscription_plan || user?.subscription_plan === 'free';

  if (!shouldShowAds) {
    return null;
  }

  return <AdBanner format={format} style={style} />;
};

export default ConditionalAdBanner;
