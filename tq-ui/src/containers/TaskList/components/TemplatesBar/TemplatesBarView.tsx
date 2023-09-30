import React, {FC} from 'react';
import {TemplateType} from '../../../../components/types';
import TemplateBtn, {TemplateBtnProps} from './TemplateBtn';
import TemplateFolderBtn, {TemplateFolderBtnProps} from './TemplateFolderBtn';

interface TemplatesBarViewProps
  extends Omit<TemplateBtnProps, 'template'>,
    Omit<TemplateFolderBtnProps, 'template'> {}

const TemplatesBarView: FC<TemplatesBarViewProps> = ({folder, ...props}) => {
  const {templates} = folder;

  return (
    <>
      {templates.map((template) => {
        if (template.type === TemplateType.Folder) {
          return <TemplateFolderBtn key={template.place} template={template} {...props} />;
        }
        return <TemplateBtn key={template.place} folder={folder} template={template} {...props} />;
      })}
    </>
  );
};

export default TemplatesBarView;
