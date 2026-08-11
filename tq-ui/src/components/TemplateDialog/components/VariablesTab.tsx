import React, {FC} from 'react';
import {Box, MenuItem, TextField} from '@mui/material';
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
      {variables.map(({name, value, type, options}, index) => (
        <Field<string> key={`${value}-${index}`} name={`variables[${index}]`}>
          {({input}) => {
            const isSelect = type === 'select';
            return (
              <TextField
                {...input}
                size="small"
                autoFocus={!isNew && index === 0}
                label={name}
                type={isSelect ? undefined : 'text'}
                select={isSelect}
                fullWidth
                variant="outlined"
                disabled={isSelect && !options?.length}
                helperText={isSelect && !options?.length ? 'No options configured' : undefined}
                slotProps={{inputLabel: {shrink: true}}}
              >
                {isSelect
                  ? options?.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))
                  : undefined}
              </TextField>
            );
          }}
        </Field>
      ))}
    </Box>
  </Box>
);

export default VariablesTab;
