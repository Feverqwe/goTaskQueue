import {useEffect, useState} from 'react';

export const useVisibility = () => {
  const [isHidden, setHidden] = useState(document.hidden);

  useEffect(() => {
    const handler = () => {
      setHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }, []);

  return !isHidden;
};
