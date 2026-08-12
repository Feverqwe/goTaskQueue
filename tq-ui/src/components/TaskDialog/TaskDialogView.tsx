import React, {FC, SyntheticEvent, useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Input,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import EditIcon from '@mui/icons-material/Edit';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import LinkIcon from '@mui/icons-material/Link';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import StopIcon from '@mui/icons-material/Stop';
import {useNavigate} from 'react-router-dom';
import {AddTaskRequest, RawTemplate, Task, TaskState} from '../types';
import {api} from '../../tools/api';
import ActionButton from '../ActionButton/ActionButton';
import IconActionButton from '../IconActionButton/IconActionButton';
import KillDialog from '../KillDialog/KillDialog';
import TemplateDialog from '../TemplateDialog/TemplateDialog';
import {useConfirmDialog} from '../../hooks/useConfirmDialog';
import {getTaskName} from '../../containers/TaskPage/utils';
import TaskStatusIcon from '../../containers/TaskPage/components/TaskStatusIcon';
import {copyText} from './components/CopyButton';
import TaskCommand from './components/TaskCommand';
import TaskOutput from './components/TaskOutput';
import TaskOverview from './components/TaskOverview';
import TaskResources from './components/TaskResources';
import {
  DIALOG_ACTIONS_SX,
  DIALOG_CLOSE_BUTTON_SX,
  DIALOG_PANEL_PADDING,
  DIALOG_TAB_PANEL_MIN_HEIGHT,
  DIALOG_TABS_CONTAINER_SX,
  DIALOG_TABS_SX,
  DIALOG_TITLE_SX,
} from '../DialogTabs/layout';

interface TaskDialogViewProps {
  task: Task;
  onUpdate: () => Promise<void>;
  onClose: () => void;
}

const stateLabel: Record<TaskState, string> = {
  [TaskState.Canceled]: 'Canceled',
  [TaskState.Error]: 'Error',
  [TaskState.Finished]: 'Finished',
  [TaskState.Started]: 'Running',
  [TaskState.Idle]: 'Idle',
};

function getTaskTemplate(task: Task): RawTemplate {
  return {
    place: task.templatePlace,
    name: 'New task',
    variables: [],
    command: task.command,
    label: task.label,
    group: task.group,
    isPty: task.isPty,
    isOnlyCombined: task.isOnlyCombined,
    isWriteLogs: task.isWriteLogs,
    isSingleInstance: task.isSingleInstance,
    isStartOnBoot: task.isStartOnBoot,
    ttl: task.ttl,
  };
}

const TaskDialogView: FC<TaskDialogViewProps> = ({task, onUpdate, onClose}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const [isEditTitle, setEditTitle] = useState(false);
  const [draftLabel, setDraftLabel] = useState(task.label);
  const [isStopDialogOpen, setStopDialogOpen] = useState(false);
  const [restartTemplate, setRestartTemplate] = useState<RawTemplate | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const resourceCount = task.links.length + (task.assets?.length ?? 0);

  useEffect(() => {
    setDraftLabel(task.label);
  }, [task.id, task.label]);

  const handleSetLabel = useCallback(
    async (event: SyntheticEvent) => {
      event.preventDefault();
      if (draftLabel !== task.label) {
        await api.setTaskLabel({id: task.id, label: draftLabel});
        await onUpdate();
      }
      setEditTitle(false);
    },
    [draftLabel, onUpdate, task.id, task.label],
  );

  const handleStart = useCallback(async () => {
    await api.taskRun({id: task.id});
    await onUpdate();
  }, [onUpdate, task.id]);

  const handleRunAgain = useCallback(async () => {
    const newTask = await api.clone({id: task.id, isRun: true});
    onClose();
    navigate(`/task?id=${newTask.id}`);
  }, [navigate, onClose, task.id]);

  const handleStop = useCallback(() => setStopDialogOpen(true), []);

  const handleStopSubmit = useCallback(
    async (signal: number) => {
      await api.taskSignal({id: task.id, signal});
      await onUpdate();
    },
    [onUpdate, task.id],
  );

  const handleDuplicate = useCallback(async () => {
    setMenuAnchor(null);
    setActionError(null);
    try {
      const newTask = await api.clone({id: task.id});
      onClose();
      navigate(`/task?id=${newTask.id}`);
    } catch (error) {
      setActionError((error as Error).message);
    }
  }, [navigate, onClose, task.id]);

  const handleEditAndRun = useCallback(() => {
    setMenuAnchor(null);
    setRestartTemplate(getTaskTemplate(task));
  }, [task]);

  const handleCreateFromTask = useCallback(
    async (request: AddTaskRequest) => {
      const newTask = await api.add(request);
      onClose();
      navigate(`/task?id=${newTask.id}`);
    },
    [navigate, onClose],
  );

  const handleDelete = useCallback(async () => {
    await api.delete({id: task.id});
    onClose();
    navigate('/');
  }, [navigate, onClose, task.id]);

  const {onConfirmSubmit: handleConfirmDelete, confirmNode: deleteConfirmNode} = useConfirmDialog({
    onSubmit: handleDelete,
    title: 'Delete task?',
    message: getTaskName(task),
  });

  const taskUrl = useMemo(
    () => new URL(`/task?id=${encodeURIComponent(task.id)}`, window.location.href).toString(),
    [task.id],
  );

  const handleCopy = useCallback(async (value: string, message: string) => {
    setMenuAnchor(null);
    setActionError(null);
    try {
      await copyText(value);
      setCopyMessage(message);
    } catch (error) {
      setActionError((error as Error).message);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setMenuAnchor(null);
    setActionError(null);
    try {
      await onUpdate();
    } catch (error) {
      setActionError((error as Error).message);
    }
  }, [onUpdate]);

  const primaryAction = useMemo(() => {
    if (task.state === TaskState.Started) {
      return (
        <Button
          size="small"
          variant="contained"
          color="warning"
          startIcon={<StopIcon />}
          onClick={handleStop}
        >
          Stop
        </Button>
      );
    }
    if (task.state === TaskState.Idle) {
      return (
        <ActionButton
          size="small"
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onSubmit={handleStart}
        >
          Start
        </ActionButton>
      );
    }
    return (
      <ActionButton
        size="small"
        variant="contained"
        startIcon={<RestartAltIcon />}
        onSubmit={handleRunAgain}
      >
        Run again
      </ActionButton>
    );
  }, [handleRunAgain, handleStart, handleStop, task.state]);

  return (
    <>
      <DialogTitle sx={DIALOG_TITLE_SX}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            columnGap: {xs: 1, sm: 1.25},
            minHeight: 34,
          }}
        >
          {!isEditTitle && (
            <Chip
              variant="outlined"
              size="small"
              icon={<TaskStatusIcon task={task} />}
              label={stateLabel[task.state]}
              sx={{
                height: 24,
                flexShrink: 0,
                '& .MuiChip-icon': {
                  width: 16,
                  height: 16,
                  ml: 0.75,
                  mr: 0.5,
                },
                '& .MuiChip-label': {
                  pl: 0.25,
                  pr: 0.75,
                },
              }}
            />
          )}
          {isEditTitle ? (
            <Box
              component="form"
              onSubmit={handleSetLabel}
              sx={{display: 'flex', alignItems: 'center', gap: 0.5, flexGrow: 1}}
            >
              <Input
                autoFocus
                fullWidth
                placeholder={task.command}
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                inputProps={{'aria-label': 'Label'}}
                sx={{height: 30, fontSize: '1rem'}}
              />
              <IconActionButton size="small" aria-label="Save label" onSubmit={handleSetLabel}>
                <SaveIcon fontSize="inherit" />
              </IconActionButton>
              <IconButton
                size="small"
                aria-label="Cancel editing"
                onClick={() => {
                  setDraftLabel(task.label);
                  setEditTitle(false);
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{display: 'flex', alignItems: 'center', minWidth: 0, flexGrow: 1}}>
              <Typography
                variant="subtitle1"
                noWrap
                title={getTaskName(task)}
                sx={{fontWeight: 600}}
              >
                {getTaskName(task)}
              </Typography>
              <Tooltip title="Edit label">
                <IconButton size="small" onClick={() => setEditTitle(true)} sx={{ml: 0.5}}>
                  <EditIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          {!isEditTitle && (
            <>
              <Tooltip title="More actions">
                <IconButton size="small" onClick={(event) => setMenuAnchor(event.currentTarget)}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="Close"
                sx={DIALOG_CLOSE_BUTTON_SX}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          display: isMobile ? 'flex' : 'block',
          minHeight: 0,
          flexDirection: 'column',
          p: 0,
        }}
      >
        {(task.error || actionError) && (
          <Alert severity="error" onClose={actionError ? () => setActionError(null) : undefined}>
            {actionError || task.error}
          </Alert>
        )}
        <Box sx={DIALOG_TABS_CONTAINER_SX}>
          <Tabs
            value={activeTab}
            onChange={(_, value: number) => setActiveTab(value)}
            variant={isMobile ? 'fullWidth' : 'scrollable'}
            scrollButtons={isMobile ? false : 'auto'}
            aria-label="Task details"
            sx={[
              DIALOG_TABS_SX,
              {
                '& .MuiTab-root': {
                  minWidth: {xs: 0, sm: 90},
                  px: {xs: 0.5, sm: 1.25},
                  whiteSpace: 'nowrap',
                },
              },
            ]}
          >
            <Tab label="Overview" />
            <Tab label="Command" />
            <Tab label={`Resources (${resourceCount})`} />
            <Tab label="Output" />
          </Tabs>
        </Box>
        <Box
          sx={{
            minHeight: DIALOG_TAB_PANEL_MIN_HEIGHT,
            display: activeTab === 1 ? 'flex' : 'block',
            flex: isMobile ? 1 : undefined,
            flexDirection: 'column',
            p: activeTab === 1 ? 0 : DIALOG_PANEL_PADDING,
          }}
        >
          {activeTab === 0 && <TaskOverview task={task} />}
          {activeTab === 1 && <TaskCommand task={task} />}
          {activeTab === 2 && <TaskResources task={task} onUpdate={onUpdate} />}
          {activeTab === 3 && <TaskOutput task={task} />}
        </Box>
      </DialogContent>

      <DialogActions sx={DIALOG_ACTIONS_SX}>
        <Box sx={{mr: 'auto'}}>{primaryAction}</Box>
        <Button size="small" variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={handleEditAndRun}>
          <ListItemIcon>
            <DriveFileRenameOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit &amp; run</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon>
            <FileCopyOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleCopy(taskUrl, 'Task link copied')}>
          <ListItemIcon>
            <LinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy task link</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRefresh}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Refresh</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={task.state === TaskState.Started}
          onClick={() => {
            setMenuAnchor(null);
            handleConfirmDelete();
          }}
          sx={{color: 'error.main'}}
        >
          <ListItemIcon sx={{color: 'inherit'}}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {isStopDialogOpen && (
        <KillDialog
          open={isStopDialogOpen}
          task={task}
          onClose={() => setStopDialogOpen(false)}
          onSubmit={handleStopSubmit}
        />
      )}
      {restartTemplate && (
        <TemplateDialog
          open={true}
          template={restartTemplate}
          isNew={true}
          initVariables={task.variables}
          onClose={() => setRestartTemplate(null)}
          onSubmit={handleCreateFromTask}
        />
      )}
      {deleteConfirmNode}
      <Snackbar
        open={Boolean(copyMessage)}
        autoHideDuration={1800}
        onClose={() => setCopyMessage(null)}
        message={copyMessage}
      />
    </>
  );
};

export default TaskDialogView;
