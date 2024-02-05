import type { OutputFormat, OutputUnit } from "../lib/index.js";
import type { AnnotatedInstance } from "./annotated-instance.js";


export const annotate: (
  (schemaUrl: string, value: unknown, outputFormat?: OutputFormat) => Promise<Annotator>
) & (
  (schemaUrl: string) => Promise<Annotator>
);

export type Annotator = (value: unknown, outputFormat?: OutputFormat) => AnnotatedInstance;

export class ValidationError extends Error {
  public output: OutputUnit;

  public constructor(output: OutputUnit);
}
