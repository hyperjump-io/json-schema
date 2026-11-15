import { jsonSchemaMediaTypes, validator } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const jsonSchema = { mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect] }) };

const isValid = await validator(jsonSchema, "https://example.com/schema");
export const result = isValid(42);
