import React, {FC} from 'react';
import {Box, Checkbox, FormControlLabel, Stack, TextField, Typography} from '@mui/material';
import {Field} from 'react-final-form';

interface SettingsTabProps {
  hasTemplatePlace: boolean;
  hidden: boolean;
  isPtySupported: boolean;
}

const SettingsTab: FC<SettingsTabProps> = ({hasTemplatePlace, hidden, isPtySupported}) => (
  <Box component="section" role="tabpanel" hidden={hidden} aria-label="Task settings">
    <Stack spacing={2.5}>
      <Box component="section" aria-labelledby="template-details-title">
        <Typography id="template-details-title" variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
          Task details
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))'},
            gap: 1.5,
          }}
        >
          <Field<string> name="label">
            {({input}) => (
              <TextField
                {...input}
                size="small"
                label="Label"
                fullWidth
                type="text"
                variant="outlined"
                slotProps={{inputLabel: {shrink: true}}}
              />
            )}
          </Field>
          <Field<string> name="group">
            {({input}) => (
              <TextField
                {...input}
                size="small"
                label="Group"
                fullWidth
                type="text"
                variant="outlined"
                slotProps={{inputLabel: {shrink: true}}}
              />
            )}
          </Field>
          <Field<number | string> name="ttl">
            {({input}) => (
              <TextField
                {...input}
                size="small"
                label="TTL after finish (seconds)"
                type="number"
                variant="outlined"
                slotProps={{
                  inputLabel: {shrink: true},
                  htmlInput: {min: 0},
                }}
                sx={{'& .MuiInputBase-input': {fontFamily: 'monospace', fontSize: '0.8125rem'}}}
              />
            )}
          </Field>
        </Box>
      </Box>

      <Box component="section" aria-labelledby="template-execution-title">
        <Typography id="template-execution-title" variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
          Execution
        </Typography>
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
          {hasTemplatePlace && (
            <Field<boolean> name="isSingleInstance" type="checkbox">
              {({input}) => (
                <FormControlLabel
                  label="Single instance"
                  control={<Checkbox {...input} size="small" checked={input.checked} />}
                />
              )}
            </Field>
          )}
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
