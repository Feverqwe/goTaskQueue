import React, {FC, useCallback} from 'react';
import {Button} from '@mui/material';
import {Template} from '../../RootStore/RootStoreProvider';
import DialogMenu from '../../DialogMenu/DialogMenu';
import DialogMenuItem from '../../DialogMenu/DialogMenuItem';

interface TemplateBtnProps {
  template: Template;
  onClick: (template: Template, as?: boolean) => void;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onClone: (template: Template) => void;
}

const TemplateBtn: FC<TemplateBtnProps> = ({template, onClick, onEdit, onDelete, onClone}) => {
  const {name} = template;
  const [showMenu, setShowMenu] = React.useState(false);

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
    onEdit(template);
    handleCloseMenu();
  }, [template, onEdit, handleCloseMenu]);

  const handleDelete = useCallback(() => {
    onDelete(template);
    handleCloseMenu();
  }, [template, onDelete, handleCloseMenu]);

  const handleClone = useCallback(() => {
    onClone(template);
    handleCloseMenu();
  }, [template, onClone, handleCloseMenu]);

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
      <DialogMenu open={showMenu} onClose={handleCloseMenu}>
        {!template.variables.length && (
          <DialogMenuItem onClick={handleRunAs}>Run as</DialogMenuItem>
        )}
        <DialogMenuItem onClick={handleEdit}>Edit</DialogMenuItem>
        <DialogMenuItem onClick={handleClone}>Clone</DialogMenuItem>
        <DialogMenuItem onClick={handleDelete}>Delete</DialogMenuItem>
      </DialogMenu>
    </>
  );
};

export default TemplateBtn;
