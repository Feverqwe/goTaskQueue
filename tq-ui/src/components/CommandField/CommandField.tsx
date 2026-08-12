import React, {FC, useEffect, useId, useMemo, useRef} from 'react';
import {editor} from 'monaco-editor';
import {Box, FormHelperText} from '@mui/material';

globalThis.MonacoEnvironment = {
  ...globalThis.MonacoEnvironment,
  getWorker: (_workerId, label) =>
    new Worker(new URL('./editor.worker.ts', import.meta.url), {
      name: label,
      type: 'module',
    }),
};

const editorTheme = 'gotaskqueue-graphite-relay';
const EDITOR_PADDING_TOP = 8;

editor.defineTheme(editorTheme, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    {token: 'comment', foreground: '8E96A0', fontStyle: 'italic'},
    {token: 'keyword', foreground: 'D5DAE0'},
    {token: 'string', foreground: '75C997'},
    {token: 'number', foreground: 'D6B46C'},
  ],
  colors: {
    'editor.background': '#181B20',
    'editor.foreground': '#F2F4F7',
    'editorCursor.foreground': '#D5DAE0',
    'editor.selectionBackground': '#49515CAA',
    'editor.inactiveSelectionBackground': '#30353DBB',
    'editor.lineHighlightBackground': '#20242A',
    'editor.lineHighlightBorder': '#00000000',
    'editorLineNumber.foreground': '#7A838E',
    'editorLineNumber.activeForeground': '#D5DAE0',
    'editorIndentGuide.background1': '#30353D',
    'editorIndentGuide.activeBackground1': '#49515C',
    'editorWidget.background': '#30353D',
    'editorWidget.border': '#49515C',
    'editorSuggestWidget.background': '#30353D',
    'editorSuggestWidget.border': '#49515C',
    'input.background': '#252930',
    focusBorder: '#69717C',
  },
});

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
      theme: editorTheme,
      minimap: {
        enabled: false,
      },
      wordWrap: 'on',
      fontSize: 14,
      padding: {
        top: EDITOR_PADDING_TOP,
      },
      readOnly,
    });

    function setCtrHeight(ctrNode: HTMLDivElement) {
      const lineHeight = instance.getOptions().get(editor.EditorOption.lineHeight);
      const lineCount = instance.getModel()?.getLineCount() ?? 0;
      ctrNode.style.height = `${
        Math.min(Math.max(lineCount, 16), 16) * lineHeight + EDITOR_PADDING_TOP
      }px`;
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
