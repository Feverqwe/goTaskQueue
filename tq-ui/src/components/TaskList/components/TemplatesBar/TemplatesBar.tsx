import React, {FC, SyntheticEvent, useCallback, useContext, useState} from 'react';
import {Box, Button, ButtonGroup, Divider} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useNavigate} from 'react-router-dom';
import {api} from '../../../../tools/api';
import {Template, TemplateButton, TemplateFolder, TemplateType} from '../../../RootStore/RootStoreProvider';
import TemplateDialog from '../../../TemplateDialog/TemplateDialog';
import EditTemplateDialog from './EditTemplateDialog';
import {TemplatesCtx} from '../../../TemplateProvider/TemplatesCtx';
import {TemplatesUpdateCtx} from '../../../TemplateProvider/TemplatesUpdateCtx';
import DialogMenu from '../../../DialogMenu/DialogMenu';
import DialogMenuItem from '../../../DialogMenu/DialogMenuItem';
import TemplatesBarView from './TemplatesBarView';
import EditFolderDialog from './EditFolderDialog';
import MoveTemplateDialog from './MoveTemplateDialog';
import {AddTaskReuest} from '../../../types';

interface TaskInputProps {
  onUpdate: () => void;
}

const NEW_TEMPLATE: TemplateButton = {name: 'Run', variables: [], command: '', isPty: false, isOnlyCombined: true};
const NEW_FOLDER: TemplateFolder = {type: TemplateType.Folder, name: '', templates: []};

const TemplatesBar: FC<TaskInputProps> = ({onUpdate}) => {
  const navigate = useNavigate();
  const rootFolder = useContext(TemplatesCtx);
  const updateTemplates = useContext(TemplatesUpdateCtx);
  const [showRunMenu, setShowRunMenu] = useState(false);
  const [runDialog, setRunDialog] = useState<{template: TemplateButton, isNew?: boolean} | null>(null);
  const [editDialog, setEditDialog] = useState<{template: TemplateButton, isNew?: boolean, folder: TemplateFolder} | null>(null);
  const [moveDialog, setMoveDialog] = useState<{folder: TemplateFolder, template: Template} | null>(null);
  const [editFolderDialog, setEditFolderDialog] = useState<{folder: TemplateFolder, template: TemplateFolder, isNew?: boolean, isRoot?: boolean} | null>(null);

  const handleAdd = useCallback(async (run: boolean, runTask: AddTaskReuest, isNewTab = false) => {
    try {
      const {id} = await api.add(runTask);
      if (run) {
        await api.taskRun({id});
      }
      onUpdate();

      if (run) {
        const url = `/task?id=${id}`;
        if (isNewTab) {
          window.open(url);
        } else {
          navigate(url);
        }
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

  const handleNewTemplate = useCallback((folder: TemplateFolder) => {
    setEditDialog({folder, template: {...NEW_TEMPLATE, name: ''}, isNew: true});
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleNewTemplateFolder = useCallback((folder: TemplateFolder) => {
    setEditFolderDialog({folder, template: {...NEW_FOLDER}, isNew: true});
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleEditRootFolder = useCallback(() => {
    setEditFolderDialog({folder: rootFolder, template: rootFolder, isRoot: true});
    handleCloseMenu();
  }, [rootFolder, handleCloseMenu]);

  const handleClickTemplate = useCallback((e: SyntheticEvent, template: TemplateButton, as?: boolean) => {
    if (!as && !template.variables.length) {
      const {command, label = '', group = '', isPty = false, isOnlyCombined = false} = template;
      const isNewTab = ('metaKey' in e) && Boolean(e.metaKey);
      handleAdd(true, {
        command, label, group, isPty, isOnlyCombined,
      }, isNewTab);
    } else {
      setRunDialog({template});
    }
  }, [handleAdd]);

  const handleEditTemplate = useCallback((folder: TemplateFolder, template: TemplateButton) => {
    setEditDialog({folder, template});
  }, []);

  const handleEditTemplateFolder = useCallback((folder: TemplateFolder, template: TemplateFolder) => {
    setEditFolderDialog({folder, template});
  }, []);

  const handleMoveTemplate = useCallback((folder: TemplateFolder, template: Template) => {
    setMoveDialog({folder, template});
  }, []);

  const handleCloseTemplateDlg = useCallback(() => {
    setRunDialog(null);
    setEditDialog(null);
    setMoveDialog(null);
    setEditFolderDialog(null);
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
    if (prevTemplate === rootFolder && newTemplate.type === TemplateType.Folder) {
      rootFolder.templates = newTemplate.templates;
      await updateTemplates(rootFolder);
      return;
    }

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

  const handleMove = useCallback(async (folder: TemplateFolder, template: Template, targetFolder: TemplateFolder) => {
    targetFolder.templates = [...targetFolder.templates, template];
    await handleDeleteTemplate(folder, template);
  }, [handleDeleteTemplate]);

  return (
    <>
      <Box display="flex" flexWrap="wrap" mt={1}>
        <ButtonGroup sx={{m: 1, mt: 0}} variant="outlined">
          <Button sx={{p: 0}} onClick={handleShowMenu}>
            <MenuIcon />
          </Button>
          <Button onClick={handleRun}>Run</Button>
        </ButtonGroup>
        <TemplatesBarView
          folder={rootFolder}
          onClick={handleClickTemplate}
          onNew={handleNewTemplate}
          onNewFolder={handleNewTemplateFolder}
          onEdit={handleEditTemplate}
          onEditFolder={handleEditTemplateFolder}
          onDelete={handleDeleteTemplate}
          onClone={handleCloneTemplate}
          onMove={handleMoveTemplate}
        />
      </Box>
      {showRunMenu && (
        <DialogMenu onClose={handleCloseMenu} open={true}>
          <DialogMenuItem onClick={handleNewTemplate.bind(null, rootFolder)}>New template</DialogMenuItem>
          <DialogMenuItem onClick={handleNewTemplateFolder.bind(null, rootFolder)}>New folder</DialogMenuItem>
          <DialogMenuItem onClick={handleEditRootFolder}>Edit</DialogMenuItem>
          <Divider />
          <DialogMenuItem onClick={handleReloadConfig}>Reload config</DialogMenuItem>
        </DialogMenu>
      )}
      {runDialog && (
        <TemplateDialog {...runDialog} open={true} onSubmit={handleAdd} onClose={handleCloseTemplateDlg} />
      )}
      {editDialog && (
        <EditTemplateDialog {...editDialog} open={true} onSubmit={handleEdit} onClose={handleCloseTemplateDlg} />
      )}
      {editFolderDialog && (
        <EditFolderDialog {...editFolderDialog} open={true} onSubmit={handleEdit} onClose={handleCloseTemplateDlg} />
      )}
      {moveDialog && (
        <MoveTemplateDialog {...moveDialog} open={true} onSubmit={handleMove} onClose={handleCloseTemplateDlg} />
      )}
    </>
  );
};

export default TemplatesBar;
