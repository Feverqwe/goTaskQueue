import React, {FC} from 'react';
import {TaskOrGroup} from '../../../components/types';
import TaskGroupItem from './TaskGroupItem';
import TaskItem from './TaskItem';

interface TaskListViewProps {
  taskList: TaskOrGroup[];
  onUpdate: () => void;
}

const TaskListView: FC<TaskListViewProps> = ({taskList, onUpdate}) => {
  return (
    <>
      {taskList.map((task) => {
        if ('taskList' in task) {
          return <TaskGroupItem key={task.name} group={task} onUpdate={onUpdate} />;
        }
        return <TaskItem key={task.id} task={task} onUpdate={onUpdate} />;
      })}
    </>
  );
};

export default TaskListView;
