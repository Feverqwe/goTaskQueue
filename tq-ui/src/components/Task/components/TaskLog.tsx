import React, {FC, useEffect, useRef, useState} from "react";
import {Box} from "@mui/material";
import {Task, TaskState} from "../../types";
import {Terminal} from "xterm";
import {FitAddon} from 'xterm-addon-fit';
import {theme} from "./theme";
import throttle from "lodash.throttle";
import {api} from "../../../tools/api";

import "xterm/css/xterm.css";
import "./XTerm.css";

interface TaskLogProps {
  task: Task,
  onUpdate: () => void;
}

const TaskLog: FC<TaskLogProps> = ({task, onUpdate}) => {
  const {id, state} = task;
  const [isOpen, setOpen] = useState(false);
  const [isError, setError] = useState(false);
  const refWrapper = useRef<null | HTMLDivElement>(null);
  const [scope] = useState<{task: Task, terminal: Terminal, fitAddon: FitAddon}>(() => {
    const terminal = new Terminal({
      convertEol: true,
      fontSize: 14,
      theme,
    });

    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);

    return {
      terminal,
      task,
      fitAddon,
    };
  });
  scope.task = task;

  useEffect(() => {
    const wrapper = refWrapper.current;
    if (!wrapper) {
      throw new Error('Ctr is empty');
    }

    const {terminal, fitAddon} = scope;

    let command = '';
    terminal.onData((char) => {
      if (scope.task.state !== TaskState.Started) return;
      switch (char) {
        case '\r': {
          const eol ='\n';
          command += eol;
          terminal.write(eol);
          api.taskSend({id, data: command});
          command = ''
          break;
        }
        default: {
          command += char;
          terminal.write(char);
        }
      }
    });

    const onResize = () => {
      fitAddon.fit();
    };

    const onResizeThrottled = throttle(onResize, 100);

    requestAnimationFrame(onResize);

    window.addEventListener('resize', onResizeThrottled);

    terminal.open(wrapper);

    const onData = (data: Uint8Array) => {
      terminal.write(data);
    }

    const ws = new WebSocket(`ws://${location.host}/ws?id=${id}`);
    ws.onopen = () => {
      setOpen(true);
    };
    ws.onclose = () => {
      setOpen(false);
    };
    ws.onmessage = async (e: MessageEvent<Blob>) => {
      const buffer = await e.data.arrayBuffer();
      onData(new Uint8Array(buffer));
    };
    ws.onerror = () => {
      setError(true);
    };

    return () => {
      window.removeEventListener('resize', onResizeThrottled);
      ws.close();
      terminal.dispose();
    };
  }, []);

  useEffect(() => {
    return () => {
      isOpen && [TaskState.Idle, TaskState.Started].includes(state) && onUpdate();
    }
  }, [state, isOpen]);

  return (
    <Box px={1} pb={1} sx={{flexGrow: 1}}>
      <div style={{height: '100%', width: '100%'}} ref={refWrapper}/>
    </Box>
  );
};

export default TaskLog;