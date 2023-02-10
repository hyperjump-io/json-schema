import type { OutputFormat } from "../lib/core.js";
import type { AnnotatedJsonDocument } from "./annotated-instance.js";


export const annotate: (
  (schemaUrl: string, value: unknown, outputFormat?: OutputFormat) => Promise<Annotator>
) & (
  (schemaUrl: string) => Promise<Annotator>
);

export type Annotator = (value: unknown, outputFormat?: OutputFormat) => AnnotatedJsonDocument;
