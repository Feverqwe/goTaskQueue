import React, {FC, useEffect, useMemo, useState} from 'react';
import {Box, Tooltip, Typography} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {Task, TaskState} from '../../types';
import KeyValue from './KeyValue';

interface TaskOverviewProps {
  task: Task;
}

function isZeroDate(value: string) {
  return !value || new Date(value).getUTCFullYear() <= 1;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours ? `${hours}h` : '', minutes || hours ? `${minutes}m` : '', `${remainingSeconds}s`]
    .filter(Boolean)
    .join(' ');
}

function formatCompactDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const time = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  if (isToday) return time;

  const datePart = date.toLocaleDateString([], {
    day: '2-digit',
    month: '2-digit',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
  return `${datePart}, ${time}`;
}

const TaskOverview: FC<TaskOverviewProps> = ({task}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (task.state !== TaskState.Started) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [task.state]);

  const duration = useMemo(() => {
    if (isZeroDate(task.startedAt)) return '−';
    const startedAt = new Date(task.startedAt).getTime();
    const finishedAt = isZeroDate(task.finishedAt) ? now : new Date(task.finishedAt).getTime();
    return formatDuration(finishedAt - startedAt);
  }, [now, task.finishedAt, task.startedAt]);

  const timeline = useMemo(() => {
    const items = [{label: 'Created', value: task.createdAt, type: 'date'}];
    if (!isZeroDate(task.startedAt))
      items.push({label: 'Started', value: task.startedAt, type: 'date'});
    if (!isZeroDate(task.finishedAt)) {
      items.push({label: 'Finished', value: task.finishedAt, type: 'date'});
    }
    if (!isZeroDate(task.startedAt)) items.push({label: 'Duration', value: duration, type: 'text'});
    if (!isZeroDate(task.expiresAt))
      items.push({label: 'Expires', value: task.expiresAt, type: 'date'});
    return items;
  }, [duration, task.createdAt, task.expiresAt, task.finishedAt, task.startedAt]);

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.5}}>
      <Box>
        <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
          Timeline
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: {xs: 1.25, sm: 0.5},
            rowGap: 0.5,
          }}
        >
          {timeline.map((item, index) => (
            <React.Fragment key={item.label}>
              {index > 0 && (
                <ChevronRightIcon
                  sx={{display: {xs: 'none', sm: 'block'}, color: 'text.disabled', fontSize: 16}}
                />
              )}
              <Tooltip
                title={
                  item.type === 'date'
                    ? `${item.label}: ${new Date(item.value).toLocaleString()}`
                    : item.label
                }
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: 0.5,
                    flex: {xs: '1 1 calc(50% - 8px)', sm: '0 0 auto'},
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" sx={{fontWeight: 500}}>
                    {item.type === 'date' ? formatCompactDate(item.value) : item.value}
                  </Typography>
                </Box>
              </Tooltip>
            </React.Fragment>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{mb: 1, fontWeight: 600}}>
          Execution
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))'},
            columnGap: {xs: 2, sm: 3},
            rowGap: 1.5,
          }}
        >
          <KeyValue name="Group" value={task.group || '−'} />
          <KeyValue name="Template" value={task.templatePlace || '−'} />
          <KeyValue name="Pseudo-terminal" value={task.isPty ? 'Yes' : 'No'} />
          <KeyValue name="Combined output only" value={task.isOnlyCombined ? 'Yes' : 'No'} />
          <KeyValue name="Write logs" value={task.isWriteLogs ? 'Yes' : 'No'} />
          <KeyValue name="Single instance" value={task.isSingleInstance ? 'Yes' : 'No'} />
          <KeyValue name="Start on boot" value={task.isStartOnBoot ? 'Yes' : 'No'} />
          <KeyValue name="TTL after finish" value={task.ttl ? `${task.ttl}s` : 'Disabled'} />
        </Box>
      </Box>
    </Box>
  );
};

export default TaskOverview;
