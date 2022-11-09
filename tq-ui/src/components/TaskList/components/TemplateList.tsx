import React, {FC, useContext} from 'react';
import {Box, Button} from '@mui/material';
import {RootStoreCtx} from '../../RootStore/RootStoreCtx';
import {Template} from '../../RootStore/RootStoreProvider';

interface TemplateListProps {
  onSelect: (template: Template) => void;
}

const TemplateList: FC<TemplateListProps> = ({onSelect}) => {
  const {templates} = useContext(RootStoreCtx);

  return (
    <Box>
      {templates.map((template, index) => {
        const {name} = template;
        return (
          <Button sx={{m: 1, mt: 0}} variant="outlined" key={index} onClick={onSelect.bind(null, template)}>{name}</Button>
        );
      })}
    </Box>
  );
};

export default TemplateList;
