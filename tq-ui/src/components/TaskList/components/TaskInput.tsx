import React, {FC, FormEvent, Fragment, useCallback, useContext, useMemo, useRef, useState} from "react";
import {Box, IconButton, Menu, MenuItem, Paper, TextField} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import {api} from "../../../tools/api";
import {RootStoreCtx} from "../../RootStore/RootStoreCtx";
import {Template} from "../../RootStore/RootStoreProvider";
import TemplateDialog from "./TemplateDialog";
import TemplateList from "./TemplateList";
import MenuIcon from '@mui/icons-material/Menu';

interface TaskInputProps {
  onUpdate: () => void;
}

const TaskInput: FC<TaskInputProps> = ({onUpdate}) => {
  const refInput = useRef<HTMLInputElement>();
  const rootStore = useContext(RootStoreCtx);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [template, setTemplate] = useState<Template | null>(null);

  const handleAdd = useCallback(async (command: string, label = '', run = true) => {
    try {
      const {id} = await api.add({
        command,
        label,
      });
      if (run) {
        await api.taskRun({id});
      }
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const input = refInput.current;
    if (!input) return;

    const value = input.value;
    if (!value) return;

    await handleAdd(value, '', false);
    input.value = '';
  }, []);

  const handleShowTemplates = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleCloseTemplates = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelectTemplate = useCallback((template: Template) => {
    setTemplate(template);
    handleCloseTemplates();
  }, []);

  const handleChooseTemplate = useCallback((template: Template) => {
    setTemplate(template);
  }, []);

  const handleReloadConfig = useCallback(async () => {
    await api.reloadConfig();
    handleCloseTemplates();
  }, []);

  const templates = useMemo(() => {
    return rootStore.templates.map((template) => {
      const {name} = template;
      return (
        <MenuItem key={name} onClick={handleSelectTemplate.bind(null, template)}>{name}</MenuItem>
      );
    });
  }, [rootStore]);

  const handleDialogClose = useCallback(() => {
    setTemplate(null);
  }, []);

  const handleCustomCommand = useCallback(() => {
    handleSelectTemplate({name: 'Run as', variables: [], command: '', label: ''});
  }, []);

  return (
    <Fragment>
      <Box p={1}>
        <Paper>
          <form onSubmit={handleSubmit}>
            <Box display={'flex'} flexDirection={'row'} p={1} alignItems={'center'}>
              <TextField hiddenLabel variant={'standard'} placeholder="echo hi" inputProps={{ref: refInput}} fullWidth autoFocus/>
              <IconButton type="submit">
                <AddIcon/>
              </IconButton>
              <IconButton onClick={handleShowTemplates}>
                <MenuIcon/>
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
      <TemplateList onSelect={handleChooseTemplate}/>
      {template && (
        <TemplateDialog template={template} onSubmit={handleAdd} onClose={handleDialogClose}/>
      )}
    </Fragment>
  )
};

export default TaskInput;