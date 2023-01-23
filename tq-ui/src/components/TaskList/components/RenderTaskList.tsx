import React, {FC} from 'react';
import {TaskListArr} from '../../types';
import TaskGroupItem from './TaskGroupItem';
import TaskItem from './TaskItem';

interface RenderTaskListProps {
  taskList: TaskListArr;
  onUpdate: () => void;
}

const RenderTaskList: FC<RenderTaskListProps> = ({taskList, onUpdate}) => {
  return (
    <>
      {taskList.map((task) => {
        if ('taskList' in task) {
          return (
            <TaskGroupItem key={task.name} group={task} onUpdate={onUpdate} />
          );
        }
        return (
          <TaskItem key={task.id} task={task} onUpdate={onUpdate} />
        );
      })}
    </>
  );
};

export default RenderTaskList;
