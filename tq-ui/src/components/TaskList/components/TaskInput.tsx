import React, {FC, useCallback, useContext, useState} from 'react';
import {Box, Button, ButtonGroup} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useNavigate} from 'react-router-dom';
import {api} from '../../../tools/api';
import {Template, TemplateButton} from '../../RootStore/RootStoreProvider';
import TemplateDialog from '../../TemplateDialog/TemplateDialog';
import EditTemplateDialog from './EditTemplateDialog';
import {TemplatesCtx} from '../../TemplateProvider/TemplatesCtx';
import {TemplatesUpdateCtx} from '../../TemplateProvider/TemplatesUpdateCtx';
import DialogMenu from '../../DialogMenu/DialogMenu';
import DialogMenuItem from '../../DialogMenu/DialogMenuItem';
import TemplatesBtns from './TemplatesBtns';

interface TaskInputProps {
  onUpdate: () => void;
}

enum DialogType {
  Edit = 'edit',
  Run = 'run',
}

const NEW_TEMPLATE: Template = {name: 'Run', variables: [], command: '', isPty: false, isOnlyCombined: true};

const TaskInput: FC<TaskInputProps> = ({onUpdate}) => {
  const navigate = useNavigate();
  const templates = useContext(TemplatesCtx);
  const updateTemplates = useContext(TemplatesUpdateCtx);
  const [showRunMenu, setShowRunMenu] = React.useState(false);
  const [dialogProps, setDialogProps] = useState<{template: TemplateButton, isNew?: boolean} | null>(null);
  const [dialogType, setDialogType] = useState<null | DialogType>(null);

  const handleAdd = useCallback(async (run: boolean, command: string, label: string, isPty: boolean, isOnlyCombined: boolean) => {
    try {
      const {id} = await api.add({
        command,
        label,
        isPty,
        isOnlyCombined,
      });
      if (run) {
        await api.taskRun({id});
      }
      onUpdate();

      if (run) {
        navigate(`/task?id=${id}`);
      }
    } catch (err) {
      console.error(err);
    }
  }, [onUpdate, navigate]);

  const handleShowMenu = useCallback(() => {
    setShowRunMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowRunMenu(false);
  }, []);

  const handleReloadConfig = useCallback(async () => {
    await api.reloadConfig();
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleNewTemplate = useCallback(() => {
    setDialogProps({template: {...NEW_TEMPLATE, name: ''}, isNew: true});
    setDialogType(DialogType.Edit);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleClickTemplate = useCallback((template: TemplateButton, as?: boolean) => {
    if (!as && !template.variables.length) {
      const {command, label = '', isPty = false, isOnlyCombined = false} = template;
      handleAdd(true, command, label, isPty, isOnlyCombined);
    } else {
      setDialogProps({template});
      setDialogType(DialogType.Run);
    }
  }, [handleAdd]);

  const handleEditTemplate = useCallback((template: TemplateButton) => {
    setDialogProps({template});
    setDialogType(DialogType.Edit);
  }, []);

  const handleCloseTemplateDlg = useCallback(() => {
    setDialogProps(null);
    setDialogType(null);
  }, []);

  const handleRun = useCallback(() => {
    setDialogProps({template: NEW_TEMPLATE, isNew: true});
    setDialogType(DialogType.Run);
  }, []);

  const handleDeleteTemplate = useCallback(async (template: Template) => {
    const newTemplates = [...templates];
    const pos = newTemplates.indexOf(template);
    if (pos === -1) {
      throw new Error('prev template not found');
    }
    newTemplates.splice(pos, 1);
    await updateTemplates(newTemplates);
  }, [templates, updateTemplates]);

  const handleCloneTemplate = useCallback(async (template: Template) => {
    const newTemplates = [...templates, template];
    await updateTemplates(newTemplates);
  }, [templates, updateTemplates]);

  const handleEdit = useCallback(async (prevTemplate: null | Template, newTemplate: Template) => {
    const newTemplates = [...templates];
    if (prevTemplate) {
      const pos = newTemplates.indexOf(prevTemplate);
      if (pos === -1) {
        throw new Error('prev template not found');
      }
      newTemplates.splice(pos, 1, newTemplate);
    } else {
      newTemplates.push(newTemplate);
    }
    await updateTemplates(newTemplates);
  }, [templates, updateTemplates]);

  return (
    <>
      <Box display="flex" flexWrap="wrap" mt={1}>
        <ButtonGroup sx={{m: 1, mt: 0}} variant="outlined">
          <Button sx={{p: 0}} onClick={handleShowMenu}>
            <MenuIcon />
          </Button>
          <Button onClick={handleRun}>Run</Button>
        </ButtonGroup>
        <TemplatesBtns
          templates={templates}
          onClick={handleClickTemplate}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
          onClone={handleCloneTemplate}
        />
      </Box>
      {showRunMenu && (
        <DialogMenu onClose={handleCloseMenu} open={true}>
          <DialogMenuItem onClick={handleNewTemplate}>New template</DialogMenuItem>
          <DialogMenuItem onClick={handleReloadConfig}>Reload config</DialogMenuItem>
        </DialogMenu>
      )}
      {dialogType === DialogType.Run && dialogProps && (
        <TemplateDialog {...dialogProps} onSubmit={handleAdd} onClose={handleCloseTemplateDlg} />
      )}
      {dialogType === DialogType.Edit && dialogProps && (
        <EditTemplateDialog {...dialogProps} onSubmit={handleEdit} onClose={handleCloseTemplateDlg} />
      )}
    </>
  );
};

export default TaskInput;
