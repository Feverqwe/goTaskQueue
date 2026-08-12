import React, {FC} from 'react';
import {Box} from '@mui/material';
import {Field} from 'react-final-form';
import CommandFieldAsync from '../../CommandField/CommandFieldAsync';

interface CommandTabProps {
  hidden: boolean;
}

const CommandTab: FC<CommandTabProps> = ({hidden}) => (
  <Box component="section" role="tabpanel" hidden={hidden} aria-label="Task command">
    <Field<string> name="command" subscription={{value: true}}>
      {({input}) => <CommandFieldAsync defaultValue={input.value} onChange={input.onChange} />}
    </Field>
  </Box>
);

export default CommandTab;
