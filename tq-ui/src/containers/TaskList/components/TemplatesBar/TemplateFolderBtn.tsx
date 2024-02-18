import {Button, Dialog, DialogContent, DialogTitle, Divider} from '@mui/material';
import React, {FC, useCallback, useMemo, useState} from 'react';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import {TemplateFolder} from '../../../../components/types';
import {TemplateBtnProps} from './TemplateBtn';
import TemplatesBarView from './TemplatesBarView';
import DialogMenuItem from '../../../../components/DialogMenu/DialogMenuItem';
import DialogMenu from '../../../../components/DialogMenu/DialogMenu';

export interface TemplateFolderBtnProps extends Omit<TemplateBtnProps, 'template' | 'folder'> {
  template: TemplateFolder;
  onNew: (folder: TemplateFolder) => void;
  onMoveFolder: (folder: TemplateFolder) => void;
}

const TemplateFolderBtn: FC<TemplateFolderBtnProps> = ({
  template,
  onClick,
  onClone,
  onDelete,
  onNew,
  onMoveFolder,
  onEdit,
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
    function proxy<T extends (...args: Parameters<T>) => Promise<void> | void>(fn: T) {
      return async (...args: Parameters<T>) => {
        await fn(...args);
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

  const handleMoveFolder = useCallback(() => {
    onMoveFolder(template);
    handleCloseCtxMenu();
  }, [template, onMoveFolder, handleCloseCtxMenu]);

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
        <Divider />
        <DialogMenuItem onClick={handleMoveFolder}>Rename folder</DialogMenuItem>
      </DialogMenu>
      <Dialog open={showMenu} onClose={handleCloseMenu} title={name}>
        <DialogTitle>{name}</DialogTitle>
        <DialogContent>
          <TemplatesBarView
            folder={template}
            onClick={withCloseMenu(onClick)}
            onEdit={withCloseMenu(onEdit)}
            onClone={onClone}
            onDelete={onDelete}
            onNew={onNew}
            onMoveFolder={onMoveFolder}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TemplateFolderBtn;
