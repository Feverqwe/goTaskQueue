import React, {FC, useContext} from "react";
import {Box, Button} from "@mui/material";
import {RootStoreCtx} from "../../RootStore/RootStoreCtx";
import {Template} from "../../RootStore/RootStoreProvider";

interface TemplateListProps {
  onSelect: (template: Template) => void;
}

const TemplateList: FC<TemplateListProps> = ({onSelect}) => {
  const {templates} = useContext(RootStoreCtx);

  return (
    <Box display={'flex'} flexWrap={'wrap'} p={1} pt={0}>
      {templates.map((template, index) => {
        const {name} = template;
        return (
          <Button sx={{flexGrow: 1}} key={index} onClick={onSelect.bind(null, template)}>{name}</Button>
        )
      })}
    </Box>
  );
};

export default TemplateList;