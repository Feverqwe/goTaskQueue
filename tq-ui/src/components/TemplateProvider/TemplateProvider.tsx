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
  const {templates: initTemplates, templateOrder: initTemplateOrder} = useContext(RootStoreCtx);
  const [rawTemplates, setRawTemplates] = useState<RawTemplate[]>(initTemplates);
  const [templateOrder, setTemplateOrder] = useState<string[]>(initTemplateOrder);

  const updateTemplates = useCallback(async () => {
    const [templatesLocal, order] = await Promise.all([api.templates(), api.getTemplateOrder()]);
    setTemplateOrder(order);
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

    rawTemplates.forEach(({place}) => {
      if (!templateOrder.includes(place)) {
        templateOrder.push(place);
      }
    });

    rawTemplates.sort(({place: a}, {place: b}) => {
      const ap = templateOrder.indexOf(a);
      const bp = templateOrder.indexOf(b);
      return ap > bp ? 1 : -1;
    });

    rawTemplates.forEach((template) => {
      const {place} = template;

      const folder = ensureFolders(place);

      folder.templates.push({
        type: TemplateType.Button,
        ...template,
      });
    });

    return rootFolder;
  }, [rawTemplates, templateOrder]);

  const value = useMemo(
    () => ({rootFolder, templates: rawTemplates, templateOrder}),
    [rootFolder, rawTemplates, templateOrder],
  );

  return (
    <TemplatesUpdateCtx.Provider value={updateTemplates}>
      <TemplatesCtx.Provider value={value}>{children}</TemplatesCtx.Provider>
    </TemplatesUpdateCtx.Provider>
  );
};

export default TemplateProvider;
