import React, {FC, SyntheticEvent, useCallback, useContext, useEffect, useState} from 'react';
import {Box, Button, ButtonGroup, Divider} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import {useLocation, useNavigate} from 'react-router-dom';
import path from 'path-browserify';
import {api} from '../../../../tools/api';
import {
  Template,
  TemplateButton,
  TemplateFolder,
  AddTaskRequest,
} from '../../../../components/types';
import TemplateDialog, {
  TemplateDialogProps,
} from '../../../../components/TemplateDialog/TemplateDialog';
import EditTemplateDialog from './EditTemplateDialog';
import {TemplatesCtx} from '../../../../components/TemplateProvider/TemplatesCtx';
import {TemplatesUpdateCtx} from '../../../../components/TemplateProvider/TemplatesUpdateCtx';
import DialogMenu from '../../../../components/DialogMenu/DialogMenu';
import DialogMenuItem from '../../../../components/DialogMenu/DialogMenuItem';
import TemplatesBarView from './TemplatesBarView';
import ChangeOrderDialog from './ChangeOrderDialog';
import MoveTemplateFolderDialog from './MoveTemplateFolderDialog';

interface TaskInputProps {
  onUpdate: () => void;
}

const NEW_TEMPLATE: TemplateButton = {
  place: '',
  name: 'Run',
  variables: [],
  command: '',
  isPty: false,
  isOnlyCombined: true,
  isWriteLogs: true,
};

type RunDialogParams = Partial<TemplateDialogProps> & Pick<TemplateDialogProps, 'template'>;

const TemplatesBar: FC<TaskInputProps> = ({onUpdate}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {rootFolder, templates} = useContext(TemplatesCtx);
  const updateTemplates = useContext(TemplatesUpdateCtx);
  const [showRunMenu, setShowRunMenu] = useState(false);
  const [runDialog, setRunDialog] = useState<RunDialogParams | null>(null);

  useEffect(() => {
    const searchStr = location.search;
    if (!searchStr) return;
    const params = new URLSearchParams(searchStr);
    switch (params.get('action')) {
      case 'run': {
        const place = params.get('place') || '';
        const initVariables: Record<string, string> = {};
        params.forEach((value, key) => {
          if (/^var-/.test(key)) {
            initVariables[key.slice(4)] = value;
          }
        });
        const template = templates.find(({place: p}) => p === place);
        if (template) {
          setRunDialog({template, initVariables});
          navigate(location.pathname, {replace: true});
        }
        break;
      }
    }
  }, [navigate, templates, location]);

  const [editDialog, setEditDialog] = useState<{
    template: TemplateButton;
    isNew?: boolean;
    folder: TemplateFolder;
  } | null>(null);
  const [changeOrderDialog, setChangeOrderDialog] = useState<boolean>(false);
  const [moveFolderDialog, setMoveFolderDialog] = useState<TemplateFolder | null>(null);

  const handleAdd = useCallback(
    async (runTask: AddTaskRequest, isNewTab = false) => {
      const {id} = await api.add(runTask);
      onUpdate();

      if (runTask.isPty && runTask.isRun) {
        const url = `/task?id=${id}`;
        if (isNewTab) {
          window.open(url);
        } else {
          navigate(url);
        }
      }
    },
    [onUpdate, navigate],
  );

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

  const handleReloadTemplates = useCallback(async () => {
    await api.reloadTemplates();
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleNewTemplate = useCallback(
    (folder: TemplateFolder) => {
      setEditDialog({folder, template: {...NEW_TEMPLATE, name: ''}, isNew: true});
      handleCloseMenu();
    },
    [handleCloseMenu],
  );

  const handleClickTemplate = useCallback(
    async (e: SyntheticEvent, template: TemplateButton, as?: boolean) => {
      if (!as && !template.variables.length) {
        const {place: templatePlace, isPty} = template;
        const isNewTab = 'metaKey' in e && Boolean(e.metaKey);
        await handleAdd({templatePlace, isPty, isRun: true}, isNewTab);
      } else {
        setRunDialog({template});
      }
    },
    [handleAdd],
  );

  const handleEditTemplate = useCallback((folder: TemplateFolder, template: TemplateButton) => {
    setEditDialog({folder, template});
  }, []);

  const handleCloseTemplateDlg = useCallback(() => {
    setRunDialog(null);
    setEditDialog(null);
    setChangeOrderDialog(false);
    setMoveFolderDialog(null);
  }, []);

  const handleRun = useCallback(() => {
    setRunDialog({template: NEW_TEMPLATE, isNew: true});
  }, []);

  const handleDeleteTemplate = useCallback(
    async (template: Template) => {
      await api.removeTemplate({place: template.place});
      await updateTemplates();
    },
    [updateTemplates],
  );

  const handleCloneTemplate = useCallback(
    async (folder: TemplateFolder, template: TemplateButton) => {
      const origName = template.name;
      let index = 0;
      let newPlace = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        index++;
        newPlace = path.join(folder.place, `${origName} ${index}`);
        // eslint-disable-next-line no-loop-func
        const found = folder.templates.some(({place}) => place === newPlace);
        if (!found) {
          break;
        }
      }

      const newTemplate = {...template, place: newPlace};
      await api.setTemplate({template: newTemplate});
      await updateTemplates();
    },
    [updateTemplates],
  );

  const handleMoveFolder = useCallback(
    async (folder: TemplateFolder) => {
      setMoveFolderDialog(folder);
      handleCloseMenu();
    },
    [handleCloseMenu],
  );

  const handleMoveTemplateFolder = useCallback(
    async (prevPlace: string, place: string) => {
      await api.moveTemplateFolder({from: prevPlace, to: place});
      await updateTemplates();
    },
    [updateTemplates],
  );

  const handleEdit = useCallback(
    async (prevPlace: string, newTemplate: TemplateButton) => {
      await api.setTemplate({template: newTemplate, prevPlace});
      await updateTemplates();
    },
    [updateTemplates],
  );

  const handleOpenChangeOrderDialog = useCallback(() => {
    setChangeOrderDialog(true);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleChangeOrder = useCallback(
    async (templateOrder: string[]) => {
      await api.setTemplateOrder({templateOrder});
      await updateTemplates();
    },
    [updateTemplates],
  );

  return (
    <>
      <Box display="flex" flexWrap="wrap">
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
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
          onClone={handleCloneTemplate}
          onMoveFolder={handleMoveFolder}
        />
      </Box>
      {showRunMenu && (
        <DialogMenu onClose={handleCloseMenu} open={true}>
          <DialogMenuItem onClick={handleNewTemplate.bind(null, rootFolder)}>
            New template
          </DialogMenuItem>
          <DialogMenuItem onClick={handleOpenChangeOrderDialog}>Order</DialogMenuItem>
          <Divider />
          <DialogMenuItem onClick={handleReloadConfig}>Reload config</DialogMenuItem>
          <DialogMenuItem onClick={handleReloadTemplates}>Reload templates</DialogMenuItem>
        </DialogMenu>
      )}
      {runDialog && (
        <TemplateDialog
          {...runDialog}
          open={true}
          onSubmit={handleAdd}
          onClose={handleCloseTemplateDlg}
        />
      )}
      {editDialog && (
        <EditTemplateDialog
          {...editDialog}
          open={true}
          onSubmit={handleEdit}
          onClose={handleCloseTemplateDlg}
        />
      )}
      {changeOrderDialog && (
        <ChangeOrderDialog
          open={true}
          onSubmit={handleChangeOrder}
          onClose={handleCloseTemplateDlg}
        />
      )}
      {moveFolderDialog && (
        <MoveTemplateFolderDialog
          open={true}
          folder={moveFolderDialog}
          onSubmit={handleMoveTemplateFolder}
          onClose={handleCloseTemplateDlg}
        />
      )}
    </>
  );
};

export default TemplatesBar;
