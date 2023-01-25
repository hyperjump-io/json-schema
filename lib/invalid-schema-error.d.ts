import type { OutputUnit } from "./core.js";


export class InvalidSchemaError extends Error {
  public output: OutputUnit;

  public constructor(output: OutputUnit);
}
