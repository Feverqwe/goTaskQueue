import React, {FC, SyntheticEvent, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import {Form} from 'react-final-form';
import {AddTaskRequest, RawTemplate} from '../types';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import ActionButton from '../ActionButton/ActionButton';
import CommandTab from './components/CommandTab';
import SettingsTab from './components/SettingsTab';
import VariablesTab from './components/VariablesTab';

export interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (runTask: AddTaskRequest, isNewTab?: boolean) => Promise<void>;
  template: RawTemplate;
  isNew?: boolean;
  initVariables?: Partial<Record<string, string>>;
}

interface TemplateFormValues {
  command: string;
  group: string;
  isOnlyCombined: boolean;
  isPty: boolean;
  isSingleInstance: boolean;
  isStartOnBoot: boolean;
  isWriteLogs: boolean;
  label: string;
  ttl: number | string;
  variables: string[];
}

interface SubmitOptions {
  isNewTab?: boolean;
  isRun: boolean;
}

type TemplateDialogTab = 'variables' | 'command' | 'settings';

const EMPTY_INIT_VARIABLES: Partial<Record<string, string>> = {};

const TemplateDialog: FC<TemplateDialogProps> = ({
  open,
  template,
  onSubmit,
  onClose,
  isNew,
  initVariables = EMPTY_INIT_VARIABLES,
}) => {
  const {
    name,
    variables: templateVariables,
    command,
    label,
    group,
    isPty,
    isOnlyCombined,
    isWriteLogs,
    place,
    isSingleInstance,
    isStartOnBoot,
    ttl,
  } = template;
  const {isPtySupported} = useContext(RootStoreCtx);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState<TemplateDialogTab>(() =>
    templateVariables.length > 0 ? 'variables' : 'command',
  );
  const refSubmitOptions = useRef<SubmitOptions>({isRun: true});

  const initialValues = useMemo<TemplateFormValues>(
    () => ({
      command,
      group: group || '',
      isOnlyCombined: Boolean(isOnlyCombined),
      isPty: Boolean(isPty),
      isSingleInstance: Boolean(isSingleInstance),
      isStartOnBoot: Boolean(isStartOnBoot),
      isWriteLogs: Boolean(isWriteLogs),
      label: label || '',
      ttl: ttl ?? 0,
      variables: templateVariables.map(({value, defaultValue, type, options}) => {
        const initialValue = initVariables[value] ?? defaultValue ?? '';
        if (type !== 'select') return initialValue;
        return options?.includes(initialValue) ? initialValue : options?.[0] || '';
      }),
    }),
    [
      command,
      group,
      initVariables,
      isOnlyCombined,
      isPty,
      isSingleInstance,
      isStartOnBoot,
      isWriteLogs,
      label,
      templateVariables,
      ttl,
    ],
  );

  const handleFormSubmit = useCallback(
    async (values: TemplateFormValues) => {
      const variables: Record<string, string> = {
        ...Object.fromEntries(
          Object.entries(initVariables).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
          ),
        ),
        ...Object.fromEntries(
          templateVariables.map(({value}, index) => [value, values.variables[index] ?? '']),
        ),
      };
      const {isRun, isNewTab} = refSubmitOptions.current;
      const request: AddTaskRequest = {
        command: values.command,
        label: values.label,
        group: values.group,
        isPty: isPtySupported && values.isPty,
        isOnlyCombined: values.isOnlyCombined,
        isSingleInstance: Boolean(place) && values.isSingleInstance,
        isStartOnBoot: values.isStartOnBoot,
        isWriteLogs: values.isWriteLogs,
        templatePlace: place,
        isRun,
        variables,
        ttl: Number.parseInt(String(values.ttl), 10) || 0,
      };

      await onSubmit(request, isNewTab);
      onClose();
    },
    [initVariables, isPtySupported, onClose, onSubmit, place, templateVariables],
  );

  const handleClose = useCallback(
    (_event: Event, reason: string) => {
      if (reason === 'backdropClick') return;
      onClose();
    },
    [onClose],
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      fullScreen={isMobile}
      maxWidth="md"
      scroll="paper"
      aria-labelledby="template-dialog-title"
    >
      <Form<TemplateFormValues> onSubmit={handleFormSubmit} initialValues={initialValues}>
        {({form, values}) => {
          const submit = async (event: SyntheticEvent, options: SubmitOptions) => {
            event.preventDefault();
            refSubmitOptions.current = options;
            await form.submit();
          };

          return (
            <Box
              component="form"
              onSubmit={(event: SyntheticEvent) => submit(event, {isRun: true})}
              sx={{display: 'contents'}}
            >
              <DialogTitle id="template-dialog-title" sx={{px: {xs: 1.5, sm: 2}, py: 1}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minHeight: 30}}>
                  <Box sx={{minWidth: 0, flexGrow: 1}}>
                    <Typography variant="subtitle1" noWrap title={name} sx={{fontWeight: 600}}>
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {templateVariables.length > 0
                        ? `Configure ${templateVariables.length} ${templateVariables.length === 1 ? 'variable' : 'variables'}`
                        : 'Configure and run this task'}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={onClose} aria-label="Close">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </DialogTitle>

              <DialogContent dividers sx={{p: 0}}>
                <Tabs
                  value={activeTab}
                  onChange={(_, value: TemplateDialogTab) => setActiveTab(value)}
                  variant={isMobile ? 'fullWidth' : 'standard'}
                  aria-label="Task configuration"
                  sx={{
                    px: {xs: 0.5, sm: 2},
                    minHeight: 40,
                    '& .MuiTab-root': {
                      minHeight: 40,
                      px: {xs: 0.75, sm: 2},
                      py: 0.5,
                      textTransform: 'none',
                    },
                  }}
                >
                  {templateVariables.length > 0 && (
                    <Tab value="variables" label={`Variables (${templateVariables.length})`} />
                  )}
                  <Tab value="command" label="Command" />
                  <Tab value="settings" label="Settings" />
                </Tabs>
                <Divider />

                <Box sx={{p: {xs: 1.5, sm: 2}, minHeight: {sm: 160}}}>
                  {templateVariables.length > 0 && (
                    <VariablesTab
                      hidden={activeTab !== 'variables'}
                      isNew={isNew}
                      variables={templateVariables}
                    />
                  )}

                  <CommandTab hidden={activeTab !== 'command'} />
                  <SettingsTab
                    hidden={activeTab !== 'settings'}
                    hasTemplatePlace={Boolean(place)}
                    isPtySupported={isPtySupported}
                  />
                </Box>
              </DialogContent>

              <DialogActions sx={{px: {xs: 1.5, sm: 2}, py: 1, gap: 0.5}}>
                <Button size="small" variant="outlined" onClick={onClose}>
                  Cancel
                </Button>
                <ActionButton
                  size="small"
                  variant="outlined"
                  startIcon={<PlaylistAddIcon />}
                  sx={{'& .MuiButton-startIcon': {display: {xs: 'none', sm: 'inherit'}}}}
                  onSubmit={(event) => submit(event, {isRun: false})}
                >
                  Add
                </ActionButton>
                <ActionButton
                  size="small"
                  variant="contained"
                  type="submit"
                  startIcon={<PlayArrowIcon />}
                  sx={{
                    whiteSpace: 'nowrap',
                    '& .MuiButton-startIcon': {display: {xs: 'none', sm: 'inherit'}},
                  }}
                  autoFocus={!isNew && templateVariables.length === 0}
                  onSubmit={(event) =>
                    submit(event, {
                      isRun: true,
                      isNewTab: 'metaKey' in event && Boolean(event.metaKey),
                    })
                  }
                >
                  Add &amp; {values.isPty ? 'Open' : 'Run'}
                </ActionButton>
              </DialogActions>
            </Box>
          );
        }}
      </Form>
    </Dialog>
  );
};

export default TemplateDialog;
