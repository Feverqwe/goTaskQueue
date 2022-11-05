import React, {FC, FormEvent, useCallback, useRef} from "react";
import {Box, IconButton, Input, Paper} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {api} from "../../../tools/api";

interface TaskInputProps {
  onUpdate: () => void;
}

const TaskInput: FC<TaskInputProps> = ({onUpdate}) => {
  const refInput = useRef<HTMLInputElement>();

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const input = refInput.current;
    if (!input) return;

    const value = input.value;
    if (!value) return;

    try {
      await api.add({
        command: value,
      });
      onUpdate();
      input.value = '';
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <Box p={1}>
      <Paper>
        <form onSubmit={handleSubmit}>
          <Box display={'flex'} flexDirection={'row'} p={1} alignItems={'center'}>
            <Input placeholder="echo hi" inputProps={{ref: refInput}} fullWidth autoFocus/>
            <IconButton type="submit">
              <PlayArrowIcon/>
            </IconButton>
          </Box>
        </form>
      </Paper>
    </Box>
  )
};

export default TaskInput;