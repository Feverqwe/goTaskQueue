import React, {FC} from 'react';
import {Box, TextField} from '@mui/material';
import {Field} from 'react-final-form';
import {RawTemplate} from '../../types';

interface VariablesTabProps {
  hidden: boolean;
  isNew?: boolean;
  variables: RawTemplate['variables'];
}

const VariablesTab: FC<VariablesTabProps> = ({hidden, isNew, variables}) => (
  <Box component="section" role="tabpanel" hidden={hidden} aria-label="Template variables">
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))'},
        gap: 1.5,
      }}
    >
      {variables.map(({name, value}, index) => (
        <Field<string> key={`${value}-${index}`} name={`variables[${index}]`}>
          {({input}) => (
            <TextField
              {...input}
              size="small"
              autoFocus={!isNew && index === 0}
              label={name}
              type="text"
              fullWidth
              variant="outlined"
              slotProps={{inputLabel: {shrink: true}}}
            />
          )}
        </Field>
      ))}
    </Box>
  </Box>
);

export default VariablesTab;
