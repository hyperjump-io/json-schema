import { SchemaRegistry } from "./schema-registry.js";
import { JsonSchema } from "../json-schema.js";
import type { V1Schema } from "../dialects/v1/index.d.ts";

// The registries a registry returns take the same schemas
const registry = new SchemaRegistry<V1Schema>()
  .with({ $schema: "https://json-schema.org/v1", type: "string" })
  .without("https://example.com/schema")
  .with({ items: { minLength: 1 } }, { retrievalUri: "https://example.com/schema" });

// @ts-expect-error
registry.with({ items: { minLenght: 1 } });

// @ts-expect-error
new SchemaRegistry<V1Schema>([{ schema: { items: { minLenght: 1 } } }]);

// A schema can be readonly
registry.with({ required: ["name"] } as const);

// JSON text isn't checked
registry.with(`{ "minLenght": 1 }`);

// Without a type, schemas are JSON, and the entries don't give the type
new SchemaRegistry([{ schema: { type: "string" } }]).with({ anything: [1] });
new SchemaRegistry().with({ required: ["name"] } as const);

// A registry of any type can be used
const jsonSchema = new JsonSchema();
jsonSchema.addRegistry(registry);
jsonSchema.removeRegistry(registry);
jsonSchema.session({ registries: [registry, new SchemaRegistry()] });
