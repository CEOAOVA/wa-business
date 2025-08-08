// Type declarations for external JS modules without bundled types

// Allow importing without type errors. Runtime remains unchanged.
declare module 'rate-limiter-flexible' {
  export interface IRateLimiterOptions {
    points: number;
    duration: number;
    blockDuration?: number;
    keyPrefix?: string;
  }
  export class RateLimiterMemory {
    constructor(options: IRateLimiterOptions);
    consume(key: string, points?: number): Promise<any>;
    get(key: string): Promise<any>;
    delete(key: string): Promise<void>;
  }
  export class RateLimiterRedis {
    constructor(options: any);
    consume(key: string, points?: number): Promise<any>;
    get(key: string): Promise<any>;
    delete(key: string): Promise<void>;
  }
}

// bcrypt type shim (for environments without @types/bcrypt)
declare module 'bcrypt' {
  export function genSalt(rounds: number): Promise<string>;
  export function hash(data: string, salt: string): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
}

declare module 'express-validator' {
  export type ValidationChain = any;
  export const validationResult: (req: any) => {
    isEmpty: () => boolean;
    array: () => any[];
  };
  export const param: (...args: any[]) => any;
  export const query: (...args: any[]) => any;
}
