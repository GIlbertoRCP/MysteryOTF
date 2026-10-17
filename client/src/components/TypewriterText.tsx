import React, { useEffect, useState } from 'react';
import { soundFx } from '../utils/audio';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
}

/** Types text out; clicking it reveals the rest at once. */
export const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 18, className = '' }) => {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
  }, [text]);

  useEffect(() => {
    if (shown >= text.length) return;
    const id = setTimeout(() => {
      setShown(n => Math.min(text.length, n + 2));
      if (Math.random() < 0.25) soundFx.tick();
    }, speed);
    return () => clearTimeout(id);
  }, [shown, text, speed]);

  const done = shown >= text.length;
  return (
    <span className={className} onClick={() => setShown(text.length)}>
      {text.slice(0, shown)}
      {!done && <span className="typewriter-cursor" />}
    </span>
  );
};
