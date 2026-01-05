export const messageIn = {
  hidden: { opacity: 0, y: 5, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

export const messageExit = {
  exit: {
    opacity: 0,
    y: -5,
    scale: 0.98,
    transition: { duration: 0.2 }
  }
};

export const typingIndicator = {
  bounce: {
    y: [0, -3, 0],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export const avatarFloat = {
  float: {
    y: [0, -1, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export const chatBubbleIn = {
  hidden: { opacity: 0, scale: 0.97, x: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  }
};

export const inputFocus = {
  rest: { scale: 1 },
  focus: {
    scale: 1.005,
    transition: { duration: 0.2 }
  }
};
