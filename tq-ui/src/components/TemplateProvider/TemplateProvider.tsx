import React, {FC, ReactNode, useCallback, useContext, useMemo, useState} from 'react';
import path from 'path-browserify';
import {TemplatesCtx} from './TemplatesCtx';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import {TemplatesUpdateCtx} from './TemplatesUpdateCtx';
import {api} from '../../tools/api';
import {RawTemplate, TemplateFolder, TemplateType} from '../types';

interface TemplateProviderProps {
  children: ReactNode;
}

const TemplateProvider: FC<TemplateProviderProps> = ({children}) => {
  const {templates: initTemplates} = useContext(RootStoreCtx);
  const [rawTemplates, setRawTemplates] = useState<RawTemplate[]>(initTemplates);

  const updateTemplates = useCallback(async () => {
    const templatesLocal = await api.templates();
    setRawTemplates(templatesLocal);
  }, []);

  const rootFolder = useMemo<TemplateFolder>(() => {
    const dirFolder = new Map<string, TemplateFolder>();

    const rootFolder: TemplateFolder = {
      place: '',
      name: '',
      type: TemplateType.Folder,
      templates: [],
    };
    dirFolder.set('', rootFolder);

    const ensureFolders = (dir: string) => {
      let prevFolder = rootFolder;
      dir.split('/').forEach((part, index, parts) => {
        const fragment = parts.slice(0, index).join('/');
        let folder = dirFolder.get(fragment);
        if (!folder) {
          folder = {
            place: fragment,
            name: path.basename(fragment),
            type: TemplateType.Folder,
            templates: [],
          };
          dirFolder.set(fragment, folder);
          prevFolder.templates.push(folder);
        }
        prevFolder = folder;
      });
      return prevFolder;
    };

    rawTemplates.forEach((template) => {
      const {place} = template;

      const folder = ensureFolders(place);

      folder.templates.push({
        type: TemplateType.Button,
        ...template,
      });
    });

    return rootFolder;
  }, [rawTemplates]);

  const value = useMemo(() => ({rootFolder, templates: rawTemplates}), [rootFolder, rawTemplates]);

  return (
    <TemplatesUpdateCtx.Provider value={updateTemplates}>
      <TemplatesCtx.Provider value={value}>{children}</TemplatesCtx.Provider>
    </TemplatesUpdateCtx.Provider>
  );
};

export default TemplateProvider;
