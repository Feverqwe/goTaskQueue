import React, {FC} from 'react';
import {TemplateType} from '../../../RootStore/RootStoreProvider';
import TemplateBtn, {TemplateBtnProps} from './TemplateBtn';
import TemplateFolderBtn, {TemplateFolderBtnProps} from './TemplateFolderBtn';

interface TemplatesBarViewProps
  extends Omit<TemplateBtnProps, 'template'>,
    Omit<TemplateFolderBtnProps, 'template'> {}

const TemplatesBarView: FC<TemplatesBarViewProps> = ({folder, ...props}) => {
  const {templates} = folder;

  return (
    <>
      {templates.map((template, index) => {
        if (template.type === TemplateType.Folder) {
          return <TemplateFolderBtn key={index} folder={folder} template={template} {...props} />;
        }
        return <TemplateBtn key={index} folder={folder} template={template} {...props} />;
      })}
    </>
  );
};

export default TemplatesBarView;
