import {createContext} from 'react';
import {RawTemplate, TemplateFolder, TemplateType} from '../types';

export const TemplatesCtx = createContext<{
  rootFolder: TemplateFolder;
  templates: RawTemplate[];
  templateOrder: string[];
}>({
  rootFolder: {
    type: TemplateType.Folder,
    place: '',
    name: '',
    templates: [],
  },
  templates: [],
  templateOrder: [],
});
