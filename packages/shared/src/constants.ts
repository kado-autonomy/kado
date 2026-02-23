export const IPC_CHANNELS = {
  FS_READ_DIR: 'fs:read-dir',
  FS_READ_FILE: 'fs:read-file',
  FS_WRITE_FILE: 'fs:write-file',
  FS_STAT: 'fs:stat',
  SHELL_EXECUTE: 'shell:execute',
  DIALOG_OPEN_DIR: 'dialog:open-dir',
  AGENT_MESSAGE: 'agent:message',
  AGENT_STATUS: 'agent:status',
  TASK_UPDATE: 'task:update',
} as const;

export const EVENT_NAMES = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_COMPLETED: 'task:completed',
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  MESSAGE_RECEIVED: 'message:received',
} as const;

export const DEFAULT_CONFIG = {
  maxTokenBudget: 100000,
  defaultModel: 'gpt-5.2',
  embeddingModel: 'text-embedding-3-small',
  maxConcurrentSubagents: 4,
  vectorDimensions: 1536,
} as const;
