import React, {FC, useCallback, useContext, useState} from 'react';
import {Box, Button, ButtonGroup} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useNavigate} from 'react-router-dom';
import {api} from '../../../tools/api';
import {Template, TemplateButton, TemplateFolder} from '../../RootStore/RootStoreProvider';
import TemplateDialog from '../../TemplateDialog/TemplateDialog';
import EditTemplateDialog from './EditTemplateDialog';
import {TemplatesCtx} from '../../TemplateProvider/TemplatesCtx';
import {TemplatesUpdateCtx} from '../../TemplateProvider/TemplatesUpdateCtx';
import DialogMenu from '../../DialogMenu/DialogMenu';
import DialogMenuItem from '../../DialogMenu/DialogMenuItem';
import TemplatesBtns from './TemplatesBtns';
import OrderTemplatesDialog from './OrderTemplatesDialog';

interface TaskInputProps {
  onUpdate: () => void;
}

const NEW_TEMPLATE: Template = {name: 'Run', variables: [], command: '', isPty: false, isOnlyCombined: true};

const TaskInput: FC<TaskInputProps> = ({onUpdate}) => {
  const navigate = useNavigate();
  const rootFolder = useContext(TemplatesCtx);
  const updateTemplates = useContext(TemplatesUpdateCtx);
  const [showRunMenu, setShowRunMenu] = useState(false);
  const [runDialog, setRunDialog] = useState<{template: TemplateButton, isNew?: boolean} | null>(null);
  const [editDialog, setEditDialog] = useState<{template: TemplateButton, isNew?: boolean, folder: TemplateFolder} | null>(null);
  const [orderDialog, setOrderDialog] = useState(false);

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

  const handleOrder = useCallback(() => {
    setOrderDialog(true);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleNewTemplate = useCallback((folder: TemplateFolder) => {
    setEditDialog({folder, template: {...NEW_TEMPLATE, name: ''}, isNew: true});
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleClickTemplate = useCallback((template: TemplateButton, as?: boolean) => {
    if (!as && !template.variables.length) {
      const {command, label = '', isPty = false, isOnlyCombined = false} = template;
      handleAdd(true, command, label, isPty, isOnlyCombined);
    } else {
      setRunDialog({template});
    }
  }, [handleAdd]);

  const handleEditTemplate = useCallback((folder: TemplateFolder, template: TemplateButton) => {
    setEditDialog({folder, template});
  }, []);

  const handleCloseTemplateDlg = useCallback(() => {
    setRunDialog(null);
    setOrderDialog(false);
    setEditDialog(null);
  }, []);

  const handleRun = useCallback(() => {
    setRunDialog({template: NEW_TEMPLATE, isNew: true});
  }, []);

  const handleDeleteTemplate = useCallback(async (folder: TemplateFolder, template: Template) => {
    const newTemplates = [...folder.templates];
    const pos = newTemplates.indexOf(template);
    if (pos === -1) {
      throw new Error('prev template not found');
    }
    newTemplates.splice(pos, 1);
    folder.templates = newTemplates;
    await updateTemplates(rootFolder);
  }, [rootFolder, updateTemplates]);

  const handleCloneTemplate = useCallback(async (folder: TemplateFolder, template: Template) => {
    const newTemplates = [...folder.templates, template];
    folder.templates = newTemplates;
    await updateTemplates(rootFolder);
  }, [rootFolder, updateTemplates]);

  const handleEdit = useCallback(async (folder: TemplateFolder, prevTemplate: null | Template, newTemplate: Template) => {
    const newTemplates = [...folder.templates];
    if (prevTemplate) {
      const pos = newTemplates.indexOf(prevTemplate);
      if (pos === -1) {
        throw new Error('prev template not found');
      }
      newTemplates.splice(pos, 1, newTemplate);
    } else {
      newTemplates.push(newTemplate);
    }
    folder.templates = newTemplates;
    await updateTemplates(rootFolder);
  }, [rootFolder, updateTemplates]);

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
          folder={rootFolder}
          onClick={handleClickTemplate}
          onNew={handleNewTemplate}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
          onClone={handleCloneTemplate}
        />
      </Box>
      {showRunMenu && (
        <DialogMenu onClose={handleCloseMenu} open={true}>
          <DialogMenuItem onClick={handleNewTemplate.bind(null, rootFolder)}>New template</DialogMenuItem>
          <DialogMenuItem onClick={handleOrder}>Order</DialogMenuItem>
          <DialogMenuItem onClick={handleReloadConfig}>Reload config</DialogMenuItem>
        </DialogMenu>
      )}
      {runDialog && (
        <TemplateDialog {...runDialog} onSubmit={handleAdd} onClose={handleCloseTemplateDlg} />
      )}
      {editDialog && (
        <EditTemplateDialog {...editDialog} onSubmit={handleEdit} onClose={handleCloseTemplateDlg} />
      )}
      {orderDialog && (
        <OrderTemplatesDialog open={true} folder={rootFolder} onClose={handleCloseTemplateDlg} />
      )}
    </>
  );
};

export default TaskInput;
