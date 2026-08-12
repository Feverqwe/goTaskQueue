import React, {FC} from 'react';
import {Box, Stack, TextField} from '@mui/material';
import {Field} from 'react-final-form';
import {CODE_FIELD_SX} from '../../../../../components/CodeField/styles';
import SectionHeading from '../../../../../components/SectionHeading/SectionHeading';
import {required} from './formUtils';

interface GeneralTabProps {
  hidden: boolean;
  isNew?: boolean;
}

const GeneralTab: FC<GeneralTabProps> = ({hidden, isNew}) => (
  <Box component="section" role="tabpanel" hidden={hidden} aria-label="General template settings">
    <Stack spacing={2.5}>
      <Box>
        <SectionHeading sx={{mb: 1}}>Template identity</SectionHeading>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))'},
            gap: 1.5,
          }}
        >
          <Field<string> name="name" validate={required}>
            {({input, meta}) => (
              <TextField
                {...input}
                size="small"
                label="Name"
                required
                fullWidth
                autoFocus
                error={meta.touched && Boolean(meta.error)}
                helperText={meta.touched ? meta.error : undefined}
                slotProps={{inputLabel: {shrink: true}}}
              />
            )}
          </Field>
          <Field<string> name="id">
            {({input}) => (
              <TextField
                {...input}
                size="small"
                label="Id"
                fullWidth
                slotProps={{inputLabel: {shrink: true}}}
                sx={CODE_FIELD_SX}
              />
            )}
          </Field>
          {!isNew && (
            <Field<string> name="place" validate={required}>
              {({input, meta}) => (
                <TextField
                  {...input}
                  size="small"
                  label="Place"
                  required
                  fullWidth
                  error={meta.touched && Boolean(meta.error)}
                  helperText={meta.touched ? meta.error : undefined}
                  slotProps={{inputLabel: {shrink: true}}}
                  sx={[CODE_FIELD_SX, {gridColumn: {sm: '1 / -1'}}]}
                />
              )}
            </Field>
          )}
        </Box>
      </Box>

      <Box>
        <SectionHeading sx={{mb: 1}}>Task presentation</SectionHeading>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))'},
            gap: 1.5,
          }}
        >
          <Field<string> name="label">
            {({input, meta}) => (
              <TextField
                {...input}
                size="small"
                label="Label"
                fullWidth
                error={Boolean(meta.error)}
                helperText={meta.error}
                slotProps={{inputLabel: {shrink: true}}}
              />
            )}
          </Field>
          <Field<string> name="group">
            {({input, meta}) => (
              <TextField
                {...input}
                size="small"
                label="Group"
                fullWidth
                error={Boolean(meta.error)}
                helperText={meta.error}
                slotProps={{inputLabel: {shrink: true}}}
              />
            )}
          </Field>
        </Box>
      </Box>
    </Stack>
  </Box>
);

export default GeneralTab;
