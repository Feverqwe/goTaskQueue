import React, {FC, useCallback, useMemo, useState} from "react";
import {Box, CardActionArea, Divider, IconButton, Input, Menu, MenuItem, Paper, Typography} from "@mui/material";
import {Task, TaskState} from "../../types";
import {api} from "../../../tools/api";
import TaskStatusIcon from "./TaskStatus";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TaskName from "./TaskName";
import {Check} from "@mui/icons-material";

interface TaskInfoProps {
  task: Task;
  remapNewLine: boolean;
  onToggleFixNewLine: () => void;
  onUpdate: () => void;
}

const TaskHeader: FC<TaskInfoProps> = ({task, remapNewLine, onToggleFixNewLine, onUpdate}) => {
  const {id, state, command, error} = task;
  const [isExpanded, setExpended] = useState(false);
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

  const handleRestart = useCallback(async () => {
    const task = await api.clone({id});
    await api.taskRun({id: task.id});
    location.href = '/task.html?id=' + task.id;
  }, [id]);

  const handleTitleClick = useCallback(() => {
    setExpended(v => !v);
  }, []);

  return (
    <Box p={1}>
      <Paper component="form">
        <Box display={'flex'} flexDirection={'row'} alignItems={'stretch'}>
          <Box display={'flex'} alignItems={'center'}>
            <IconButton href={'/'}>
              <ChevronLeftIcon/>
            </IconButton>
          </Box>
          <Box flexGrow={1}>
            <CardActionArea onClick={handleTitleClick} sx={{height: '100%'}}>
              <Box display={'flex'} px={1} flexDirection={'row'} sx={{wordBreak: "break-all"}}>
                <TaskName task={task}/>
              </Box>
              {error && (
                <Box px={1}>
                  <Typography variant={'subtitle2'} color={'#ff8a80'}>
                    {error}
                  </Typography>
                </Box>
              )}
            </CardActionArea>
          </Box>
          <Box display={'flex'} alignItems={'center'}>
            {state === TaskState.Started && (
              <IconButton onClick={handleStop}>
                <StopIcon/>
              </IconButton>
            ) || state === TaskState.Idle && (
              <IconButton onClick={handleStart}>
                <PlayArrowIcon/>
              </IconButton>
            ) || (
              <IconButton onClick={handleRestart}>
                <RestartAltIcon/>
              </IconButton>
            )}
            <IconButton onClick={handleOpenMenu}>
              <TaskStatusIcon task={task}/>
            </IconButton>
            <Menu open={Boolean(anchorEl)} onClose={handleCloseMenu} anchorEl={anchorEl}>
              <MenuItem onClick={onToggleFixNewLine}>
                Remap new line
                {remapNewLine && (
                  <Box display={'flex'} alignItems={'center'} pl={1}>
                    <Check fontSize={'small'}/>
                  </Box>
                )}
              </MenuItem>
              {state === TaskState.Started && (
                <MenuItem onClick={handleSigint}>SIGINT</MenuItem>
              )}
              <Divider/>
              <MenuItem component={'a'} href={`/api/task/stdout?id=${id}`} target={'_blank'}>stdout.log</MenuItem>
              <MenuItem component={'a'} href={`/api/task/stderr?id=${id}`} target={'_blank'}>stderr.log</MenuItem>
              <MenuItem component={'a'} href={`/api/task/combined?id=${id}`} target={'_blank'}>combined.log</MenuItem>
            </Menu>
          </Box>
        </Box>
        {isExpanded && (
          <Box p={1}>
            <Input
              value={command}
              readOnly
              multiline
              fullWidth
              sx={{flex: 1}}
            />
          </Box>
        )}
      </Paper>
    </Box>
  )
};

export default TaskHeader;