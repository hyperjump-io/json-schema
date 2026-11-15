import { configureJsonSchema, validator } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";
import { draft04Dialect } from "@hyperjump/json-schema/draft-04";
import { draft06Dialect } from "@hyperjump/json-schema/draft-06";
import { draft07Dialect } from "@hyperjump/json-schema/draft-07";
import { draft201909Dialect } from "@hyperjump/json-schema/draft-2019-09";
import { draft202012Dialect } from "@hyperjump/json-schema/draft-2020-12";

const jsonSchema = configureJsonSchema({ dialects: [v1Dialect, draft04Dialect, draft06Dialect, draft07Dialect, draft201909Dialect, draft202012Dialect] });

const isValid = await validator(jsonSchema, "https://example.com/schema");
export const result = isValid(42);
