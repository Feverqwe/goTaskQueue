import {Alert, Button} from '@mui/material';
import React, {FC} from 'react';

interface TaskRefreshAlertProps {
  error: unknown;
  onRetry: () => void;
}

const TaskRefreshAlert: FC<TaskRefreshAlertProps> = ({error, onRetry}) => {
  const message = error instanceof Error ? error.message : 'Unknown error';

  return (
    <Alert
      severity="warning"
      sx={{mx: 1, mb: 1}}
      action={
        <Button color="inherit" size="small" sx={{whiteSpace: 'nowrap'}} onClick={onRetry}>
          Retry
        </Button>
      }
    >
      Could not refresh task details: {message}. Showing the last known state.
    </Alert>
  );
};

export default TaskRefreshAlert;
