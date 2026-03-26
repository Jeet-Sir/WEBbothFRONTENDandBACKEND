'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDataFromDocument = extractDataFromDocument;
/**
 * @fileOverview An AI agent for extracting data from uploaded documents.
 *
 * - extractDataFromDocument - A function that handles the data extraction process.
 * - ExtractDataFromDocumentInput - The input type for the extractDataFromDocument function.
 * - ExtractDataFromDocumentOutput - The return type for the extractDataFromDocument function.
 */
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const ExtractDataFromDocumentInputSchema = genkit_2.z.object({
    fileUri: genkit_2.z.string().describe("The URI returned by the Gemini File API."),
    mimeType: genkit_2.z.string().describe("The MIME type of the uploaded file."),
    docType: genkit_2.z.string().describe('The type of the document (e.g., aadhaar_card).'),
});
const ExtractDataFromDocumentOutputSchema = genkit_2.z.object({
    extractedData: genkit_2.z.record(genkit_2.z.string(), genkit_2.z.any()).describe('The extracted data from the document as a JSON object.'),
    usage: genkit_2.z.object({
        inputTokens: genkit_2.z.number().int().min(0).optional(),
        outputTokens: genkit_2.z.number().int().min(0).optional(),
        totalTokens: genkit_2.z.number().int().min(0).optional(),
        inputImages: genkit_2.z.number().int().min(0).optional(),
        thoughtsTokens: genkit_2.z.number().int().min(0).optional(),
        cachedContentTokens: genkit_2.z.number().int().min(0).optional(),
    }).optional(),
});
// Internal schema to satisfy Gemini's requirement for non-empty properties in OBJECT types.
// z.record() can cause issues with structured output schemas in some Gemini versions because it maps to an empty properties list.
const InternalPromptOutputSchema = genkit_2.z.object({
    fields: genkit_2.z.array(genkit_2.z.object({
        key: genkit_2.z.string().describe('The name of the field (e.g., Name, Date of Birth).'),
        value: genkit_2.z.string().describe('The value of the field found in the document.')
    })).describe('List of all identifiable fields extracted from the document.')
});
async function extractDataFromDocument(input) {
    return extractDataFromDocumentFlow(input);
}
const prompt = genkit_1.ai.definePrompt({
    name: 'extractDataFromDocumentPrompt',
    input: { schema: ExtractDataFromDocumentInputSchema },
    output: { schema: InternalPromptOutputSchema },
    prompt: `You are an expert in document analysis and data extraction. Your task is to extract all relevant fields from the given document.

Document Type: {{{docType}}}

Here is the document:
{{media url=fileUri contentType=mimeType}}

Extract all identifiable fields from the document. For each field, identify its label and its value. 

If the document is of low quality and data cannot be reliably extracted, include a field with key "error" and value "low_quality".
`,
});
const extractDataFromDocumentFlow = genkit_1.ai.defineFlow({
    name: 'extractDataFromDocumentFlow',
    inputSchema: ExtractDataFromDocumentInputSchema,
    outputSchema: ExtractDataFromDocumentOutputSchema,
}, async (input) => {
    const response = await prompt(input);
    const { output, usage } = response;
    // Transform the array back into the record format expected by the frontend
    const extractedData = {};
    if (output?.fields) {
        output.fields.forEach((f) => {
            extractedData[f.key] = f.value;
        });
    }
    return {
        extractedData,
        usage: usage
            ? {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                totalTokens: usage.totalTokens,
                inputImages: usage.inputImages,
                thoughtsTokens: usage.thoughtsTokens,
                cachedContentTokens: usage.cachedContentTokens,
            }
            : undefined,
    };
});
