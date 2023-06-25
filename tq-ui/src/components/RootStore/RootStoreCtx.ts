import {createContext} from 'react';
import {RootStore} from '../types';

export const RootStoreCtx = createContext<RootStore>({
  templates: [],
  memStorage: {},
  isPtySupported: true,
});
