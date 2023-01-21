import {createContext} from 'react';
import {TemplateFolder} from '../RootStore/RootStoreProvider';

export const TemplatesUpdateCtx = createContext<(folder: Pick<TemplateFolder, 'templates'>) => Promise<void>>(async () => {});
