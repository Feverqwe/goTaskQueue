import React, {FC, useEffect, useMemo, useRef} from 'react';
import {editor} from 'monaco-editor';
import {Box, InputLabel} from '@mui/material';

const CTR_STYLE = {
  width: '100%',
};

export interface CommandFieldRef {
  getValue(): string;
}

interface CommandFieldProps {
  defaultValue?: string;
  ref: React.RefObject<CommandFieldRef>;
  readOnly?: boolean;
}

const CommandField: FC<CommandFieldProps> = ({defaultValue, ref, readOnly}) => {
  const refDefaultValue = useRef(defaultValue);
  const refCtr = useRef<HTMLDivElement>(null);
  const refEditor = useRef<editor.IStandaloneCodeEditor | null>(null);

  ref.current = useMemo(
    () => ({
      getValue(): string {
        return refEditor.current?.getValue() ?? '';
      },
    }),
    [],
  );

  useEffect(() => {
    const ctrNode = refCtr.current;
    if (!ctrNode) return;

    const instance = editor.create(ctrNode, {
      value: refDefaultValue.current,
      language: 'shell',
      automaticLayout: true,
      theme: 'vs-dark',
      minimap: {
        enabled: false,
      },
      wordWrap: 'on',
      fontSize: 14,
      readOnly,
    });

    function setCtrHeight(ctrNode: HTMLDivElement) {
      const lineHeight = instance.getOptions().get(editor.EditorOption.lineHeight);
      const lineCount = instance.getModel()?.getLineCount() ?? 0;
      ctrNode.style.height = `${Math.max(lineCount, 3) * lineHeight}px`;
    }

    instance.onDidContentSizeChange(({contentHeightChanged}) => {
      if (contentHeightChanged) {
        setCtrHeight(ctrNode);
      }
    });

    setCtrHeight(ctrNode);

    refEditor.current = instance;

    return () => {
      instance.dispose();
      refEditor.current = null;
    };
  }, [readOnly, refDefaultValue]);

  return (
    <Box sx={{my: 1}}>
      <InputLabel>Command:</InputLabel>
      <div ref={refCtr} style={CTR_STYLE} />
    </Box>
  );
};

export default CommandField;
