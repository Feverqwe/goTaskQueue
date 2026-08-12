import {PtyScreenSize, Task, TaskState} from '../../../components/types';
import {Command, ServerCommand} from './constants';

export type TaskConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'closed';

interface TaskLogSocketHandlers {
  onConnectionStateChange: (state: TaskConnectionState) => void;
  onData: (type: ServerCommand, data: Uint8Array) => void;
  onOpen: () => void;
  onReconnectStart: () => void;
  onReconnectOpen: () => void;
}

interface TaskLogSocketOptions extends TaskLogSocketHandlers {
  taskId: string;
  getTask: () => Task;
  onUpdate: () => Promise<Task | undefined>;
  onComplete: (task: Task) => void;
}

export interface TaskLogSocket {
  connect: () => void;
  reconnect: () => void;
  syncTaskState: (state: TaskState) => void;
  send: (type: Command, data?: string | PtyScreenSize) => void;
  dispose: () => void;
}

const completeStates = [TaskState.Finished, TaskState.Error, TaskState.Canceled];
const shouldReconnect = (state: TaskState) => !completeStates.includes(state);

export const createTaskLogSocket = ({
  taskId,
  getTask,
  onUpdate,
  onComplete,
  onConnectionStateChange,
  onData,
  onOpen,
  onReconnectStart,
  onReconnectOpen,
}: TaskLogSocketOptions): TaskLogSocket => {
  let socket: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let connectionTimer: ReturnType<typeof setTimeout> | undefined;
  let pingTimer: ReturnType<typeof setInterval> | undefined;
  let retryCount = 0;
  let disposed = false;
  let connectionState: TaskConnectionState = 'connecting';
  let notifiedCompletion = completeStates.includes(getTask().state)
    ? `${getTask().state}:${getTask().finishedAt}`
    : undefined;

  const updateConnectionState = (nextState: TaskConnectionState) => {
    connectionState = nextState;
    onConnectionStateChange(nextState);
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer === undefined) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  };

  const clearPingTimer = () => {
    if (pingTimer === undefined) return;
    clearInterval(pingTimer);
    pingTimer = undefined;
  };

  const clearConnectionTimer = () => {
    if (connectionTimer === undefined) return;
    clearTimeout(connectionTimer);
    connectionTimer = undefined;
  };

  const detachSocket = () => {
    if (!socket) return;
    const previousSocket = socket;
    socket = undefined;
    clearConnectionTimer();
    previousSocket.onopen = null;
    previousSocket.onclose = null;
    previousSocket.onerror = null;
    previousSocket.onmessage = null;
    previousSocket.close();
  };

  const notifyIfComplete = (latestTask: Task) => {
    if (!completeStates.includes(latestTask.state)) return;
    const completion = `${latestTask.state}:${latestTask.finishedAt}`;
    if (completion === notifiedCompletion) return;
    notifiedCompletion = completion;
    onComplete(latestTask);
  };

  const send = (type: Command, data: string | PtyScreenSize = '') => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    let payload = '';
    switch (type) {
      case Command.Ping:
        payload = type;
        break;
      case Command.Input:
        payload = `${type}${data}`;
        break;
      case Command.Resize:
        payload = `${type}${JSON.stringify(data)}`;
        break;
    }
    try {
      socket.send(payload);
    } catch {
      socket.close();
    }
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer !== undefined) return;
    retryCount += 1;
    updateConnectionState(shouldReconnect(getTask().state) ? 'reconnecting' : 'connecting');
    const delay = Math.min(1000 * 2 ** (retryCount - 1), 10 * 1000);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect(true);
    }, delay);
  };

  const handleClose = async (
    closedSocket: WebSocket,
    didOpen: boolean,
    receivedFinished: boolean,
    receivedProtocolError: boolean,
    wasClean: boolean,
  ) => {
    clearPingTimer();

    if (receivedFinished) {
      updateConnectionState('closed');
      try {
        const latestTask = await onUpdate();
        if (latestTask) notifyIfComplete(latestTask);
      } catch {
        // The page displays the refresh error when the final task state cannot be loaded.
      }
      return;
    }

    let latestTask = getTask();
    try {
      latestTask = (await onUpdate()) ?? latestTask;
      notifyIfComplete(latestTask);
    } catch {
      // The page displays the refresh error while the log keeps retrying independently.
    }

    if (disposed || closedSocket !== socket) return;
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
      onReconnectStart();
      updateConnectionState(shouldReconnect(getTask().state) ? 'reconnecting' : 'connecting');
    } else {
      updateConnectionState('connecting');
    }

    let nextSocket: WebSocket;
    try {
      nextSocket = new WebSocket(
        `${location.protocol === 'http:' ? 'ws' : 'wss'}://${location.host}/ws?id=${encodeURIComponent(taskId)}`,
      );
    } catch {
      scheduleReconnect();
      return;
    }

    socket = nextSocket;
    nextSocket.binaryType = 'arraybuffer';
    let didOpen = false;
    let receivedFinished = false;
    let receivedProtocolError = false;

    nextSocket.onopen = () => {
      if (disposed || nextSocket !== socket) return;
      clearConnectionTimer();
      didOpen = true;
      retryCount = 0;
      if (isReconnect) {
        onReconnectOpen();
        onUpdate().catch(() => {});
      }
      updateConnectionState('connected');
      onOpen();
      pingTimer = setInterval(() => send(Command.Ping), 30 * 1000);
    };
    nextSocket.onclose = (event) => {
      if (disposed || nextSocket !== socket) return;
      clearConnectionTimer();
      handleClose(
        nextSocket,
        didOpen,
        receivedFinished,
        receivedProtocolError,
        event.wasClean,
      ).catch(() => {});
    };
    nextSocket.onerror = () => {
      if (nextSocket === socket) nextSocket.close();
    };
    nextSocket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (disposed || nextSocket !== socket) return;
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
      onData(dataType, bytes.slice(1));
    };
    connectionTimer = setTimeout(() => {
      if (nextSocket === socket && nextSocket.readyState === WebSocket.CONNECTING) {
        nextSocket.close();
      }
    }, 10 * 1000);
  }

  return {
    connect,
    reconnect: () => {
      retryCount = Math.max(retryCount, 1);
      connect(true);
    },
    syncTaskState: (taskState) => {
      if (shouldReconnect(taskState)) {
        if (connectionState === 'closed') scheduleReconnect();
      } else if (connectionState === 'reconnecting') {
        // A finished task has a finite log. Retrying its history load is not a lost live stream.
        updateConnectionState('connecting');
      }
    },
    send,
    dispose: () => {
      disposed = true;
      clearReconnectTimer();
      clearConnectionTimer();
      clearPingTimer();
      detachSocket();
    },
  };
};
