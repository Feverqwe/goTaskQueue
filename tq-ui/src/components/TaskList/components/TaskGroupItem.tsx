import React, {FC, useCallback, useContext, useMemo} from 'react';
import {Box, Card, CardActionArea, Typography} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {Task, TaskGroup, TaskState} from '../../types';
import TaskStatusIcon from '../../Task/components/TaskStatusIcon';
import RenderTaskList from './RenderTaskList';
import {GroupStateCtx} from '../../GroupStorageProvider/GroupStateCtx';
import {GroupStateSetCtx} from '../../GroupStorageProvider/GroupStateSetCtx';

interface TaskGroupItemProps {
  group: TaskGroup,
  onUpdate: () => void;
}

const TaskGroupItem: FC<TaskGroupItemProps> = ({group, onUpdate}) => {
  const {name, taskList} = group;
  const groupState = useContext(GroupStateCtx);
  const setGroupState = useContext(GroupStateSetCtx);

  const open = useMemo(() => groupState[name] || false, [groupState, name]);

  const handleExpand = useCallback(() => {
    setGroupState(name, !groupState[name]);
  }, [setGroupState, groupState, name]);

  const status = useMemo(() => {
    const typeCount = new Map<TaskState, number>();
    const next = (task: TaskGroup | Task) => {
      if ('taskList' in task) {
        task.taskList.forEach(next);
      } else {
        const count = typeCount.get(task.state) || 0;
        typeCount.set(task.state, count + 1);
      }
    };
    taskList.forEach(next);

    return [TaskState.Idle, TaskState.Started, TaskState.Finished, TaskState.Canceled, TaskState.Error].map((state) => {
      const count = typeCount.get(state);
      if (!count) return null;
      return (
        <Box key={state} pr={1} display="flex" alignItems="center">
          <Typography variant="body1" pr={1}>
            {count}
          </Typography>
          <TaskStatusIcon task={{state}} />
        </Box>
      );
    });
  }, [taskList]);

  return (
    <>
      <Box px={1} pb={1}>
        <Card>
          <CardActionArea
            onClick={handleExpand}
            sx={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}
          >
            <Box p={1} display="flex" alignItems="center">
              {open ? (
                <ExpandLessIcon />
              ) : (
                <ExpandMoreIcon />
              )}
            </Box>
            <Box px={1} flexGrow={1} sx={{wordBreak: 'break-all'}}>
              <Typography variant="body1">
                {name}
              </Typography>
            </Box>
            {status}
          </CardActionArea>
        </Card>
      </Box>
      {open && (
        <RenderTaskList taskList={taskList} onUpdate={onUpdate} />
      )}
    </>
  );
};

export default TaskGroupItem;
