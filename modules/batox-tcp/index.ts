// Re-export the native module. On web, it will be resolved to BatoxTcpModule.web.ts
// and on native platforms to BatoxTcpModule.ts
export { default } from './src/BatoxTcpModule';
export * from './src/BatoxTcp.types';
