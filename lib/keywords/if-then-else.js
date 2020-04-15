const { Core, Schema } = require("@hyperjump/json-schema-core");


const compile = async (schema, ast, parentSchema) => {
  const result = {};
  const parentSchemaValue = Schema.value(parentSchema);

  result["if"] = await Core.compileSchema(schema, ast);

  if ("then" in parentSchemaValue) {
    const thenSchema = await Schema.step("then", parentSchema);
    result["then"] = await Core.compileSchema(thenSchema, ast);
  }

  if ("else" in parentSchemaValue) {
    const elseSchema = await Schema.step("else", parentSchema);
    result["else"] = await Core.compileSchema(elseSchema, ast);
  }

  return result;
};

const interpret = (conditional, instance, ast) => {
  return Core.interpretSchema(conditional["if"], instance, ast)
    ? ("then" in conditional ? Core.interpretSchema(conditional["then"], instance, ast) : true)
    : ("else" in conditional ? Core.interpretSchema(conditional["else"], instance, ast) : true);
};

const collectEvaluatedProperties = (conditional, instance, ast) => {
  const propertyNames = Core.collectEvaluatedProperties(conditional["if"], instance, ast);
  const branch = propertyNames ? "then": "else";

  if (conditional[branch]) {
    const branchPropertyNames = Core.collectEvaluatedProperties(conditional[branch], instance, ast);
    return branchPropertyNames && (propertyNames || []).concat(branchPropertyNames);
  } else {
    return propertyNames;
  }
};

const collectEvaluatedItems = (conditional, instance, ast) => {
  const tupleLength = Core.collectEvaluatedItems(conditional["if"], instance, ast);
  const branch = typeof tupleLength === "number" ? "then": "else";

  if (conditional[branch]) {
    const branchTupleLength = Core.collectEvaluatedItems(conditional[branch], instance, ast);
    return branchTupleLength !== false && Math.max(tupleLength, branchTupleLength);
  } else {
    return tupleLength;
  }
};

module.exports = { compile, interpret, collectEvaluatedProperties, collectEvaluatedItems };
