import {DependencyList, EffectCallback, useCallback, useEffect, useState} from 'react';

export const useEffectWhenVisible = (effect: EffectCallback, deps: DependencyList) => {
  const [isHidden, setHidden] = useState(document.hidden);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subEffect = useCallback(() => effect(), deps);

  useEffect(() => {
    if (isHidden) return;
    return subEffect();
  }, [isHidden, subEffect]);

  useEffect(() => {
    const handler = () => {
      setHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }, []);
};
