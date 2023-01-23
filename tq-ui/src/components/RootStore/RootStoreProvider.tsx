import React, {FC, ReactNode} from 'react';
import {RootStoreCtx} from './RootStoreCtx';

export type Template = TemplateButton | TemplateFolder;

export enum TemplateType {
  Folder = 'folder',
  Button = 'button'
}

export interface TemplateFolder {
  type: TemplateType.Folder;
  name: string;
  templates: Template[];
}

export interface TemplateButton {
  type?: TemplateType.Button;
  label?: string;
  group?: string;
  name: string,
  variables: {
    name: string,
    value: string,
    defaultValue?: string;
  }[],
  command: string,
  isPty?: boolean,
  isOnlyCombined?: boolean,
}

export interface RootStore {
  templates: Template[];
  memStorage: Record<string, unknown>;
  isPtySupported: boolean;
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
