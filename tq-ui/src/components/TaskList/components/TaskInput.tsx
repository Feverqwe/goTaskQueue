import React, {FC, FormEvent, Fragment, useCallback, useRef, useState} from 'react';
import {Box, IconButton, Menu, MenuItem, Paper, TextField} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import {api} from '../../../tools/api';
import {Template} from '../../RootStore/RootStoreProvider';
import TemplateDialog from './TemplateDialog';
import TemplateList from './TemplateList';

interface TaskInputProps {
  onUpdate: () => void;
}

const TaskInput: FC<TaskInputProps> = ({onUpdate}) => {
  const refInput = useRef<HTMLInputElement>();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [template, setTemplate] = useState<Template | null>(null);

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

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const input = refInput.current;
    if (!input) return;

    const {value} = input;
    if (!value) return;

    await handleAdd(false, value, '', false);
    input.value = '';
  }, [handleAdd]);

  const handleShowTemplates = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleCloseTemplates = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelectTemplate = useCallback((template: Template) => {
    setTemplate(template);
    handleCloseTemplates();
  }, [handleCloseTemplates]);

  const handleChooseTemplate = useCallback((template: Template) => {
    setTemplate(template);
  }, []);

  const handleReloadConfig = useCallback(async () => {
    await api.reloadConfig();
    handleCloseTemplates();
  }, [handleCloseTemplates]);

  const handleDialogClose = useCallback(() => {
    setTemplate(null);
  }, []);

  const handleCustomCommand = useCallback(() => {
    handleSelectTemplate({name: 'Run as', variables: [], command: '', label: '', isPty: false});
  }, [handleSelectTemplate]);

  return (
    <>
      <Box p={1}>
        <Paper>
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="row" p={1} alignItems="center">
              <TextField hiddenLabel variant="standard" placeholder="echo hi" inputProps={{ref: refInput}} fullWidth autoFocus />
              <IconButton type="submit">
                <AddIcon />
              </IconButton>
              <IconButton onClick={handleShowTemplates}>
                <MenuIcon />
              </IconButton>
              <Menu open={Boolean(anchorEl)} onClose={handleCloseTemplates} anchorEl={anchorEl}>
                <MenuItem onClick={handleCustomCommand}>
                  Run as
                </MenuItem>
                <MenuItem onClick={handleReloadConfig}>Reload config</MenuItem>
              </Menu>
            </Box>
          </form>
        </Paper>
      </Box>
      <TemplateList onSelect={handleChooseTemplate} />
      {template && (
        <TemplateDialog template={template} onSubmit={handleAdd} onClose={handleDialogClose} />
      )}
    </>
  );
};

export default TaskInput;
