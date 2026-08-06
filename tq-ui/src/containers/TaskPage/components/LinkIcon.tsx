import React, {FC} from 'react';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import {SvgIconProps} from '@mui/material';
import {TaskLink} from '../../../components/types';

interface LinkIconProps extends SvgIconProps {
  type: TaskLink['type'];
}

const LinkIcon: FC<LinkIconProps> = ({type, ...iconProps}) => {
  switch (type) {
    case 'play': {
      return <PlayCircleOutlinedIcon {...iconProps} />;
    }
    default: {
      return <LaunchIcon {...iconProps} />;
    }
  }
};

export default LinkIcon;
