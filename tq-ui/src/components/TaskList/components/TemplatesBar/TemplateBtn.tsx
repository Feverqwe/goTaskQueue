import React, {FC, useCallback, useState} from 'react';
import {Button, Divider} from '@mui/material';
import {Template, TemplateButton, TemplateFolder} from '../../../RootStore/RootStoreProvider';
import DialogMenu from '../../../DialogMenu/DialogMenu';
import DialogMenuItem from '../../../DialogMenu/DialogMenuItem';

export interface TemplateBtnProps {
  folder: TemplateFolder;
  template: TemplateButton;
  onClick: (template: TemplateButton, as?: boolean) => void;
  onEdit: (folder: TemplateFolder, template: TemplateButton) => void;
  onDelete: (folder: TemplateFolder, template: Template) => void;
  onClone: (folder: TemplateFolder, template: Template) => void;
  onMove: (folder: TemplateFolder, template: Template) => void;
}

const TemplateBtn: FC<TemplateBtnProps> = ({folder, template, onClick, onEdit, onDelete, onClone, onMove}) => {
  const {name} = template;
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = useCallback(() => {
    onClick(template);
  }, [template, onClick]);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleRunAs = useCallback(() => {
    onClick(template, true);
    handleCloseMenu();
  }, [template, onClick, handleCloseMenu]);

  const handleEdit = useCallback(() => {
    onEdit(folder, template);
    handleCloseMenu();
  }, [folder, template, onEdit, handleCloseMenu]);

  const handleDelete = useCallback(() => {
    onDelete(folder, template);
    handleCloseMenu();
  }, [folder, template, onDelete, handleCloseMenu]);

  const handleClone = useCallback(() => {
    onClone(folder, template);
    handleCloseMenu();
  }, [folder, template, onClone, handleCloseMenu]);

  const handleMove = useCallback(() => {
    onMove(folder, template);
    handleCloseMenu();
  }, [folder, template, onMove, handleCloseMenu]);

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
        <DialogMenuItem onClick={handleMove}>Move</DialogMenuItem>
        <DialogMenuItem onClick={handleClone}>Clone</DialogMenuItem>
        <Divider />
        <DialogMenuItem onClick={handleDelete}>Delete</DialogMenuItem>
      </DialogMenu>
    </>
  );
};

export default TemplateBtn;
