import React, {FC, useEffect, useId, useMemo, useRef} from 'react';
import {editor} from 'monaco-editor';
import {Box, FormHelperText} from '@mui/material';
import {themeColors} from '../../tools/themeTokens';

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
    {token: 'comment', foreground: themeColors.primaryDark.slice(1), fontStyle: 'italic'},
    {token: 'keyword', foreground: themeColors.primary.slice(1)},
    {token: 'string', foreground: themeColors.success.slice(1)},
    {token: 'number', foreground: themeColors.warning.slice(1)},
  ],
  colors: {
    'editor.background': themeColors.canvas,
    'editor.foreground': themeColors.text,
    'editorCursor.foreground': themeColors.primary,
    'editor.selectionBackground': `${themeColors.line}AA`,
    'editor.inactiveSelectionBackground': `${themeColors.raised}BB`,
    'editor.lineHighlightBackground': '#20242A',
    'editor.lineHighlightBorder': '#00000000',
    'editorLineNumber.foreground': '#7A838E',
    'editorLineNumber.activeForeground': themeColors.primary,
    'editorIndentGuide.background1': themeColors.raised,
    'editorIndentGuide.activeBackground1': themeColors.line,
    'editorWidget.background': themeColors.raised,
    'editorWidget.border': themeColors.line,
    'editorSuggestWidget.background': themeColors.raised,
    'editorSuggestWidget.border': themeColors.line,
    'input.background': themeColors.panel,
    focusBorder: themeColors.secondaryDark,
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
