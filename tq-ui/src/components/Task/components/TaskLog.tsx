import React, {FC, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Box, Button, Snackbar} from '@mui/material';
import {Terminal} from 'xterm';
import {FitAddon} from 'xterm-addon-fit';
import throttle from 'lodash.throttle';
import {theme} from './theme';
import {PtyScreenSize, Task, TaskState} from '../../types';
import {waitGroup} from '../utils';

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
  const refCtr = useRef<HTMLDivElement>(null);

  const refTask = useRef<Task>(task);
  refTask.current = task;
  const refRemapNewLine = useRef(remapNewLine);
  refRemapNewLine.current = remapNewLine;

  const scope = useMemo(() => {
    const terminal = new Terminal({
      convertEol: true,
      fontSize: 14,
      theme,
    });

    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type === 'keydown') {
        if (event.code === 'KeyK' && event.metaKey) {
          terminal.clear();
          return false;
        }
        if (event.code === 'Escape' && event.metaKey) {
          return false;
        }
      }
      return true;
    });

    const resizeObserver = new ResizeObserver(throttle(() => {
      fitAddon.fit();
    }, 100));

    let ws: WebSocket;
    let isOpen = false;
    let isHistory = false;

    const history: Uint8Array[] = [];
    const queue: Uint8Array[] = [];
    let running = false;
    const nextData = () => {
      if (running) return;
      running = true;

      if (history.length) {
        isHistory = true;
        const wg = waitGroup();
        while (history.length) {
          wg.add(1);
          const data = history.shift()!;
          terminal.write(data, wg.done);
        }
        wg.wait().then(() => {
          isHistory = false;
          running = false;
          nextData();
        });
        return;
      }

      while (queue.length) {
        const data = queue.shift()!;
        terminal.write(data);
      }

      running = false;
    };

    const writeData = (dataType: string, data: Uint8Array) => {
      if (dataType === 'h') {
        history.push(data);
      } else
      if (dataType === 'a') {
        queue.push(data);
      }
      nextData();
    };

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
      if (isHistory) return;
      if (refRemapNewLine.current) {
        if (char === '\r') {
          char = '\n';
        } else if (char === '\n') {
          char = '\r';
        }
      }
      sendCommand('in', char);
    });

    const handleResize = (cols: number, rows: number) => {
      const wrapper = refCtr.current;
      if (!wrapper) return;
      if (!refTask.current.isPty || refTask.current.state !== TaskState.Started) return;
      const x = wrapper.clientWidth;
      const y = wrapper.clientHeight;
      const screenSize: PtyScreenSize = {
        x, y, cols, rows,
      };
      sendCommand('resize', screenSize);
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
          const u8a = new Uint8Array(buffer);
          const data = u8a.slice(1);
          const dataType = String.fromCharCode(u8a[0]);
          writeData(dataType, data);
        };
      },
      wsClose: () => {
        ws.close();
      },
      wsSend: sendCommand,
      terminal,
      resizeObserver,
    };
  }, [id]);

  useEffect(() => {
    const {terminal, resizeObserver} = scope;
    const ctr = refCtr.current;
    const wrapper = refWrapper.current;
    if (!wrapper || !ctr) return;

    resizeObserver.observe(ctr);
    terminal.open(wrapper);
    scope.wsConnect();

    return () => {
      scope.wsClose();
      terminal.dispose();
      resizeObserver.disconnect();
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
    }, 30 * 1000);
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
    <Box mx={1} mb={1} sx={{flexGrow: 1, overflow: 'auto'}} ref={refCtr}>
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
