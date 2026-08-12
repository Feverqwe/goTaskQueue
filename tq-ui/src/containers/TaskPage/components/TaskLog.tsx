import React, {FC, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Box, useMediaQuery, useTheme} from '@mui/material';
import {FitAddon} from '@xterm/addon-fit';
import {WebLinksAddon} from '@xterm/addon-web-links';
import {Terminal} from '@xterm/xterm';
import throttle from 'lodash.throttle';
import {theme} from './theme';
import {PtyScreenSize, Task, TaskState} from '../../../components/types';
import TaskConnectionAlert from './TaskConnectionAlert';

import '@xterm/xterm/css/xterm.css';
import './XTerm.css';
import {Command, ServerCommand} from './constants';
import {createTaskLogSocket, TaskConnectionState} from './TaskLogSocket';

interface TaskLogProps {
  task: Task;
  onUpdate: () => Promise<Task | undefined>;
  onComplete: (task: Task) => void;
}

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

    let disposed = false;
    let isHistory = false;
    let isOutputPaused = false;
    let outputGeneration = 0;

    const history: Uint8Array[] = [];
    const queue: Uint8Array[] = [];
    const deferredHistory: Uint8Array[] = [];
    const deferredQueue: Uint8Array[] = [];
    const drainResolvers: Array<() => void> = [];
    let running = false;

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

    function handleResize(cols: number, rows: number) {
      const wrapper = refCtr.current;
      if (!wrapper) return;
      if (!refTask.current.isPty || refTask.current.state !== TaskState.Started) return;
      const screenSize: PtyScreenSize = {
        x: wrapper.clientWidth,
        y: wrapper.clientHeight,
        cols,
        rows,
      };
      taskSocket.send(Command.Resize, screenSize);
    }

    const taskSocket = createTaskLogSocket({
      taskId: id,
      getTask: () => refTask.current,
      onUpdate: () => refOnUpdate.current(),
      onComplete: (latestTask) => refOnComplete.current(latestTask),
      onConnectionStateChange: setConnectionState,
      onData: writeData,
      onOpen: () => handleResize(terminal.cols, terminal.rows),
      onReconnectStart: cancelPendingReplay,
      onReconnectOpen: prepareReconnectOutput,
    });

    terminal.onData((data) => {
      if (isHistory || isOutputPaused) return;
      if (!refTask.current.isPty) {
        data = data.replace(/\r\n|\r/g, '\n');
      }
      taskSocket.send(Command.Input, data);
    });

    terminal.onResize(({cols, rows}) => {
      handleResize(cols, rows);
    });

    return {
      connect: taskSocket.connect,
      reconnect: taskSocket.reconnect,
      syncTaskState: taskSocket.syncTaskState,
      dispose: () => {
        disposed = true;
        cancelPendingReplay();
        taskSocket.dispose();
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
