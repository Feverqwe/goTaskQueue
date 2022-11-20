import React, {FC, Fragment, ReactNode, SyntheticEvent, useCallback} from 'react';
import {IconButton} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LaunchIcon from '@mui/icons-material/Launch';
import {Task} from '../../types';

interface TaskLinksProps {
  task: Task;
}

const TaskLinks: FC<TaskLinksProps> = ({task}) => {
  const handleClick = useCallback((e: SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      {task.links.map(({name, type, url, title}) => {
        let icon: ReactNode;
        switch (type) {
          case 'play': {
            icon = <PlayArrowIcon />;
            break;
          }
          default: {
            icon = <LaunchIcon />;
          }
        }
        return (
          <IconButton key={name} href={url} title={title} target="_blank" onClick={handleClick}>
            {icon}
          </IconButton>
        );
      })}
    </>
  );
};

export default TaskLinks;
