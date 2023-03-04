import React, {FC, ReactNode, useCallback, useState} from 'react';
import {Alert, Snackbar} from '@mui/material';
import {AlertColor} from '@mui/material/Alert/Alert';
import {NotificationCtx} from './NotificationCtx';
import {Task, TaskState} from '../types';

interface NotificationProviderProps {
  children: ReactNode;
}

interface StackItem {
  color: AlertColor;
  content: ReactNode;
  onClose: (event?: React.SyntheticEvent | Event, reason?: string) => void;
}

const NotificationProvider: FC<NotificationProviderProps> = ({children}) => {
  const [stack, setStack] = useState<StackItem[]>([]);

  const emit = useCallback(({state, error, label, command}: Task) => {
    let color: AlertColor = 'info';
    const name = label || command;
    let message = '';
    switch (state) {
      case TaskState.Finished: {
        color = 'success';
        message = 'Success';
        break;
      }
      case TaskState.Canceled: {
        color = 'warning';
        message = 'Canceled';
        break;
      }
      case TaskState.Error: {
        color = 'error';
        message = `Error: ${error}`;
        break;
      }
    }
    const content = (
      <>
        {name}: {message}
      </>
    );

    const onClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') {
        return;
      }

      setStack((prevValue) => {
        const newValue = prevValue.slice(0);
        const pos = newValue.indexOf(item);
        if (pos !== -1) {
          newValue.splice(pos, 1);
        }
        return newValue;
      });
    };

    const item: StackItem = {
      color,
      content,
      onClose,
    };

    setTimeout(onClose, 10 * 1000);

    setStack((prevValue) => {
      return [...prevValue, item];
    });
  }, []);

  return (
    <>
      <NotificationCtx.Provider value={emit}>{children}</NotificationCtx.Provider>
      {stack.map(({color, content, onClose}, index) => {
        return (
          <Snackbar
            key={String(index)}
            anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
            open={true}
            autoHideDuration={6000}
            onClose={onClose}
          >
            <Alert onClose={onClose} severity={color} sx={{width: '100%'}}>
              {content}
            </Alert>
          </Snackbar>
        );
      })}
    </>
  );
};

export default NotificationProvider;
