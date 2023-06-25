import {createContext} from 'react';
import {RootStore} from '../types';

export const RootStoreCtx = createContext<RootStore>({
  templateOrder: [],
  templates: [],
  memStorage: {},
  isPtySupported: true,
});
