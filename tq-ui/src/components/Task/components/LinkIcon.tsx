import React, {FC} from 'react';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import {SvgIconProps} from '@mui/material/SvgIcon/SvgIcon';
import {TaskLink} from '../../types';

interface LinkIconProps extends SvgIconProps {
  type: TaskLink['type'];
}

const LinkIcon: FC<LinkIconProps> = ({type, ...iconProps}) => {
  switch (type) {
    case 'play': {
      return <PlayCircleOutlineIcon {...iconProps} />;
    }
    default: {
      return <LaunchIcon {...iconProps} />;
    }
  }
};

export default LinkIcon;
