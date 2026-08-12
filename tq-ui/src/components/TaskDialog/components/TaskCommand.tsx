import React, {FC} from 'react';
import {Box, Paper, Typography} from '@mui/material';
import {Task} from '../../types';
import CopyButton from './CopyButton';

interface TaskCommandProps {
  task: Task;
}

const TaskCommand: FC<TaskCommandProps> = ({task}) => (
  <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.5}}>
    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
      <Box sx={{flexGrow: 1, minWidth: 0}}>
        <Typography variant="subtitle2" sx={{fontWeight: 600}}>
          Launch command
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Exact command used to start this task
        </Typography>
      </Box>
      <CopyButton value={task.command} label="Copy command" />
    </Box>
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        maxHeight: {xs: 'calc(100vh - 280px)', sm: 420},
        overflow: 'auto',
        bgcolor: 'background.default',
      }}
    >
      <Typography
        component="pre"
        variant="body2"
        sx={{
          m: 0,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          fontFamily: 'monospace',
        }}
      >
        {task.command}
      </Typography>
    </Paper>
  </Box>
);

export default TaskCommand;
