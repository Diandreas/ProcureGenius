/**
 * AdBanner Component
 * Displays Google AdMob ads for FREE plan users
 */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { Colors, Spacing } from '../../constants/theme';

const ADMOB_UNIT_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111', // Test ID - Replace with your actual ID
    rectangle: 'ca-app-pub-3940256099942544/6300978111',
    leaderboard: 'ca-app-pub-3940256099942544/6300978111',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716', // Test ID - Replace with your actual ID
    rectangle: 'ca-app-pub-3940256099942544/2934735716',
    leaderboard: 'ca-app-pub-3940256099942544/2934735716',
  },
};

interface AdBannerProps {
  format?: 'banner' | 'rectangle' | 'leaderboard' | 'smart';
  style?: any;
}

const AdBanner: React.FC<AdBannerProps> = ({ format = 'banner', style }) => {
  const getAdSize = () => {
    switch (format) {
      case 'banner':
        return BannerAdSize.BANNER;
      case 'rectangle':
        return BannerAdSize.MEDIUM_RECTANGLE;
      case 'leaderboard':
        return BannerAdSize.LEADERBOARD;
      case 'smart':
        return BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
      default:
        return BannerAdSize.BANNER;
    }
  };

  const getUnitId = () => {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    return ADMOB_UNIT_IDS[platform][format] || ADMOB_UNIT_IDS[platform].banner;
  };

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={__DEV__ ? TestIds.BANNER : getUnitId()}
        size={getAdSize()}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log('Ad loaded');
        }}
        onAdFailedToLoad={(error) => {
          console.error('Ad failed to load:', error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
});

export default AdBanner;
