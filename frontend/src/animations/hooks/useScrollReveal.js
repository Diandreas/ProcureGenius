import { useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { useInView } from 'framer-motion';

export const useScrollReveal = (ref, threshold = 0.1) => {
  const controls = useAnimation();
  const isInView = useInView(ref, { once: true, amount: threshold });

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return controls;
};
