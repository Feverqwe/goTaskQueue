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
  const [isConnecting, setConnecting] = useState(false);
  const refWrapper = useRef<HTMLDivElement>(null);
  const refTask = useRef<Task>(task);
  refTask.current = task;
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

    const sendCommand = (type: 'ping' | 'in' | 'resize', data: unknown = '') => {
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
        case 'resize': {
          payload = `r${JSON.stringify(data)}`;
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

    const handleResize = (cols: number, rows: number) => {
      const wrapper = refWrapper.current;
      if (!wrapper) return;
      if (!refTask.current.isPty || refTask.current.state !== TaskState.Started) return;
      const x = wrapper.clientWidth;
      const y = wrapper.clientHeight;
      sendCommand('resize', {cols, rows, x, y});
    };

    terminal.onResize(({cols, rows}) => {
      handleResize(cols, rows);
    });

    return {
      wsConnect: () => {
        setConnecting(true);
        ws = new WebSocket(`ws://${location.host}/ws?id=${id}`);
        ws.onopen = () => {
          setOpen(isOpen = true);
          setConnecting(false);
          handleResize(terminal.cols, terminal.rows);
        };
        ws.onclose = () => {
          setOpen(isOpen = false);
          setConnecting(false);
        };
        ws.onmessage = async (e: MessageEvent<Blob>) => {
          const buffer = await e.data.arrayBuffer();
          terminal.write(new Uint8Array(buffer));
        };
      },
      wsClose: () => {
        ws.close();
      },
      wsSend: sendCommand,
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
    scope.terminal.reset();
    scope.wsConnect();
  }, [scope]);

  return (
    <Box px={1} pb={1} sx={{flexGrow: 1}}>
      <div style={{height: '100%', width: '100%'}} ref={refWrapper} />
      {!isOpen && !isConnecting && state === TaskState.Started && (
        <Snackbar anchorOrigin={{vertical: 'bottom', horizontal: 'right'}} open={true}>
          <Alert
            severity="error"
            sx={{ width: '100%' }}
            action={
              <Button size="small" onClick={handleReconnect}>Reconnect</Button>
            }
          >
            Connection lost
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default TaskLog;
