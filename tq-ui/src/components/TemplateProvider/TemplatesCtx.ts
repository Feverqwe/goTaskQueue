import {createContext} from 'react';
import {Template} from '../RootStore/RootStoreProvider';

export const TemplatesCtx = createContext<Template[]>([]);
