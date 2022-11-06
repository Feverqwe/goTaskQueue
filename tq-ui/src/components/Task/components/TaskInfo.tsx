import React, {FC, useCallback, useMemo} from "react";
import {Box, IconButton, Input, Menu, MenuItem, Paper, Typography} from "@mui/material";
import {Task, TaskState} from "../../types";
import {api} from "../../../tools/api";
import TaskStatusIcon from "../../TaskList/components/TaskStatus";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

interface TaskInfoProps {
  task: Task;
  onUpdate: () => void;
}

const TaskInfo: FC<TaskInfoProps> = ({task, onUpdate}) => {
  const {id, state, command, error} = task;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  useMemo(() => {
    document.title = `#${id} — TaskQueue`;
  }, [id]);

  const handleStart = useCallback(async () => {
    await api.taskRun({id});
    onUpdate();
  }, [id]);

  const handleStop = useCallback(async () => {
    await api.taskKill({id});
    onUpdate();
  }, [id]);

  const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSigint = useCallback(() => {
    api.taskSignal({id, signal: 'SIGINT'});
    handleCloseMenu();
  }, [id]);

  return (
    <Box p={1}>
      <Paper component="form">
        <Box display={'flex'} flexDirection={'row'} alignItems={'center'}>
          <Box pr={1}>
            <IconButton href={'/'}>
              <ChevronLeftIcon/>
            </IconButton>
          </Box>
          <Box flexGrow={1}>
            <Box display={'flex'} flexDirection={'row'}>
              <Input
                value={command}
                readOnly
                multiline
                fullWidth
                sx={{flex: 1}}
              />
            </Box>
            {error && (
              <Box>
                <Typography variant={'subtitle2'} color={'#ff8a80'}>
                  {error}
                </Typography>
              </Box>
            )}
          </Box>
          <Box pl={1} display={'flex'} alignItems={'center'}>
            {state === TaskState.Started && (
              <IconButton onClick={handleStop}>
                <StopIcon/>
              </IconButton>
            )}
            {state === TaskState.Idle && (
              <IconButton onClick={handleStart}>
                <PlayArrowIcon/>
              </IconButton>
            )}
            <IconButton onClick={handleOpenMenu}>
              <TaskStatusIcon task={task}/>
            </IconButton>
            <Menu open={Boolean(anchorEl)} onClose={handleCloseMenu} anchorEl={anchorEl}>
              <MenuItem onClick={handleSigint}>SIGINT</MenuItem>
              <MenuItem component={'a'} href={`/api/task/stdout?id=${id}`} target={'_blank'}>stdout.log</MenuItem>
              <MenuItem component={'a'} href={`/api/task/stderr?id=${id}`} target={'_blank'}>stderr.log</MenuItem>
              <MenuItem component={'a'} href={`/api/task/combined?id=${id}`} target={'_blank'}>combined.log</MenuItem>
            </Menu>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
};

export default TaskInfo;