import {Alert, Button, Snackbar} from '@mui/material';
import React, {FC} from 'react';
import type {TaskConnectionState} from './TaskLogSocket';

interface TaskConnectionAlertProps {
  state: TaskConnectionState;
  onReconnect: () => void;
}

const TaskConnectionAlert: FC<TaskConnectionAlertProps> = ({state, onReconnect}) => {
  if (state !== 'reconnecting') return null;

  return (
    <Snackbar anchorOrigin={{vertical: 'bottom', horizontal: 'right'}} open={true}>
      <Alert
        severity="warning"
        sx={{width: '100%'}}
        action={
          <Button color="inherit" size="small" sx={{whiteSpace: 'nowrap'}} onClick={onReconnect}>
            Retry now
          </Button>
        }
      >
        Output disconnected. Reconnecting…
      </Alert>
    </Snackbar>
  );
};

export default TaskConnectionAlert;
