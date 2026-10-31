import { JsonSchema, lint } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const jsonSchema = new JsonSchema({ dialects: [v1Dialect] });

export const results = await lint(jsonSchema, "https://example.com/schema");
