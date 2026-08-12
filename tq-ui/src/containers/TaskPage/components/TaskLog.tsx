import React, {FC, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Box, useMediaQuery, useTheme} from '@mui/material';
import {FitAddon} from '@xterm/addon-fit';
import {WebLinksAddon} from '@xterm/addon-web-links';
import {Terminal} from '@xterm/xterm';
import throttle from 'lodash.throttle';
import {theme} from './theme';
import {PtyScreenSize, Task, TaskState} from '../../../components/types';
import TaskConnectionAlert, {TaskConnectionState} from './TaskConnectionAlert';

import '@xterm/xterm/css/xterm.css';
import './XTerm.css';
import {Command, ServerCommand} from './constants';

interface TaskLogProps {
  task: Task;
  onUpdate: () => Promise<Task | undefined>;
  onComplete: (task: Task) => void;
}

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];
const shouldReconnect = (state: TaskState) => !completeStates.includes(state);

const TaskLog: FC<TaskLogProps> = ({task, onUpdate, onComplete}) => {
  const {id, state} = task;
  const [connectionState, setConnectionState] = useState<TaskConnectionState>('connecting');
  const refWrapper = useRef<HTMLDivElement>(null);
  const refCtr = useRef<HTMLDivElement>(null);

  const refTask = useRef<Task>(task);
  refTask.current = task;
  const refOnUpdate = useRef(onUpdate);
  refOnUpdate.current = onUpdate;
  const refOnComplete = useRef(onComplete);
  refOnComplete.current = onComplete;

  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('sm'));
  const [isDesktopInit] = useState(isDesktop);

  const scope = useMemo(() => {
    const terminal = new Terminal({
      convertEol: true,
      fontSize: 14,
      theme,
    });

    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

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

    const resizeObserver = new ResizeObserver(throttle(() => fitAddon.fit(), 100));

    let ws: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let connectionTimer: ReturnType<typeof setTimeout> | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let retryCount = 0;
    let disposed = false;
    let currentConnectionState: TaskConnectionState = 'connecting';
    let isHistory = false;
    let isOutputPaused = false;
    let outputGeneration = 0;
    let notifiedCompletion = completeStates.includes(refTask.current.state)
      ? `${refTask.current.state}:${refTask.current.finishedAt}`
      : undefined;

    const history: Uint8Array[] = [];
    const queue: Uint8Array[] = [];
    const deferredHistory: Uint8Array[] = [];
    const deferredQueue: Uint8Array[] = [];
    const drainResolvers: Array<() => void> = [];
    let running = false;

    const updateConnectionState = (nextState: TaskConnectionState) => {
      currentConnectionState = nextState;
      setConnectionState(nextState);
    };

    const clearReconnectTimer = () => {
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const clearPingTimer = () => {
      if (pingTimer !== undefined) {
        clearInterval(pingTimer);
        pingTimer = undefined;
      }
    };

    const clearConnectionTimer = () => {
      if (connectionTimer !== undefined) {
        clearTimeout(connectionTimer);
        connectionTimer = undefined;
      }
    };

    const resolveDrain = () => {
      if (running || history.length || queue.length) return;
      while (drainResolvers.length) drainResolvers.shift()!();
    };

    const nextData = () => {
      if (running || disposed) return;
      const data = history.shift();
      isHistory = data !== undefined;
      const nextChunk = data ?? queue.shift();
      if (!nextChunk) {
        isHistory = false;
        resolveDrain();
        return;
      }

      running = true;
      terminal.write(nextChunk, () => {
        running = false;
        isHistory = false;
        nextData();
      });
    };

    const writeData = (dataType: ServerCommand, data: Uint8Array) => {
      const historyTarget = isOutputPaused ? deferredHistory : history;
      const queueTarget = isOutputPaused ? deferredQueue : queue;
      if (dataType === ServerCommand.History) {
        historyTarget.push(data);
      } else if (dataType === ServerCommand.Actual) {
        queueTarget.push(data);
      }
      if (!isOutputPaused) nextData();
    };

    const waitForDrain = () => {
      if (!running && history.length === 0 && queue.length === 0) return Promise.resolve();
      return new Promise<void>((resolve) => drainResolvers.push(resolve));
    };

    const cancelPendingReplay = () => {
      outputGeneration += 1;
      isOutputPaused = false;
      deferredHistory.length = 0;
      deferredQueue.length = 0;
    };

    const prepareReconnectOutput = () => {
      const generation = ++outputGeneration;
      isOutputPaused = true;
      deferredHistory.length = 0;
      deferredQueue.length = 0;
      waitForDrain().then(() => {
        if (disposed || generation !== outputGeneration) return;
        terminal.reset();
        history.push(...deferredHistory);
        queue.push(...deferredQueue);
        deferredHistory.length = 0;
        deferredQueue.length = 0;
        isOutputPaused = false;
        nextData();
      });
    };

    const sendCommand = (type: Command, data: string | PtyScreenSize = '') => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      let payload = '';
      switch (type) {
        case Command.Ping: {
          payload = type;
          break;
        }
        case Command.Input: {
          payload = `${type}${data}`;
          break;
        }
        case Command.Resize: {
          payload = `${type}${JSON.stringify(data)}`;
          break;
        }
      }
      try {
        ws.send(payload);
      } catch {
        ws.close();
      }
    };

    terminal.onData((data) => {
      if (isHistory || isOutputPaused) return;
      if (!refTask.current.isPty) {
        data = data.replace(/\r\n|\r/g, '\n');
      }
      sendCommand(Command.Input, data);
    });

    const handleResize = (cols: number, rows: number) => {
      const wrapper = refCtr.current;
      if (!wrapper) return;
      if (!refTask.current.isPty || refTask.current.state !== TaskState.Started) return;
      const screenSize: PtyScreenSize = {
        x: wrapper.clientWidth,
        y: wrapper.clientHeight,
        cols,
        rows,
      };
      sendCommand(Command.Resize, screenSize);
    };

    terminal.onResize(({cols, rows}) => {
      handleResize(cols, rows);
    });

    const detachSocket = () => {
      if (!ws) return;
      const previousSocket = ws;
      ws = undefined;
      clearConnectionTimer();
      previousSocket.onopen = null;
      previousSocket.onclose = null;
      previousSocket.onerror = null;
      previousSocket.onmessage = null;
      previousSocket.close();
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== undefined) return;
      retryCount += 1;
      updateConnectionState(shouldReconnect(refTask.current.state) ? 'reconnecting' : 'connecting');
      const delay = Math.min(1000 * 2 ** (retryCount - 1), 10 * 1000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect(true);
      }, delay);
    };

    const notifyIfComplete = (latestTask: Task) => {
      if (!completeStates.includes(latestTask.state)) return;
      const completion = `${latestTask.state}:${latestTask.finishedAt}`;
      if (completion === notifiedCompletion) return;
      notifiedCompletion = completion;
      refOnComplete.current(latestTask);
    };

    const handleClose = async (
      socket: WebSocket,
      didOpen: boolean,
      receivedFinished: boolean,
      receivedProtocolError: boolean,
      wasClean: boolean,
    ) => {
      clearPingTimer();

      if (receivedFinished) {
        updateConnectionState('closed');
        try {
          const latestTask = await refOnUpdate.current();
          if (latestTask) notifyIfComplete(latestTask);
        } catch {
          // The page displays the refresh error when the final task state cannot be loaded.
        }
        return;
      }

      let latestTask = refTask.current;
      try {
        latestTask = (await refOnUpdate.current()) ?? latestTask;
        notifyIfComplete(latestTask);
      } catch {
        // The page displays the refresh error while the log keeps retrying independently.
      }

      if (disposed || socket !== ws) return;
      if (receivedProtocolError || shouldReconnect(latestTask.state) || !didOpen || !wasClean) {
        scheduleReconnect();
      } else {
        updateConnectionState('closed');
      }
    };

    function connect(isReconnect = false) {
      if (disposed) return;
      clearReconnectTimer();
      clearPingTimer();
      detachSocket();
      if (isReconnect) {
        cancelPendingReplay();
        updateConnectionState(
          shouldReconnect(refTask.current.state) ? 'reconnecting' : 'connecting',
        );
      } else {
        updateConnectionState('connecting');
      }

      let socket: WebSocket;
      try {
        socket = new WebSocket(
          `${location.protocol === 'http:' ? 'ws' : 'wss'}://${location.host}/ws?id=${encodeURIComponent(id)}`,
        );
      } catch {
        scheduleReconnect();
        return;
      }

      ws = socket;
      socket.binaryType = 'arraybuffer';
      let didOpen = false;
      let receivedFinished = false;
      let receivedProtocolError = false;

      socket.onopen = () => {
        if (disposed || socket !== ws) return;
        clearConnectionTimer();
        didOpen = true;
        retryCount = 0;
        if (isReconnect) {
          prepareReconnectOutput();
          refOnUpdate.current().catch(() => {});
        }
        updateConnectionState('connected');
        handleResize(terminal.cols, terminal.rows);
        pingTimer = setInterval(() => sendCommand(Command.Ping), 30 * 1000);
      };
      socket.onclose = (event) => {
        if (disposed || socket !== ws) return;
        clearConnectionTimer();
        handleClose(socket, didOpen, receivedFinished, receivedProtocolError, event.wasClean).catch(
          () => {},
        );
      };
      socket.onerror = () => {
        if (socket === ws) socket.close();
      };
      socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (disposed || socket !== ws) return;
        const bytes = new Uint8Array(event.data);
        if (bytes.length === 0) return;
        const dataType = String.fromCharCode(bytes[0]) as ServerCommand;
        if (dataType === ServerCommand.Finished) {
          receivedFinished = true;
          return;
        }
        if (dataType === ServerCommand.Error) {
          receivedProtocolError = true;
          return;
        }
        writeData(dataType, bytes.slice(1));
      };
      connectionTimer = setTimeout(() => {
        if (socket === ws && socket.readyState === WebSocket.CONNECTING) socket.close();
      }, 10 * 1000);
    }

    return {
      connect,
      reconnect: () => {
        retryCount = Math.max(retryCount, 1);
        connect(true);
      },
      syncTaskState: (taskState: TaskState) => {
        if (shouldReconnect(taskState)) {
          if (currentConnectionState === 'closed') scheduleReconnect();
        } else if (currentConnectionState === 'reconnecting') {
          // A finished task has a finite log. Retrying its history load is not a lost live stream.
          updateConnectionState('connecting');
        }
      },
      dispose: () => {
        disposed = true;
        cancelPendingReplay();
        clearReconnectTimer();
        clearConnectionTimer();
        clearPingTimer();
        detachSocket();
        terminal.dispose();
        resizeObserver.disconnect();
      },
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
    scope.connect();

    return scope.dispose;
  }, [scope]);

  useEffect(() => {
    scope.syncTaskState(state);
  }, [scope, state]);

  useEffect(() => {
    if (!isDesktopInit || state !== TaskState.Started) return;
    scope.terminal.focus();
  }, [isDesktopInit, scope.terminal, state]);

  useEffect(() => {
    scope.terminal.options.disableStdin = state !== TaskState.Started;
  }, [scope, state]);

  const handleReconnect = useCallback(() => {
    scope.reconnect();
  }, [scope]);

  return (
    <Box
      ref={refCtr}
      sx={{
        mx: 1,
        mb: 1,
        flexGrow: 1,
        overflow: 'auto',
      }}
    >
      <div style={{height: '100%', width: '100%'}} ref={refWrapper} />
      <TaskConnectionAlert state={connectionState} onReconnect={handleReconnect} />
    </Box>
  );
};

export default TaskLog;
