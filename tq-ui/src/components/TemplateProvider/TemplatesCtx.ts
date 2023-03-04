import {createContext} from 'react';
import {TemplateFolder, TemplateType} from '../RootStore/RootStoreProvider';

export const TemplatesCtx = createContext<TemplateFolder>({
  type: TemplateType.Folder,
  name: '',
  templates: [],
});
