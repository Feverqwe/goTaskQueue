import React, {FC} from 'react';
import {TemplateType} from '../../RootStore/RootStoreProvider';
import TemplateBtn, {TemplateBtnProps} from './TemplateBtn';
import TemplateFolderBtn, {TemplateFolderBtnProps} from './TemplateFolderBtn';

interface TemplatesBtnsProps extends Omit<TemplateBtnProps, 'template'>, TemplateFolderBtnProps {

}

const TemplatesBtns: FC<TemplatesBtnsProps> = ({folder, ...props}) => {
  const {templates} = folder;

  return (
    <>
      {templates.map((template, index) => {
        if (template.type === TemplateType.Folder) {
          return (
            <TemplateFolderBtn
              key={index}
              folder={template}
              {...props}
            />
          );
        }
        return (
          <TemplateBtn
            key={index}
            folder={folder}
            template={template}
            {...props}
          />
        );
      })}
    </>
  );
};

export default TemplatesBtns;
