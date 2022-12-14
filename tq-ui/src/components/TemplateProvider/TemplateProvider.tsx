import React, {FC, ReactNode, useCallback, useContext, useState} from 'react';
import {TemplatesCtx} from './TemplatesCtx';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import {TemplatesUpdateCtx} from './TemplatesUpdateCtx';
import {Template} from '../RootStore/RootStoreProvider';
import {api} from '../../tools/api';

interface TemplateProviderProps {
  children: ReactNode;
}

const TemplateProvider: FC<TemplateProviderProps> = ({children}) => {
  const {templates: initTemplates} = useContext(RootStoreCtx);
  const [templates, setTemplates] = useState(initTemplates);

  const updateTemplates = useCallback(async (templates: Template[]) => {
    await api.setTemplates({templates});
    const freshTemplates = await api.templates();
    setTemplates(freshTemplates);
  }, []);

  return (
    <TemplatesUpdateCtx.Provider value={updateTemplates}>
      <TemplatesCtx.Provider value={templates}>
        {children}
      </TemplatesCtx.Provider>
    </TemplatesUpdateCtx.Provider>
  );
};

export default TemplateProvider;
