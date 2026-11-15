import { BASIC, configureJsonSchema, validator } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const jsonSchema = configureJsonSchema({ dialects: [v1Dialect] });

const check = await validator(jsonSchema, "https://example.com/schema", { output: BASIC });
export const result = check(42);
