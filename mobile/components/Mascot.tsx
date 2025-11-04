import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Image, ViewStyle } from 'react-native';

interface MascotProps {
  pose?: 'main' | 'happy' | 'excited' | 'thinking' | 'reading' | 'thumbup' | 'error';
  animation?: 'float' | 'bounce' | 'wave' | 'pulse' | 'none';
  size?: number;
  style?: ViewStyle;
}

/**
 * Composant Mascotte réutilisable - Procura
 *
 * @param pose - Type de pose : 'main', 'happy', 'excited', 'thinking', 'reading', 'thumbup', 'error'
 * @param animation - Type d'animation : 'float', 'bounce', 'wave', 'pulse', 'none'
 * @param size - Taille en pixels (défaut: 120)
 * @param style - Styles supplémentaires
 */
export default function Mascot({
  pose = 'main',
  animation = 'none',
  size = 120,
  style,
}: MascotProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  // Mapping des poses aux fichiers
  const poseFiles = {
    main: require('../assets/mascot/main.png'),
    happy: require('../assets/mascot/Procura_happy.png'),
    excited: require('../assets/mascot/Procura_excited.png'),
    thinking: require('../assets/mascot/Procura_thinking.png'),
    reading: require('../assets/mascot/Procura_reading.png'),
    thumbup: require('../assets/mascot/Procura_thumbup.png'),
    error: require('../assets/mascot/procura_error.png'),
  };

  useEffect(() => {
    if (animation === 'none') return;

    const animationConfig = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    animationConfig.start();

    return () => animationConfig.stop();
  }, [animation, animValue]);

  const getAnimationStyle = () => {
    switch (animation) {
      case 'float':
        return {
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -3],
              }),
            },
          ],
        };
      case 'bounce':
        return {
          transform: [
            {
              scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.02],
              }),
            },
          ],
        };
      case 'wave':
        return {
          transform: [
            {
              rotate: animValue.interpolate({
                inputRange: [0, 0.25, 0.75, 1],
                outputRange: ['0deg', '-2deg', '2deg', '0deg'],
              }),
            },
          ],
        };
      case 'pulse':
        return {
          opacity: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.9],
          }),
          transform: [
            {
              scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.03],
              }),
            },
          ],
        };
      default:
        return {};
    }
  };

  return (
    <Animated.Image
      source={poseFiles[pose]}
      style={[
        styles.mascot,
        {
          width: size,
          height: size,
        },
        getAnimationStyle(),
        style,
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  mascot: {
    alignSelf: 'center',
  },
});
