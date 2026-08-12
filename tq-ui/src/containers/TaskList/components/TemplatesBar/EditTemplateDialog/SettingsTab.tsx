import React, {FC} from 'react';
import {Box, Checkbox, FormControlLabel, Stack, TextField} from '@mui/material';
import {Field} from 'react-final-form';
import {CODE_FIELD_SX} from '../../../../../components/CodeField/styles';
import SectionHeading from '../../../../../components/SectionHeading/SectionHeading';

interface SettingsTabProps {
  hidden: boolean;
  isPtySupported: boolean;
}

const SettingsTab: FC<SettingsTabProps> = ({hidden, isPtySupported}) => (
  <Box component="section" role="tabpanel" hidden={hidden} aria-label="Template execution settings">
    <Stack spacing={2.5}>
      <Box>
        <SectionHeading sx={{mb: 1}}>Lifecycle</SectionHeading>
        <Field<number | string> name="ttl">
          {({input}) => (
            <TextField
              {...input}
              size="small"
              label="TTL after finish (seconds)"
              type="number"
              slotProps={{inputLabel: {shrink: true}, htmlInput: {min: 0}}}
              sx={CODE_FIELD_SX}
            />
          )}
        </Field>
      </Box>
      <Box>
        <SectionHeading sx={{mb: 1}}>Execution</SectionHeading>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))'},
            columnGap: 2,
          }}
        >
          {isPtySupported && (
            <Field<boolean> name="isPty" type="checkbox">
              {({input}) => (
                <FormControlLabel
                  label="Pseudo-terminal"
                  control={<Checkbox {...input} size="small" checked={input.checked} />}
                />
              )}
            </Field>
          )}
          <Field<boolean> name="isOnlyCombined" type="checkbox">
            {({input}) => (
              <FormControlLabel
                label="Combined output"
                control={<Checkbox {...input} size="small" checked={input.checked} />}
              />
            )}
          </Field>
          <Field<boolean> name="isWriteLogs" type="checkbox">
            {({input}) => (
              <FormControlLabel
                label="Write logs"
                control={<Checkbox {...input} size="small" checked={input.checked} />}
              />
            )}
          </Field>
          <Field<boolean> name="isSingleInstance" type="checkbox">
            {({input}) => (
              <FormControlLabel
                label="Single instance"
                control={<Checkbox {...input} size="small" checked={input.checked} />}
              />
            )}
          </Field>
          <Field<boolean> name="isStartOnBoot" type="checkbox">
            {({input}) => (
              <FormControlLabel
                label="Start on boot"
                control={<Checkbox {...input} size="small" checked={input.checked} />}
              />
            )}
          </Field>
        </Box>
      </Box>
    </Stack>
  </Box>
);

export default SettingsTab;
