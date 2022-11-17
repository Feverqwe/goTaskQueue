import React, {FC, ReactNode} from 'react';
import {RootStoreCtx} from './RootStoreCtx';

export interface Template {
  label?: string;
  name: string,
  variables: {
    name: string,
    value: string,
    defaultValue?: string;
  }[],
  command: string,
  isPty?: boolean,
}

export interface RootStore {
  templates: Template[],
}

declare const ROOT_STORE: RootStore | undefined;

const rootStore = ('ROOT_STORE' in window && ROOT_STORE) as RootStore;

interface RootStoreProviderProps {
  children: ReactNode;
}

const RootStoreProvider: FC<RootStoreProviderProps> = ({children}) => {
  return (
    <RootStoreCtx.Provider value={rootStore}>
      {children}
    </RootStoreCtx.Provider>
  );
};

export default RootStoreProvider;
