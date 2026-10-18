import { useEffect, useState } from 'react';

const PHONE_QUERY = '(max-width: 767px)';

/** True on phone-sized screens; updates on resize and rotation. */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isPhone;
}

/** True when the main pointer is a finger rather than a mouse. */
export const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;
