import {createContext} from 'react';
import {Template} from '../RootStore/RootStoreProvider';

export const TemplatesUpdateCtx = createContext<(templates: Template[]) => Promise<void>>(async () => {});
