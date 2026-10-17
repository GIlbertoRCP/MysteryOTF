import React, { useState, useEffect } from 'react';
import { soundFx } from '../utils/audio';

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per char
  onComplete?: () => void;
  className?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 25,
  onComplete,
  className = ''
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
        if (Math.random() > 0.4) {
          soundFx.playTypewriterTick();
        }
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={`${className} font-courier`}>
      {displayedText}
      {currentIndex < text.length && <span className="typewriter-cursor"></span>}
    </span>
  );
};
