export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSON schema for input parameters
  // outputSchema: any; // Optional JSON schema for output data
}

export interface McpToolRequest {
  server_name: string;
  tool_name: string;
  arguments: any;
  request_id?: string;
}

export interface McpToolResponse {
  content: McpResponseContent[];
  error?: McpError;
  request_id?: string;
}

export interface McpResponseContent {
  type: 'text' | 'json' | 'table' | 'html';
  text?: string;
  json?: any;
  table?: McpResponseTable;
  html?: string;
}

export interface McpResponseTable {
  headers: string[];
  rows: string[][];
}

export interface McpError {
  code: number;
  message: string;
  data?: any;
}

export enum ErrorCode {
  Success = 0,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ParseError = -32700
}

export interface McpServerInfo {
  name: string;
  version: string;
  tools: McpToolDefinition[];
  server_path: string;
  running: boolean;
  error?: string;
  processId?: number;
  startTime?: string;
}

export interface McpServerSettings {
  mcpServers: Record<string, McpServerConfig>;
}

export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  autoStart?: boolean;
  enabled?: boolean;
}