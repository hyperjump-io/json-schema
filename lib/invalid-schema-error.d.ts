import type { Result } from "./core.js";


export class InvalidSchemaError extends Error {
  public output: Result;

  public constructor(output: Result);
}
