import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {Alert, Box, IconButton, Snackbar, Stack, Typography, alpha} from '@mui/material';
import React, {FC} from 'react';
import {ToastSeverity} from './NotificationCtx';

export interface ToastItem {
  id: string;
  severity: ToastSeverity;
  label?: string;
  title: string;
  message?: string;
  autoHideDuration: number | null;
}

interface NotificationStackProps {
  notifications: ToastItem[];
  onClose: (id: string) => void;
}

const statusColors: Record<ToastSeverity, string> = {
  success: '#63C48D',
  warning: '#E0AA55',
  error: '#F07178',
  info: '#69A7E3',
};

const NotificationStack: FC<NotificationStackProps> = ({notifications, onClose}) => {
  if (notifications.length === 0) return null;

  return (
    <Stack
      aria-label="Notifications"
      spacing={1}
      sx={(theme) => ({
        position: 'fixed',
        zIndex: theme.zIndex.snackbar,
        right: {xs: '12px', sm: '16px'},
        top: {xs: '12px', sm: '16px'},
        left: {xs: '12px', sm: 'auto'},
        width: {sm: 400},
        maxWidth: {sm: 'calc(100vw - 32px)'},
        pointerEvents: 'none',
      })}
    >
      {notifications.map((notification) => {
        const color = statusColors[notification.severity];

        return (
          <Snackbar
            key={notification.id}
            open={true}
            autoHideDuration={notification.autoHideDuration}
            onClose={(_event, reason) => {
              if (reason !== 'clickaway') onClose(notification.id);
            }}
            sx={{
              position: 'relative',
              inset: 'auto !important',
              transform: 'none',
              width: '100%',
              maxWidth: 'none',
              pointerEvents: 'auto',
            }}
          >
            <Alert
              severity={notification.severity}
              variant="standard"
              action={
                <IconButton
                  aria-label="Dismiss notification"
                  color="inherit"
                  size="small"
                  onClick={() => onClose(notification.id)}
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              }
              sx={{
                width: '100%',
                alignItems: 'flex-start',
                overflow: 'hidden',
                border: `1px solid ${alpha(color, 0.34)}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 1.5,
                backgroundColor: 'rgba(37, 39, 43, 0.97)',
                backgroundImage: `linear-gradient(110deg, ${alpha(color, 0.1)}, transparent 42%)`,
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.34)',
                color: '#DFE1E5',
                backdropFilter: 'blur(10px)',
                '& .MuiAlert-icon': {
                  color,
                  marginTop: 0.25,
                },
                '& .MuiAlert-message': {
                  minWidth: 0,
                  flexGrow: 1,
                  paddingBlock: 0.25,
                },
                '& .MuiAlert-action': {
                  marginRight: -0.5,
                  paddingTop: 0,
                },
              }}
            >
              {notification.label && (
                <Typography
                  component="div"
                  sx={{
                    mb: 0.25,
                    color,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    lineHeight: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {notification.label}
                </Typography>
              )}
              <Typography
                component="div"
                title={notification.title}
                sx={{
                  display: '-webkit-box',
                  overflow: 'hidden',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.35,
                  overflowWrap: 'anywhere',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                }}
              >
                {notification.title}
              </Typography>
              {notification.message && (
                <Box
                  sx={{
                    mt: 0.75,
                    pt: 0.75,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Typography
                    component="div"
                    title={notification.message}
                    sx={{
                      display: '-webkit-box',
                      overflow: 'hidden',
                      color: 'text.secondary',
                      fontSize: 12,
                      lineHeight: 1.4,
                      overflowWrap: 'anywhere',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                    }}
                  >
                    {notification.message}
                  </Typography>
                </Box>
              )}
            </Alert>
          </Snackbar>
        );
      })}
    </Stack>
  );
};

export default NotificationStack;
