import React, {FC} from 'react';
import {Typography, TypographyProps} from '@mui/material';

type SectionHeadingProps = Omit<TypographyProps, 'variant'>;

const SectionHeading: FC<SectionHeadingProps> = ({sx, ...props}) => (
  <Typography
    {...props}
    variant="subtitle2"
    sx={[{fontWeight: 600}, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
  />
);

export default SectionHeading;
