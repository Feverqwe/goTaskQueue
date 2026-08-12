import React, {FC} from 'react';
import {Box, IconButton, Tooltip, Typography} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {Field} from 'react-final-form';
import CommandFieldAsync from '../../../../../components/CommandField/CommandFieldAsync';

interface CommandTabProps {
  hidden: boolean;
}

const CommandTab: FC<CommandTabProps> = ({hidden}) => (
  <Box
    component="section"
    role="tabpanel"
    hidden={hidden}
    aria-label="Template command"
    sx={{
      position: 'relative',
      minHeight: 'inherit',
      '& .MuiFormHelperText-root': {px: {xs: 1.5, sm: 2}},
    }}
  >
    <Tooltip
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={5000}
      title={
        <Box sx={{maxWidth: 320}}>
          <Typography variant="subtitle2" color="inherit">
            Template variables
          </Typography>
          <Typography variant="caption" color="inherit" component="div" sx={{mb: 0.5}}>
            Keys are lowercase. In commands they become uppercase environment variables:
            <br />
            <code>url → TASK_VAR_URL</code>
          </Typography>
          <Typography variant="caption" color="inherit" component="div">
            sh: <code>$TASK_VAR_URL</code>
          </Typography>
          <Typography variant="caption" color="inherit" component="div">
            PowerShell: <code>$env:TASK_VAR_URL</code>
          </Typography>
          <Typography variant="caption" color="inherit" component="div">
            cmd: <code>%TASK_VAR_URL%</code>
          </Typography>
        </Box>
      }
    >
      <IconButton
        size="small"
        aria-label="How to use template variables"
        sx={{position: 'absolute', top: 4, right: 4, zIndex: 1, bgcolor: 'background.paper'}}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Field<string> name="command" subscription={{error: true, value: true}}>
      {({input, meta}) => (
        <CommandFieldAsync
          defaultValue={input.value}
          onChange={input.onChange}
          validationError={meta.error}
        />
      )}
    </Field>
  </Box>
);

export default CommandTab;
