import React, {FC, SyntheticEvent, useCallback, useContext, useMemo, useState} from 'react';
import {
  Box,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import path from 'path-browserify';
import {Form} from 'react-final-form';
import {RawTemplate, TemplateFolder} from '../../../../components/types';
import {RootStoreCtx} from '../../../../components/RootStore/RootStoreCtx';
import ActionButton from '../../../../components/ActionButton/ActionButton';
import CommandTab from './EditTemplateDialog/CommandTab';
import GeneralTab from './EditTemplateDialog/GeneralTab';
import SettingsTab from './EditTemplateDialog/SettingsTab';
import VariablesTab from './EditTemplateDialog/VariablesTab';
import {
  createVariable,
  getInitialValues,
  getTemplateVariables,
  validateTemplateReferences,
} from './EditTemplateDialog/formUtils';
import {EditorTab, TemplateEditorValues} from './EditTemplateDialog/types';

interface TemplateDialogProps {
  folder: TemplateFolder;
  open: boolean;
  onClose: () => void;
  onSubmit: (prevPlace: string, template: RawTemplate) => Promise<void>;
  template: RawTemplate;
  isNew?: boolean;
}

const EditTemplateDialog: FC<TemplateDialogProps> = ({
  folder,
  template,
  open,
  onSubmit,
  onClose,
  isNew,
}) => {
  const {isPtySupported} = useContext(RootStoreCtx);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState<EditorTab>('general');
  const initialValues = useMemo(() => getInitialValues(template), [template]);

  const handleFormSubmit = useCallback(
    async (values: TemplateEditorValues) => {
      const newTemplate: RawTemplate = {
        place: isNew ? path.join(folder.place, values.name.trim()) : values.place.trim(),
        command: values.command,
        label: values.label,
        group: values.group,
        name: values.name.trim(),
        id: values.id,
        variables: getTemplateVariables(values.variables),
        isPty: isPtySupported && values.isPty,
        isOnlyCombined: values.isOnlyCombined,
        isWriteLogs: values.isWriteLogs,
        isSingleInstance: values.isSingleInstance,
        isStartOnBoot: values.isStartOnBoot,
        ttl: Number.parseInt(String(values.ttl), 10) || 0,
      };

      await onSubmit(isNew ? '' : template.place, newTemplate);
      onClose();
    },
    [folder.place, isNew, isPtySupported, onClose, onSubmit, template.place],
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
      aria-labelledby="template-editor-title"
    >
      <Form<TemplateEditorValues>
        onSubmit={handleFormSubmit}
        initialValues={initialValues}
        validate={validateTemplateReferences}
      >
        {({errors, form, invalid, values}) => {
          const submit = async (event: SyntheticEvent) => {
            event.preventDefault();
            await form.submit();
          };
          const addVariable = () => {
            form.change('variables', [...values.variables, createVariable()]);
            setActiveTab('variables');
          };
          const removeVariable = (index: number) => {
            form.change(
              'variables',
              values.variables.filter((_, variableIndex) => variableIndex !== index),
            );
          };

          return (
            <Box component="form" onSubmit={submit} sx={{display: 'contents'}}>
              <DialogTitle
                id="template-editor-title"
                sx={{px: {xs: 1.5, sm: 2}, bgcolor: 'background.paper'}}
              >
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minHeight: 30}}>
                  <Box sx={{minWidth: 0, flexGrow: 1}}>
                    <Typography variant="subtitle1" sx={{fontWeight: 600}}>
                      {isNew ? 'Add template' : 'Edit template'}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                      sx={{fontFamily: 'monospace', fontSize: '0.6875rem'}}
                    >
                      {isNew ? `New template in ${folder.place || 'root'}` : template.place}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={onClose} aria-label="Close">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </DialogTitle>

              <DialogContent sx={{p: 0}}>
                <Box sx={{borderBottom: 1, borderColor: 'divider'}}>
                  <Tabs
                    value={activeTab}
                    onChange={(_, value: EditorTab) => setActiveTab(value)}
                    variant={isMobile ? 'scrollable' : 'standard'}
                    scrollButtons={isMobile ? 'auto' : false}
                    aria-label="Template editor sections"
                    sx={{
                      px: {xs: 0.5, sm: 2},
                      minHeight: 40,
                      '& .MuiTab-root': {
                        minHeight: 40,
                        px: {xs: 1.25, sm: 2},
                        py: 0.5,
                        textTransform: 'none',
                      },
                    }}
                  >
                    <Tab value="general" label="General" />
                    <Tab value="variables" label={`Variables (${values.variables.length})`} />
                    <Tab
                      value="command"
                      label={
                        <Badge color="error" variant="dot" invisible={!errors?.command}>
                          Command
                        </Badge>
                      }
                    />
                    <Tab value="settings" label="Settings" />
                  </Tabs>
                </Box>
                <Box sx={{p: activeTab === 'command' ? 0 : {xs: 1.5, sm: 2}}}>
                  <GeneralTab hidden={activeTab !== 'general'} isNew={isNew} />
                  <VariablesTab
                    hidden={activeTab !== 'variables'}
                    variables={values.variables}
                    onAdd={addVariable}
                    onRemove={removeVariable}
                  />
                  <CommandTab hidden={activeTab !== 'command'} />
                  <SettingsTab hidden={activeTab !== 'settings'} isPtySupported={isPtySupported} />
                </Box>
              </DialogContent>

              <DialogActions sx={{px: {xs: 1.5, sm: 2}, py: 1, gap: 0.5}}>
                <Button size="small" variant="outlined" onClick={onClose}>
                  Cancel
                </Button>
                <ActionButton
                  size="small"
                  variant="contained"
                  type="submit"
                  disabled={invalid}
                  onSubmit={submit}
                >
                  Save
                </ActionButton>
              </DialogActions>
            </Box>
          );
        }}
      </Form>
    </Dialog>
  );
};

export default EditTemplateDialog;
