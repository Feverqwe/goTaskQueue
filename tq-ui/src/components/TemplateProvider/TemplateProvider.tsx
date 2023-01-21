import React, {FC, ReactNode, useCallback, useContext, useState} from 'react';
import {TemplatesCtx} from './TemplatesCtx';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import {TemplatesUpdateCtx} from './TemplatesUpdateCtx';
import {TemplateFolder, TemplateType} from '../RootStore/RootStoreProvider';
import {api} from '../../tools/api';

interface TemplateProviderProps {
  children: ReactNode;
}

const TemplateProvider: FC<TemplateProviderProps> = ({children}) => {
  const {templates: initTemplates} = useContext(RootStoreCtx);
  const [rootFolder, setTemplates] = useState<TemplateFolder>(() => {
    return {type: TemplateType.Folder, name: '', templates: initTemplates};
  });

  const updateTemplates = useCallback(async ({templates}: Pick<TemplateFolder, 'templates'>) => {
    await api.setTemplates({templates});
    const freshTemplates = await api.templates();
    setTemplates({type: TemplateType.Folder, name: '', templates: freshTemplates});
  }, []);

  return (
    <TemplatesUpdateCtx.Provider value={updateTemplates}>
      <TemplatesCtx.Provider value={rootFolder}>
        {children}
      </TemplatesCtx.Provider>
    </TemplatesUpdateCtx.Provider>
  );
};

export default TemplateProvider;
