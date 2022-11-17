import React, {FC, useCallback} from 'react';
import {Button, Menu, MenuItem} from '@mui/material';
import {Template} from '../../RootStore/RootStoreProvider';

interface TemplateBtnProps {
  template: Template;
  onClick: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  onClone: (template: Template) => void;
}

const TemplateBtn: FC<TemplateBtnProps> = ({template, onClick, onEdit, onDelete, onClone}) => {
  const {name} = template;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = useCallback(() => {
    onClick(template);
  }, [template, onClick]);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

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
    setAnchorEl(e.currentTarget);
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
      {anchorEl && (
        <Menu open={true} onClose={handleCloseMenu} anchorEl={anchorEl}>
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
          <MenuItem onClick={handleClone}>Clone</MenuItem>
          <MenuItem onClick={handleDelete}>Delete</MenuItem>
        </Menu>
      )}
    </>
  );
};

export default TemplateBtn;
