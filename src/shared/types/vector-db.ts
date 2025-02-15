export interface VectorDBConfig {
  provider: 'chromadb' | 'qdrant' | 'other';
  connectionString: string;
  apiKey?: string;
  apiURL?: string;
  collectionName: string;
}

export interface VectorDatabase {
  addDocuments(documents: Document[]): Promise<string>;
  query(query: string, topK: number): Promise<QueryResult[]>;
}

export interface QueryResult {
  id: string;
  score: number;
  values: number[];
  embedding: number[];
  metadata: any;
  document: string;
}

export interface Document {
  pageContent: string;
  metadata: any;
  embedding?: number[];
  id?: string; // Optional, if you want to provide your own IDs
}

export interface VectorDBManager {
  addFile(filePath: string, language?: string, chunkSize?: number, chunkOverlap?: number): Promise<void>;
  addDirectory(directoryPath: string, recursive?: boolean, fileTypes?: string[]): Promise<void>;
  queryDatabase(query: string, topK?: number, filters?: VectorDatabaseFilter): Promise<QueryResult[] | null>;
  listCollections(): Promise<string[] | null>;
  getCollectionStatus(collectionName: string): Promise<any>;
  deleteCollection(collectionName: string): Promise<boolean>;
  importChmFile(filePath: string, processingOptions?: CHMProcessingOptions): Promise<any>;
  importChmDirectory(directoryPath: string, recursive?: boolean, processingOptions?: CHMProcessingOptions): Promise<any>;
  getImportStatus(): Promise<any>;
}

export interface VectorDatabaseFilter {
  [key: string]: string | string[];
}

export interface CHMProcessingOptions {
  maxConcurrency?: number;
  chunkSize?: number;
}
