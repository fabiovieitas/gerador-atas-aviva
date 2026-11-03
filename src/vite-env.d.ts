/// <reference types="vite/client" />

declare module 'mammoth' {
  const mammoth: any;
  export default mammoth;
  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<{ value: string; messages: any[] }>;
}

