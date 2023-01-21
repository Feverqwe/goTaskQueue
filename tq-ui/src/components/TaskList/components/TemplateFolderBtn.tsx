import {Button, Dialog, DialogContent, DialogTitle} from '@mui/material';
import React, {FC, useCallback, useState} from 'react';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import {TemplateFolder} from '../../RootStore/RootStoreProvider';
import {TemplateBtnProps} from './TemplateBtn';
import TemplatesBtns from './TemplatesBtns';
import OrderTemplatesDialog from './OrderTemplatesDialog';
import DialogMenuItem from '../../DialogMenu/DialogMenuItem';
import DialogMenu from '../../DialogMenu/DialogMenu';

export interface TemplateFolderBtnProps extends Omit<TemplateBtnProps, 'template'> {
  onNew: (folder: TemplateFolder) => void;
}

const TemplateFolderBtn: FC<TemplateFolderBtnProps> = ({ folder, onClick, onClone, onDelete, onNew, onEdit }) => {
  const { name } = folder;
  const [showMenu, setShowMenu] = useState(false);
  const [showCtxMenu, setShowCtxMenu] = useState(false);
  const [showOrderDialog, setOrderDialog] = useState(false);

  const handleClick = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleCloseTemplateDlg = useCallback(() => {
    setOrderDialog(false);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proxyAction = useCallback((fn: (...args: any[]) => any, ...args: any[]) => {
    setShowMenu(false);
    return fn(...args);
  }, []);

  const handleCtxMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    setShowCtxMenu(true);
  }, []);

  const handleCloseCtxMenu = useCallback(() => {
    setShowCtxMenu(false);
  }, []);

  const handleOrder = useCallback(() => {
    handleCloseCtxMenu();
    setOrderDialog(true);
  }, [handleCloseCtxMenu]);

  const handleNew = useCallback(() => {
    onNew(folder);
    handleCloseCtxMenu();
  }, [folder, onNew, handleCloseCtxMenu]);

  return (
    <>
      <Button
        sx={{ m: 1, mt: 0, flexGrow: { xs: 1, sm: 0 } }}
        variant="outlined"
        onClick={handleClick}
        onContextMenu={handleCtxMenu}
        startIcon={<FolderOutlinedIcon />}
      >
        {name}
      </Button>
      <DialogMenu open={showCtxMenu} onClose={handleCloseCtxMenu} title={name}>
        <DialogMenuItem onClick={handleNew}>New</DialogMenuItem>
        <DialogMenuItem onClick={handleOrder}>Order</DialogMenuItem>
      </DialogMenu>
      <Dialog open={showMenu} onClose={handleCloseMenu} title={name}>
        <DialogTitle>
          {name}
        </DialogTitle>
        <DialogContent>
          <TemplatesBtns
            folder={folder}
            onClick={proxyAction.bind(null, onClick)}
            onEdit={proxyAction.bind(null, onEdit)}
            onDelete={onDelete}
            onClone={onClone}
            onNew={onNew}
          />
        </DialogContent>
      </Dialog>
      {showOrderDialog && (
        <OrderTemplatesDialog open={true} folder={folder} onClose={handleCloseTemplateDlg} />
      )}
    </>
  );
};

export default TemplateFolderBtn;
