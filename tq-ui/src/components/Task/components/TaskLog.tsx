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

const TaskLog: FC<TaskLogProps> = ({task: {id, state}, remapNewLine, onUpdate}) => {
  const [isOpen, setOpen] = useState(false);
  const [isError, setError] = useState(false);
  const refWrapper = useRef<HTMLDivElement>(null);
  const [scope] = useState(() => {
    const terminal = new Terminal({
      convertEol: true,
      fontSize: 14,
      theme,
    });

    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);

    let ws: WebSocket;
    let isOpen = false;

    const sendCommand = (type: 'ping' | 'in', data = '') => {
      if (!isOpen) return;
      let payload = '';
      switch (type) {
        case 'ping': {
          payload = 'p';
          break;
        }
        case 'in': {
          payload = `i${data}`;
          break;
        }
      }
      ws.send(payload);
    };

    terminal.onData((char) => {
      if (scope.remapNewLine) {
        if (char === '\r') {
          char = '\n';
        } else if (char === '\n') {
          char = '\r';
        }
      }
      sendCommand('in', char);
    });

    return {
      wsConnect: () => {
        setError(false);
        ws = new WebSocket(`ws://${location.host}/ws?id=${id}`);
        ws.onopen = () => {
          setOpen(isOpen = true);
        };
        ws.onclose = () => {
          setOpen(isOpen = false);
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
      fitAddon,
      remapNewLine,
    };
  });
  scope.remapNewLine = remapNewLine;

  useEffect(() => {
    const {terminal, fitAddon} = scope;
    const wrapper = refWrapper.current;
    if (!wrapper) return;

    const onResize = () => {
      fitAddon.fit();
    };

    const onResizeThrottled = throttle(onResize, 100);

    terminal.open(wrapper);
    scope.wsConnect();
    window.addEventListener('resize', onResizeThrottled);

    requestAnimationFrame(onResize);

    return () => {
      window.removeEventListener('resize', onResizeThrottled);
      scope.wsClose();
      terminal.dispose();
    };
  }, [scope]);

  useEffect(() => {
    // when ws closed do update task
    if (!isOpen) return;
    return () => {
      onUpdate();
    };
  }, [onUpdate, isOpen]);

  useEffect(() => {
    // when ws closed do stop interval
    if (!isOpen) return;
    const intervalId = setInterval(() => {
      scope.wsSend('ping');
    }, 5 * 1000);
    return () => clearInterval(intervalId);
  }, [scope, isOpen]);

  useEffect(() => {
    if (state !== TaskState.Started) return;
    scope.terminal.focus();
  }, [scope, state]);

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
