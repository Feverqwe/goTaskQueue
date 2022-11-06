import React, {FC, FormEvent, Fragment, useCallback, useContext, useMemo, useRef, useState} from "react";
import {Box, Divider, IconButton, Input, InputAdornment, Menu, MenuItem, Paper} from "@mui/material";
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import AddIcon from '@mui/icons-material/Add';
import {api} from "../../../tools/api";
import {RootStoreCtx} from "../../RootStore/RootStoreCtx";
import {Template} from "../../RootStore/RootStoreProvider";
import TemplateDialog from "./TemplateDialog";
import SettingsIcon from '@mui/icons-material/Settings';

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

  return (
    <Fragment>
      <Box p={1}>
        <Paper>
          <form onSubmit={handleSubmit}>
            <Box display={'flex'} flexDirection={'row'} p={1} alignItems={'center'}>
              <Input placeholder="echo hi" inputProps={{ref: refInput}} fullWidth autoFocus/>
              <IconButton type="submit">
                <AddIcon/>
              </IconButton>
              <IconButton onClick={handleShowTemplates}>
                <PlaylistPlayIcon/>
              </IconButton>
              <Menu open={Boolean(anchorEl)} onClose={handleCloseTemplates} anchorEl={anchorEl}>
                {templates}
                {templates.length > 0 && (
                  <Divider />
                )}
                <MenuItem onClick={handleReloadConfig}>Reload config</MenuItem>
              </Menu>
            </Box>
          </form>
        </Paper>
      </Box>
      {template && (
        <TemplateDialog template={template} onSubmit={handleAdd} onClose={handleDialogClose}/>
      )}
    </Fragment>
  )
};

export default TaskInput;