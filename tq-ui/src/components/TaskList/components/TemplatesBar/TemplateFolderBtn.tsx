import {Button, Dialog, DialogContent, DialogTitle, Divider} from '@mui/material';
import React, {FC, useCallback, useMemo, useState} from 'react';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import {TemplateFolder} from '../../../RootStore/RootStoreProvider';
import {TemplateBtnProps} from './TemplateBtn';
import TemplatesBarView from './TemplatesBarView';
import DialogMenuItem from '../../../DialogMenu/DialogMenuItem';
import DialogMenu from '../../../DialogMenu/DialogMenu';

export interface TemplateFolderBtnProps extends Omit<TemplateBtnProps, 'template'> {
  template: TemplateFolder;
  onNew: (folder: TemplateFolder) => void;
  onNewFolder: (folder: TemplateFolder) => void;
  onEditFolder: (folder: TemplateFolder, template: TemplateFolder) => void;
}

const TemplateFolderBtn: FC<TemplateFolderBtnProps> = ({
  folder,
  template,
  onClick,
  onClone,
  onDelete,
  onNew,
  onNewFolder,
  onEdit,
  onEditFolder,
  onMove,
}) => {
  const {name} = template;
  const [showMenu, setShowMenu] = useState(false);
  const [showCtxMenu, setShowCtxMenu] = useState(false);

  const handleClick = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const withCloseMenu = useMemo(() => {
    function proxy<T extends (...args: Parameters<T>) => void>(fn: T) {
      return (...args: Parameters<T>) => {
        fn(...args);
        setShowMenu(false);
      };
    }
    return proxy;
  }, []);

  const handleCtxMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    setShowCtxMenu(true);
  }, []);

  const handleCloseCtxMenu = useCallback(() => {
    setShowCtxMenu(false);
  }, []);

  const handleNew = useCallback(() => {
    onNew(template);
    handleCloseCtxMenu();
  }, [template, onNew, handleCloseCtxMenu]);

  const handleNewFolder = useCallback(() => {
    onNewFolder(template);
    handleCloseCtxMenu();
  }, [template, onNewFolder, handleCloseCtxMenu]);

  const handleEditFolder = useCallback(() => {
    onEditFolder(folder, template);
    handleCloseCtxMenu();
  }, [folder, template, onEditFolder, handleCloseCtxMenu]);

  const handleDelete = useCallback(() => {
    onDelete(folder, template);
    handleCloseCtxMenu();
  }, [folder, template, onDelete, handleCloseCtxMenu]);

  const handleMove = useCallback(() => {
    onMove(folder, template);
    handleCloseCtxMenu();
  }, [onMove, folder, template, handleCloseCtxMenu]);

  return (
    <>
      <Button
        sx={{m: 1, mt: 0, flexGrow: {xs: 1, sm: 0}}}
        variant="outlined"
        onClick={handleClick}
        onContextMenu={handleCtxMenu}
        startIcon={<FolderOutlinedIcon />}
      >
        {name}
      </Button>
      <DialogMenu open={showCtxMenu} onClose={handleCloseCtxMenu} title={name}>
        <DialogMenuItem onClick={handleNew}>New template</DialogMenuItem>
        <DialogMenuItem onClick={handleNewFolder}>New folder</DialogMenuItem>
        <Divider />
        <DialogMenuItem onClick={handleEditFolder}>Edit</DialogMenuItem>
        <DialogMenuItem onClick={handleMove}>Move</DialogMenuItem>
        <Divider />
        <DialogMenuItem onClick={handleDelete}>Delete</DialogMenuItem>
      </DialogMenu>
      <Dialog open={showMenu} onClose={handleCloseMenu} title={name}>
        <DialogTitle>{name}</DialogTitle>
        <DialogContent>
          <TemplatesBarView
            folder={template}
            onClick={withCloseMenu(onClick)}
            onEdit={withCloseMenu(onEdit)}
            onMove={withCloseMenu(onMove)}
            onClone={onClone}
            onDelete={onDelete}
            onNew={onNew}
            onNewFolder={onNewFolder}
            onEditFolder={onEditFolder}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TemplateFolderBtn;
