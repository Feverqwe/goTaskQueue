import React, {FC} from 'react';
import {Template, TemplateType} from '../../RootStore/RootStoreProvider';
import TemplateBtn, {TemplateBtnProps} from './TemplateBtn';
import TemplateFolderBtn from './TemplateFolderBtn';

interface TemplatesBtnsProps extends Omit<TemplateBtnProps, 'template'> {
  templates: Template[];
}

const TemplatesBtns: FC<TemplatesBtnsProps> = ({templates, onDelete, onEdit, onClone, onClick}) => {
  return (
    <>
      {templates.map((template, index) => {
        if (template.type === TemplateType.Folder) {
          return (
            <TemplateFolderBtn
              key={index}
              template={template}
              onClick={onClick}
              onEdit={onEdit}
              onDelete={onDelete}
              onClone={onClone}
            />
          );
        }
        return (
          <TemplateBtn
            key={index}
            template={template}
            onClick={onClick}
            onEdit={onEdit}
            onDelete={onDelete}
            onClone={onClone}
          />
        );
      })}
    </>
  );
};

export default TemplatesBtns;
