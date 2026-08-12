import React, {FC, useCallback, useState} from 'react';
import {Chip, IconButton, Tooltip} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';

interface CopyButtonProps {
  disabled?: boolean;
  displayLabel?: string;
  value: string;
  label?: string;
  size?: 'small' | 'medium' | 'large';
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back for non-secure HTTP origins and browsers denying Clipboard API access.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const isCopied = document.execCommand('copy');
  textarea.remove();
  if (!isCopied) throw new Error('Unable to copy to clipboard');
}

const CopyButton: FC<CopyButtonProps> = ({
  disabled = false,
  displayLabel,
  value,
  label = 'Copy',
  size = 'small',
}) => {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleCopy = useCallback(async () => {
    try {
      await copyText(value);
      setState('copied');
    } catch {
      setState('error');
    }
    window.setTimeout(() => setState('idle'), 1500);
  }, [value]);

  const icon =
    state === 'copied' ? (
      <CheckIcon color="success" fontSize="inherit" />
    ) : state === 'error' ? (
      <ErrorOutlineIcon color="error" fontSize="inherit" />
    ) : (
      <ContentCopyIcon fontSize="inherit" />
    );

  return (
    <Tooltip title={state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed' : label}>
      <span style={{display: 'inline-flex'}}>
        {displayLabel ? (
          <Chip
            variant="outlined"
            size={size === 'small' ? 'small' : 'medium'}
            icon={icon}
            label={displayLabel}
            onClick={handleCopy}
            aria-label={label}
            disabled={disabled}
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.6875rem',
              '& .MuiChip-icon': {ml: 0.75, mr: -0.125},
              '& .MuiChip-label': {px: 0.75},
            }}
          />
        ) : (
          <IconButton size={size} onClick={handleCopy} aria-label={label} disabled={disabled}>
            {icon}
          </IconButton>
        )}
      </span>
    </Tooltip>
  );
};

export default CopyButton;
