import {DependencyList, EffectCallback, useEffect, useMemo, useRef, useState} from 'react';

export const useEffectWhenVisible = (effect: (isInit: boolean) => ReturnType<EffectCallback>, deps: DependencyList) => {
  const refInit = useRef(true);
  const [isHidden, setHidden] = useState(document.hidden);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subEffect = useMemo(() => effect, deps);

  useEffect(() => {
    if (isHidden) return;
    const isInit = refInit.current;
    refInit.current = false;
    return subEffect(isInit);
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
