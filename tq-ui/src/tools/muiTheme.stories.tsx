import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

const statusItems = [
  {label: 'Running', color: 'info' as const, icon: <PlayArrowRoundedIcon />},
  {label: 'Finished', color: 'success' as const, icon: <CheckCircleOutlineRoundedIcon />},
  {label: 'Waiting', color: 'warning' as const, icon: <PauseCircleOutlineRoundedIcon />},
  {label: 'Failed', color: 'error' as const, icon: <ErrorOutlineRoundedIcon />},
];

const ThemePreview = () => (
  <Box sx={{minHeight: '100vh', p: {xs: 2, sm: 4}}}>
    <Box sx={{mx: 'auto', maxWidth: 960}}>
      <Stack spacing={0.75} sx={{mb: 3}}>
        <Typography variant="overline" color="primary.light">
          GoTaskQueue / visual system
        </Typography>
        <Typography variant="h4">Graphite relay</Typography>
        <Typography color="text.secondary" sx={{maxWidth: 620}}>
          A dark, focused interface for scanning task state and acting without leaving the queue.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {xs: '1fr', md: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)'},
          gap: 2,
        }}
      >
        <Stack spacing={1.25}>
          {[
            ['Build desktop release', 'npm run build && go build ./...', 'Running'],
            ['Sync task templates', './scripts/sync-templates.sh', 'Finished'],
            ['Deploy queue worker', 'deploy release --service queue-worker', 'Waiting'],
          ].map(([name, command, state], index) => (
            <Card key={name}>
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1.5,
                  '&:last-child': {pb: 1.5},
                }}
              >
                <Box sx={{minWidth: 0, flexGrow: 1}}>
                  <Typography sx={{fontWeight: 700}}>{name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {command}
                  </Typography>
                </Box>
                <Chip
                  label={state}
                  color={index === 0 ? 'info' : index === 1 ? 'success' : 'warning'}
                  variant="outlined"
                  size="small"
                />
                <IconButton aria-label={`Run ${name}`} size="small">
                  <PlayArrowRoundedIcon />
                </IconButton>
              </CardContent>
            </Card>
          ))}

          <Alert severity="error">
            Task exited with status 1. Review the output before retrying.
          </Alert>
          <Alert severity="info" variant="outlined">
            Outlined alerts keep their variant styling.
          </Alert>
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              New run
            </Typography>
            <Typography variant="h5" sx={{mt: 0.5, mb: 2}}>
              Configure task
            </Typography>
            <Stack spacing={2}>
              <TextField label="Label" defaultValue="Release candidate" size="small" />
              <TextField label="Command" defaultValue="./scripts/release.sh" size="small" />
              <FormControlLabel control={<Switch defaultChecked />} label="Write task log" />
              <Stack direction={{xs: 'column', sm: 'row'}} spacing={1}>
                <Button variant="contained" startIcon={<PlayArrowRoundedIcon />}>
                  Run task
                </Button>
                <Button variant="outlined">Save template</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Stack direction="row" useFlexGap spacing={1} sx={{mt: 3, flexWrap: 'wrap'}}>
        {statusItems.map(({label, color, icon}) => (
          <Chip key={label} label={label} color={color} icon={icon} variant="outlined" />
        ))}
        <IconButton aria-label="Retry warning" color="warning" size="small">
          <ErrorOutlineRoundedIcon />
        </IconButton>
        <CircularProgress aria-label="Warning progress" color="warning" size={24} />
      </Stack>
    </Box>
  </Box>
);

const meta = {
  title: 'Theme/Graphite Relay',
  component: ThemePreview,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ThemePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ControlRoom: Story = {};
