import React, {FC, useEffect, useId, useMemo, useRef} from 'react';
import {editor} from 'monaco-editor';
import {Box, FormHelperText} from '@mui/material';

const CTR_STYLE = {
  width: '100%',
};

export interface CommandFieldRef {
  getValue(): string;
}

export interface CommandFieldProps {
  defaultValue?: string;
  validationError?: string;
  ref?: React.RefObject<CommandFieldRef>;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

const CommandField: FC<CommandFieldProps> = ({
  defaultValue,
  validationError,
  ref,
  readOnly,
  onChange,
}) => {
  const refDefaultValue = useRef(defaultValue);
  const refOnChange = useRef(onChange);
  const refCtr = useRef<HTMLDivElement>(null);
  const refEditor = useRef<editor.IStandaloneCodeEditor | null>(null);
  const errorId = useId();

  refOnChange.current = onChange;

  const commandField = useMemo(
    () => ({
      getValue(): string {
        return refEditor.current?.getValue() ?? '';
      },
    }),
    [],
  );
  if (ref) {
    ref.current = commandField;
  }

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
      ctrNode.style.height = `${Math.min(Math.max(lineCount, 16), 16) * lineHeight}px`;
    }

    instance.onDidContentSizeChange(({contentHeightChanged}) => {
      if (contentHeightChanged) {
        setCtrHeight(ctrNode);
      }
    });
    instance.onDidChangeModelContent(() => {
      refOnChange.current?.(instance.getValue());
    });

    setCtrHeight(ctrNode);

    refEditor.current = instance;

    return () => {
      instance.dispose();
      refEditor.current = null;
    };
  }, [readOnly, refDefaultValue]);

  return (
    <Box>
      <div
        ref={refCtr}
        style={CTR_STYLE}
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? errorId : undefined}
      />
      {validationError && (
        <FormHelperText id={errorId} error>
          {validationError}
        </FormHelperText>
      )}
    </Box>
  );
};

export default CommandField;
