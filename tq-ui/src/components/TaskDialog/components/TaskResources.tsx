import React, {FC, useCallback, useMemo, useState} from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import {Task} from '../../types';
import {api} from '../../../tools/api';
import ActionButton from '../../ActionButton/ActionButton';
import IconActionButton from '../../IconActionButton/IconActionButton';
import LinkIcon from '../../../containers/TaskPage/components/LinkIcon';
import CopyButton from './CopyButton';

interface TaskResourcesProps {
  task: Task;
  onUpdate: () => Promise<void>;
}

function getAssetName(path: string) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || path;
}

const TaskResources: FC<TaskResourcesProps> = ({task, onUpdate}) => {
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState('link');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [assetPath, setAssetPath] = useState('');
  const assets = useMemo(() => task.assets ?? [], [task.assets]);

  const handleAddLink = useCallback(async () => {
    const url = linkUrl.trim();
    if (!url) return;
    await api.addTaskLink({
      id: task.id,
      name: `manual-${Date.now().toString(36)}`,
      type: linkType,
      url,
      title: linkTitle.trim() || url,
    });
    setLinkTitle('');
    setLinkUrl('');
    setLinkType('link');
    setShowAddLink(false);
    await onUpdate();
  }, [linkTitle, linkType, linkUrl, onUpdate, task.id]);

  const handleDeleteLink = useCallback(
    async (name: string) => {
      await api.delTaskLink({id: task.id, name});
      await onUpdate();
    },
    [onUpdate, task.id],
  );

  const handleAddAsset = useCallback(async () => {
    const path = assetPath.trim();
    if (!path) return;
    await api.addTaskAsset({id: task.id, path});
    setAssetPath('');
    setShowAddAsset(false);
    await onUpdate();
  }, [assetPath, onUpdate, task.id]);

  const handleDeleteAsset = useCallback(
    async (path: string) => {
      await api.delTaskAsset({id: task.id, path});
      await onUpdate();
    },
    [onUpdate, task.id],
  );

  return (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
      <Box>
        <Box sx={{display: 'flex', alignItems: 'center', mb: 1}}>
          <Typography variant="subtitle2" sx={{flexGrow: 1, fontWeight: 600}}>
            Links ({task.links.length})
          </Typography>
          <Button
            size="small"
            startIcon={showAddLink ? <CloseIcon /> : <AddIcon />}
            onClick={() => setShowAddLink((value) => !value)}
          >
            {showAddLink ? 'Cancel' : 'Add link'}
          </Button>
        </Box>

        {showAddLink && (
          <Paper variant="outlined" sx={{p: 1.5, mb: 1.5}}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 2fr) 120px'},
                gap: 1,
              }}
            >
              <TextField
                size="small"
                label="Title"
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
              />
              <TextField
                size="small"
                label="URL"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
              />
              <TextField
                select
                size="small"
                label="Type"
                value={linkType}
                onChange={(event) => setLinkType(event.target.value)}
              >
                <MenuItem value="link">Link</MenuItem>
                <MenuItem value="play">Media</MenuItem>
              </TextField>
            </Box>
            <Box sx={{display: 'flex', justifyContent: 'flex-end', mt: 1}}>
              <ActionButton
                variant="contained"
                size="small"
                disabled={!linkUrl.trim()}
                onSubmit={handleAddLink}
              >
                Add
              </ActionButton>
            </Box>
          </Paper>
        )}

        {task.links.length ? (
          <Paper variant="outlined">
            <List disablePadding>
              {task.links.map((link, index) => (
                <React.Fragment key={link.name}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem
                    secondaryAction={
                      <Box sx={{display: 'flex'}}>
                        <CopyButton value={link.url} label="Copy URL" />
                        <IconButton
                          size="small"
                          component="a"
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open link"
                        >
                          <LaunchIcon fontSize="inherit" />
                        </IconButton>
                        <IconActionButton
                          size="small"
                          aria-label="Remove link"
                          onSubmit={() => handleDeleteLink(link.name)}
                        >
                          <DeleteOutlineIcon fontSize="inherit" />
                        </IconActionButton>
                      </Box>
                    }
                  >
                    <ListItemIcon sx={{minWidth: 36}}>
                      <LinkIcon type={link.type} fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={link.title || link.url}
                      secondary={link.url}
                      slotProps={{
                        primary: {noWrap: true},
                        secondary: {
                          noWrap: true,
                          sx: {fontFamily: 'monospace', fontSize: '0.75rem'},
                        },
                      }}
                      sx={{pr: 12}}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No links were registered by this task.
          </Typography>
        )}
      </Box>

      <Box>
        <Box sx={{display: 'flex', alignItems: 'center', mb: 1}}>
          <Typography variant="subtitle2" sx={{flexGrow: 1, fontWeight: 600}}>
            Files and folders ({assets.length})
          </Typography>
          <Button
            size="small"
            startIcon={showAddAsset ? <CloseIcon /> : <AddIcon />}
            onClick={() => setShowAddAsset((value) => !value)}
          >
            {showAddAsset ? 'Cancel' : 'Add path'}
          </Button>
        </Box>

        {showAddAsset && (
          <Paper variant="outlined" sx={{p: 1.5, mb: 1.5}}>
            <Box sx={{display: 'flex', gap: 1, alignItems: 'flex-start'}}>
              <TextField
                fullWidth
                size="small"
                label="Local file or folder path"
                value={assetPath}
                onChange={(event) => setAssetPath(event.target.value)}
              />
              <ActionButton
                variant="contained"
                size="small"
                disabled={!assetPath.trim()}
                onSubmit={handleAddAsset}
              >
                Add
              </ActionButton>
            </Box>
          </Paper>
        )}

        {assets.length ? (
          <Paper variant="outlined">
            <List disablePadding>
              {assets.map((asset, index) => (
                <React.Fragment key={asset.path}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem
                    secondaryAction={
                      <Box sx={{display: 'flex'}}>
                        <CopyButton value={asset.path} label="Copy path" />
                        <IconActionButton
                          size="small"
                          aria-label="Remove path"
                          onSubmit={() => handleDeleteAsset(asset.path)}
                        >
                          <DeleteOutlineIcon fontSize="inherit" />
                        </IconActionButton>
                      </Box>
                    }
                  >
                    <ListItemIcon sx={{minWidth: 36}}>
                      {asset.isDir ? (
                        <FolderOutlinedIcon fontSize="small" />
                      ) : (
                        <InsertDriveFileOutlinedIcon fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={getAssetName(asset.path)}
                      secondary={asset.path}
                      slotProps={{
                        primary: {noWrap: true},
                        secondary: {
                          noWrap: true,
                          sx: {fontFamily: 'monospace', fontSize: '0.75rem'},
                        },
                      }}
                      sx={{pr: 8}}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No files or folders were registered by this task.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TaskResources;
