import React, {FC} from 'react';
import {Task} from '../../types';
import LinkIcon from './LinkIcon';
import DialogMenuItem from '../../DialogMenu/DialogMenuItem';

interface TaskLinksProps {
  task: Task;
}

const TaskLinks: FC<TaskLinksProps> = ({task}) => {
  return (
    <>
      {task.links.map(({name, type, url, title}) => {
        return (
          <DialogMenuItem key={name} component="a" href={url} target="_blank">
            <LinkIcon type={type} sx={{ml: -1, mr: 1}} />{title}
          </DialogMenuItem>
        );
      })}
    </>
  );
};

export default TaskLinks;
