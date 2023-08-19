import React, {FC, SyntheticEvent, useCallback, useState} from 'react';
import {Button, Divider} from '@mui/material';
import {TemplateButton, TemplateFolder} from '../../../../components/types';
import DialogMenu from '../../../../components/DialogMenu/DialogMenu';
import DialogMenuItem from '../../../../components/DialogMenu/DialogMenuItem';

export interface TemplateBtnProps {
  folder: TemplateFolder;
  template: TemplateButton;
  onClick: (e: SyntheticEvent, template: TemplateButton, as?: boolean) => void;
  onEdit: (folder: TemplateFolder, template: TemplateButton) => void;
  onDelete: (template: TemplateButton) => void;
  onClone: (folder: TemplateFolder, template: TemplateButton) => void;
}

const TemplateBtn: FC<TemplateBtnProps> = ({
  folder,
  template,
  onClick,
  onEdit,
  onDelete,
  onClone,
}) => {
  const {name} = template;
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = useCallback(
    (e: SyntheticEvent) => {
      onClick(e, template);
    },
    [template, onClick],
  );

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleRunAs = useCallback(
    (e: SyntheticEvent) => {
      onClick(e, template, true);
      handleCloseMenu();
    },
    [template, onClick, handleCloseMenu],
  );

  const handleEdit = useCallback(() => {
    onEdit(folder, template);
    handleCloseMenu();
  }, [folder, template, onEdit, handleCloseMenu]);

  const handleDelete = useCallback(() => {
    onDelete(template);
    handleCloseMenu();
  }, [template, onDelete, handleCloseMenu]);

  const handleClone = useCallback(() => {
    onClone(folder, template);
    handleCloseMenu();
  }, [folder, template, onClone, handleCloseMenu]);

  const handleCtxMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    setShowMenu(true);
  }, []);

  return (
    <>
      <Button
        sx={{m: 1, mt: 0, flexGrow: {xs: 1, sm: 0}}}
        variant="outlined"
        onClick={handleClick}
        onContextMenu={handleCtxMenu}
      >
        {name}
      </Button>
      <DialogMenu open={showMenu} onClose={handleCloseMenu} title={name}>
        {!template.variables.length && (
          <>
            <DialogMenuItem onClick={handleRunAs}>Run as</DialogMenuItem>
            <Divider />
          </>
        )}
        <DialogMenuItem onClick={handleEdit}>Edit</DialogMenuItem>
        <DialogMenuItem onClick={handleClone}>Clone</DialogMenuItem>
        <Divider />
        <DialogMenuItem onClick={handleDelete}>Delete</DialogMenuItem>
      </DialogMenu>
    </>
  );
};

export default TemplateBtn;
