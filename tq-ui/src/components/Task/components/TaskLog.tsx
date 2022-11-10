import React, {FC, useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Box, Button, Snackbar} from '@mui/material';
import {Terminal} from 'xterm';
import {FitAddon} from 'xterm-addon-fit';
import throttle from 'lodash.throttle';
import {theme} from './theme';
import {Task, TaskState} from '../../types';

import 'xterm/css/xterm.css';
import './XTerm.css';

interface TaskLogProps {
  task: Task,
  remapNewLine: boolean;
  onUpdate: () => void;
}

const TaskLog: FC<TaskLogProps> = ({task, remapNewLine, onUpdate}) => {
  const {id, state} = task;
  const [isOpen, setOpen] = useState(false);
  const [isError, setError] = useState(false);
  const refWrapper = useRef<null | HTMLDivElement>(null);
  const [scope] = useState(() => {
    const terminal = new Terminal({
      convertEol: true,
      fontSize: 14,
      theme,
    });

    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);

    const sendCommand = (type: string, data?: string) => {
      ws.send(JSON.stringify({type, data}));
    };

    terminal.onData((char) => {
      if (scope.task.state !== TaskState.Started) return;
      if (scope.remapNewLine) {
        if (char === '\r') {
          char = '\n';
        } else if (char === '\n') {
          char = '\r';
        }
      }
      sendCommand('in', char);
    });

    let ws: WebSocket;

    return {
      wsConnect: () => {
        setError(false);
        ws = new WebSocket(`ws://${location.host}/ws?id=${id}`);
        ws.onopen = () => {
          setOpen(true);
        };
        ws.onclose = () => {
          setOpen(false);
        };
        ws.onmessage = async (e: MessageEvent<Blob>) => {
          const buffer = await e.data.arrayBuffer();
          terminal.write(new Uint8Array(buffer));
        };
        ws.onerror = () => {
          setError(true);
        };
      },
      wsClose: () => {
        ws.close();
      },
      wsSend: sendCommand,
      wsReconnect() {
        this.wsClose();
        this.wsConnect();
      },
      terminal,
      task,
      fitAddon,
      remapNewLine,
    };
  });
  scope.task = task;
  scope.remapNewLine = remapNewLine;

  useEffect(() => {
    const wrapper = refWrapper.current;
    if (!wrapper) {
      throw new Error('Ctr is empty');
    }

    const {terminal, fitAddon} = scope;

    const onResize = () => {
      fitAddon.fit();
    };

    const onResizeThrottled = throttle(onResize, 100);

    requestAnimationFrame(onResize);

    window.addEventListener('resize', onResizeThrottled);

    terminal.open(wrapper);

    scope.wsConnect();

    return () => {
      window.removeEventListener('resize', onResizeThrottled);
      scope.wsClose();
      terminal.dispose();
    };
  }, [scope]);

  useEffect(() => {
    return () => {
      if (isOpen && [TaskState.Idle, TaskState.Started].includes(state)) {
        onUpdate();
      }
    };
  }, [onUpdate, state, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const intervalId = setInterval(() => {
      scope.wsSend('ping');
    }, 5 * 1000);
    return () => clearInterval(intervalId);
  }, [scope, isOpen]);

  useEffect(() => {
    if (task.state !== TaskState.Started) return;
    scope.terminal.focus();
  }, [scope, task.state]);

  const handleReconnect = useCallback(() => {
    scope.wsReconnect();
  }, [scope]);

  return (
    <Box px={1} pb={1} sx={{flexGrow: 1}}>
      <div style={{height: '100%', width: '100%'}} ref={refWrapper} />
      {isError && (
        <Snackbar anchorOrigin={{vertical: 'bottom', horizontal: 'right'}} open={true}>
          <Alert
            severity="error"
            sx={{ width: '100%' }}
            action={
              <Button size="small" onClick={handleReconnect}>Reconnect</Button>
          }
          >
            WebSocket error
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default TaskLog;
