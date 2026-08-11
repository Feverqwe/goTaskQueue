import React, {FC} from 'react';
import {Box, Button, Chip, Paper, Typography} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {Task, TaskState} from '../../types';

interface TaskOutputProps {
  task: Task;
}

interface LogRowProps {
  id: string;
  name: string;
  path: string;
  disabled: boolean;
}

const LogRow: FC<LogRowProps> = ({id, name, path, disabled}) => {
  const href = `/api/task/${path}?id=${encodeURIComponent(id)}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: {xs: 'stretch', sm: 'center'},
        flexDirection: {xs: 'column', sm: 'row'},
        gap: 1,
      }}
    >
      <Box sx={{flexGrow: 1}}>
        <Typography variant="subtitle2">{name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {name.toLowerCase()}.log
        </Typography>
      </Box>
      <Button
        component="a"
        href={href}
        target="_blank"
        rel="noreferrer"
        variant="outlined"
        size="small"
        disabled={disabled}
        startIcon={<OpenInNewIcon />}
      >
        Open
      </Button>
      <Button
        component="a"
        href={href}
        download={`${name.toLowerCase()}.log`}
        variant="outlined"
        size="small"
        disabled={disabled}
        startIcon={<DownloadIcon />}
      >
        Download
      </Button>
    </Paper>
  );
};

const TaskOutput: FC<TaskOutputProps> = ({task}) => {
  const disabled = task.state === TaskState.Idle;

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.5}}>
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
        <Typography variant="body2" color="text.secondary" sx={{flexGrow: 1}}>
          {task.isWriteLogs
            ? 'Logs are persisted and remain available after an application restart.'
            : 'Logs are kept in memory and are unavailable after an application restart.'}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          color={task.isWriteLogs ? 'success' : 'default'}
          label={task.isWriteLogs ? 'Persisted' : 'In memory'}
        />
      </Box>
      <LogRow id={task.id} name="Combined" path="combined" disabled={disabled} />
      {!task.isOnlyCombined && (
        <>
          <LogRow id={task.id} name="Stdout" path="stdout" disabled={disabled} />
          <LogRow id={task.id} name="Stderr" path="stderr" disabled={disabled} />
        </>
      )}
    </Box>
  );
};

export default TaskOutput;
