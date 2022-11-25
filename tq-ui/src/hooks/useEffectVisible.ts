import {DependencyList, EffectCallback, useEffect, useMemo, useState} from 'react';

export const useEffectWhenVisible = (effect: () => ReturnType<EffectCallback>, deps: DependencyList) => {
  const [isHidden, setHidden] = useState(document.hidden);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subEffect = useMemo(() => effect, deps);

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
