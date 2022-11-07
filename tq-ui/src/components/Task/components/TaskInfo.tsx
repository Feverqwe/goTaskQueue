import React, {FC, useCallback, useRef} from "react";
import {Task} from "../../types";
import {Box, Paper, TextField} from "@mui/material";

interface TaskInfoProps {
  task: Task;
}

const TaskInfo:FC<TaskInfoProps> = ({task}) => {
  const {command} = task;
  const refCommand = useRef<HTMLInputElement>(null);

  const handleCommandFocus = useCallback(() => {
    refCommand.current?.select();
  }, []);

  return (
    <Box p={1} pt={0}>
      <Paper component="form">
        <Box p={1}>
          <TextField
            variant={'standard'}
            value={command}
            label={'Command'}
            multiline
            fullWidth
            InputProps={{readOnly: true}}
            inputProps={{ref: refCommand}}
            onFocus={handleCommandFocus}
          />
        </Box>
      </Paper>
    </Box>
  );
}

export default TaskInfo;