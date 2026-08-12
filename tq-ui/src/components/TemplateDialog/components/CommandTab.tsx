import React, {FC} from 'react';
import {Box, Typography} from '@mui/material';
import {Field} from 'react-final-form';
import CommandFieldAsync from '../../CommandField/CommandFieldAsync';

interface CommandTabProps {
  hidden: boolean;
}

const CommandTab: FC<CommandTabProps> = ({hidden}) => (
  <Box component="section" role="tabpanel" hidden={hidden} aria-label="Task command">
    <Box sx={{mb: 1.5}}>
      <Typography variant="subtitle2" sx={{fontWeight: 600}}>
        Launch command
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Command that will be used to start the task
      </Typography>
    </Box>
    <Field<string> name="command" subscription={{value: true}}>
      {({input}) => <CommandFieldAsync defaultValue={input.value} onChange={input.onChange} />}
    </Field>
  </Box>
);

export default CommandTab;
