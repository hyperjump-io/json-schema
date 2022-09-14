import type { Result } from "./core";


export class InvalidSchemaError extends Error {
  public output: Result;

  public constructor(output: Result);
}
