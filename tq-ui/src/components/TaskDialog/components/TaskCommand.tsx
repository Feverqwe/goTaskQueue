import React, {FC} from 'react';
import {Box, Paper, Typography} from '@mui/material';
import {Task} from '../../types';
import CopyButton from './CopyButton';

interface TaskCommandProps {
  task: Task;
}

const TaskCommand: FC<TaskCommandProps> = ({task}) => (
  <Box
    sx={{
      position: 'relative',
      display: 'flex',
      minHeight: 'inherit',
      flex: 1,
      flexDirection: 'column',
    }}
  >
    <Box sx={{position: 'absolute', top: 6, right: 6, zIndex: 1}}>
      <CopyButton value={task.command} label="Copy command" />
    </Box>
    <Paper
      square
      elevation={0}
      sx={{
        p: 2,
        pr: 6,
        minHeight: 'inherit',
        maxHeight: {sm: 420},
        flex: 1,
        overflow: 'auto',
        border: 0,
        bgcolor: 'background.default',
        boxShadow: 'none',
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
