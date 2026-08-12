import React, {FC} from 'react';
import {Box, IconButton, Tooltip, Typography} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {Field} from 'react-final-form';
import CommandFieldAsync from '../../../../../components/CommandField/CommandFieldAsync';

interface CommandTabProps {
  hidden: boolean;
}

const CommandTab: FC<CommandTabProps> = ({hidden}) => (
  <Box component="section" role="tabpanel" hidden={hidden} aria-label="Template command">
    <Box sx={{mb: 1.5}}>
      <Box sx={{display: 'flex', alignItems: 'center', gap: 0.25}}>
        <Typography variant="subtitle2" sx={{fontWeight: 600}}>
          Launch command
        </Typography>
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
          <IconButton size="small" aria-label="How to use template variables" sx={{p: 0.25}}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="caption" color="text.disabled">
        Command saved in this template
      </Typography>
    </Box>
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
