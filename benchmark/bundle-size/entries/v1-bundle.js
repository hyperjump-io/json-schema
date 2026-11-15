import { configureJsonSchema, bundle } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const jsonSchema = configureJsonSchema({ dialects: [v1Dialect] });

export const bundled = await bundle(jsonSchema, "https://example.com/schema");
