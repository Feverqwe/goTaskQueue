import React, {FC, ReactNode, useCallback, useContext, useState} from 'react';
import {GroupStateCtx} from './GroupStateCtx';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import {GroupStateSetCtx} from './GroupStateSetCtx';
import {api} from '../../tools/api';

const PREFIX = 'group:';

interface GroupStateProps {
  children: ReactNode;
}

const GroupStateProvider: FC<GroupStateProps> = ({children}) => {
  const {memStorage: initMemStorage} = useContext(RootStoreCtx);
  const [groupState, setSetGroupState] = useState(() => getGroupState(initMemStorage));

  const setState = useCallback(async (name: string, state: boolean) => {
    await api.memStorageSet({[`${PREFIX}${name}`]: state});
    const freshMemStorage = await api.memStorageGet(null);
    setSetGroupState(getGroupState(freshMemStorage));
  }, []);

  return (
    <GroupStateSetCtx.Provider value={setState}>
      <GroupStateCtx.Provider value={groupState}>{children}</GroupStateCtx.Provider>
    </GroupStateSetCtx.Provider>
  );
};

function getGroupState(storage: Record<string, unknown>) {
  const result: Record<string, boolean> = {};
  Object.entries(storage).forEach(([key, value]) => {
    if (key.slice(0, 6) === PREFIX && typeof value === 'boolean') {
      result[key.slice(6)] = value;
    }
  });
  return result;
}

export default GroupStateProvider;
