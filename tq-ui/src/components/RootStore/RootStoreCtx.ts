import {createContext} from 'react';
import {RootStore} from './RootStoreProvider';
import {themes} from '../../constants';

export const RootStoreCtx = createContext<RootStore>({templates: [], isPtySupported: true, theme: themes[0]});
