import React, {FC, ReactNode} from 'react';
import {RootStoreCtx} from './RootStoreCtx';
import {RootStore} from '../types';

declare const ROOT_STORE: RootStore | undefined;

const rootStore = ('ROOT_STORE' in window && ROOT_STORE) as RootStore;

interface RootStoreProviderProps {
  children: ReactNode;
}

const RootStoreProvider: FC<RootStoreProviderProps> = ({children}) => {
  return <RootStoreCtx.Provider value={rootStore}>{children}</RootStoreCtx.Provider>;
};

export default RootStoreProvider;
