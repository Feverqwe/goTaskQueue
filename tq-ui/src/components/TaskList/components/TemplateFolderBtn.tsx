import {Button, Dialog, DialogContent, DialogTitle} from '@mui/material';
import React, {FC, useCallback} from 'react';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import {TemplateFolder} from '../../RootStore/RootStoreProvider';
import {TemplateBtnProps} from './TemplateBtn';
import TemplatesBtns from './TemplatesBtns';

interface TemplateFolderBtnProps extends Omit<TemplateBtnProps, 'template'> {
  template: TemplateFolder;
}

const TemplateFolderBtn: FC<TemplateFolderBtnProps> = ({ template, onClick, onClone, onDelete, onEdit }) => {
  const { name, templates } = template;
  const [showMenu, setShowMenu] = React.useState(false);

  const handleClick = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proxyAction = useCallback((fn: (...args: any[]) => any, ...args: any[]) => {
    setShowMenu(false);
    return fn(...args);
  }, []);

  return (
    <>
      <Button
        sx={{ m: 1, mt: 0, flexGrow: { xs: 1, sm: 0 } }}
        variant="outlined"
        onClick={handleClick}
        startIcon={<FolderOutlinedIcon />}
      >
        {name}
      </Button>
      <Dialog open={showMenu} onClose={handleCloseMenu} title={name}>
        <DialogTitle>
          {name}
        </DialogTitle>
        <DialogContent>
          <TemplatesBtns
            templates={templates}
            onClick={proxyAction.bind(null, onClick)}
            onEdit={proxyAction.bind(null, onEdit)}
            onDelete={proxyAction.bind(null, onDelete)}
            onClone={proxyAction.bind(null, onClone)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TemplateFolderBtn;
