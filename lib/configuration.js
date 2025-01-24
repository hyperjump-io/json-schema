let metaSchemaOutputFormat;
let shouldValidateSchema = true;
let validateFormats = false; 

export const getMetaSchemaOutputFormat = () => metaSchemaOutputFormat;
export const setMetaSchemaOutputFormat = (format) => {
    metaSchemaOutputFormat = format;
};

export const getShouldValidateSchema = () => shouldValidateSchema;
export const setShouldValidateSchema = (isEnabled) => {
    shouldValidateSchema = isEnabled;
};

export const getValidateFormats = () => validateFormats; 
export const setValidateFormats = (isEnabled) => {     
    validateFormats = isEnabled;
};
