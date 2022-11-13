import React, {FC, useCallback, useContext, useState} from 'react';
import {Box, Button, ButtonGroup, Menu, MenuItem} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {api} from '../../../tools/api';
import {Template} from '../../RootStore/RootStoreProvider';
import TemplateDialog from './TemplateDialog';
import {RootStoreCtx} from '../../RootStore/RootStoreCtx';

interface TaskInputProps {
  onUpdate: () => void;
}

const TaskInput: FC<TaskInputProps> = ({onUpdate}) => {
  const {templates} = useContext(RootStoreCtx);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [templateDlgParams, setTemplateDlgParams] = useState<{template: Template, isNew?: boolean} | null>(null);

  const handleAdd = useCallback(async (run: boolean, command: string, label: string, isPty: boolean) => {
    try {
      const {id} = await api.add({
        command,
        label,
        isPty,
      });
      if (run) {
        await api.taskRun({id});
      }
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  }, [onUpdate]);

  const handleShowMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleReloadConfig = useCallback(async () => {
    await api.reloadConfig();
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleOpenTemplateDlg = useCallback((template: Template, isNew?: boolean) => {
    setTemplateDlgParams({template, isNew});
  }, []);

  const handleCloseTemplateDlg = useCallback(() => {
    setTemplateDlgParams(null);
  }, []);

  const handleRunAs = useCallback(() => {
    handleOpenTemplateDlg({name: 'Run as', variables: [], command: '', isPty: false}, true);
  }, [handleOpenTemplateDlg]);

  return (
    <>
      <Box display="flex" flexWrap="wrap" mt={1}>
        <ButtonGroup sx={{m: 1, mt: 0}} variant="outlined">
          <Button sx={{p: 0}} onClick={handleShowMenu}>
            <MenuIcon />
          </Button>
          <Button onClick={handleRunAs}>Run as</Button>
        </ButtonGroup>
        {templates.map((template, index) => {
          const {name} = template;
          return (
            <Button
              key={index}
              sx={{m: 1, mt: 0}}
              variant="outlined"
              onClick={handleOpenTemplateDlg.bind(null, template, undefined)}
            >
              {name}
            </Button>
          );
        })}
      </Box>
      <Menu open={Boolean(anchorEl)} onClose={handleCloseMenu} anchorEl={anchorEl}>
        <MenuItem onClick={handleReloadConfig}>Reload config</MenuItem>
      </Menu>
      {templateDlgParams && (
        <TemplateDialog {...templateDlgParams} onSubmit={handleAdd} onClose={handleCloseTemplateDlg} />
      )}
    </>
  );
};

export default TaskInput;
