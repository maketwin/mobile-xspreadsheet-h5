/// <reference types="vite/client" />

declare module '*.css';

interface Window {
  runSpreadsheetPerf?: (rowCount?: number, colCount?: number) => Promise<unknown>;
  __lastSpreadsheetPerf?: unknown;
}
