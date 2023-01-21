import React, {FC} from 'react';
import {TemplateFolder, TemplateType} from '../../RootStore/RootStoreProvider';
import TemplateBtn, {TemplateBtnProps} from './TemplateBtn';
import TemplateFolderBtn from './TemplateFolderBtn';

interface TemplatesBtnsProps extends Omit<TemplateBtnProps, 'template'> {
  folder: Pick<TemplateFolder, 'templates'>;
}

const TemplatesBtns: FC<TemplatesBtnsProps> = ({folder: {templates}, onDelete, onEdit, onClone, onClick}) => {
  return (
    <>
      {templates.map((template, index) => {
        if (template.type === TemplateType.Folder) {
          return (
            <TemplateFolderBtn
              key={index}
              folder={template}
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
