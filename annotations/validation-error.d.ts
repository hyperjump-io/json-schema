import type { OutputUnit } from "../lib/core.js";


export class ValidationError extends Error {
  public output: OutputUnit;

  public constructor(output: OutputUnit);
}
