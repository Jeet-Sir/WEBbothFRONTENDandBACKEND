'use server';
/**
 * @fileOverview An AI agent for extracting data from uploaded documents.
 *
 * - extractDataFromDocument - A function that handles the data extraction process.
 * - ExtractDataFromDocumentInput - The input type for the extractDataFromDocument function.
 * - ExtractDataFromDocumentOutput - The return type for the extractDataFromDocument function.
 */

import { ai } from '../genkit';
import {z} from 'genkit';

const ExtractDataFromDocumentInputSchema = z.object({
  fileUri: z.string().describe("The URI returned by the Gemini File API."),
  mimeType: z.string().describe("The MIME type of the uploaded file."),
  docType: z.string().describe('The type of the document (e.g., aadhaar_card).'),
});
export type ExtractDataFromDocumentInput = z.infer<typeof ExtractDataFromDocumentInputSchema>;

const ExtractDataFromDocumentOutputSchema = z.object({
  extractedData: z.record(z.string(), z.any()).describe('The extracted data from the document as a JSON object.'),
  usage: z.object({
    inputTokens: z.number().int().min(0).optional(),
    outputTokens: z.number().int().min(0).optional(),
    totalTokens: z.number().int().min(0).optional(),
    inputImages: z.number().int().min(0).optional(),
    thoughtsTokens: z.number().int().min(0).optional(),
    cachedContentTokens: z.number().int().min(0).optional(),
  }).optional(),
});
export type ExtractDataFromDocumentOutput = z.infer<typeof ExtractDataFromDocumentOutputSchema>;

// Internal schema to satisfy Gemini's requirement for non-empty properties in OBJECT types.
// z.record() can cause issues with structured output schemas in some Gemini versions because it maps to an empty properties list.
const InternalPromptOutputSchema = z.object({
  fields: z.array(z.object({
    key: z.string().describe('The name of the field (e.g., Name, Date of Birth).'),
    value: z.string().describe('The value of the field found in the document.')
  })).describe('List of all identifiable fields extracted from the document.')
});

export async function extractDataFromDocument(input: ExtractDataFromDocumentInput): Promise<ExtractDataFromDocumentOutput> {
  return extractDataFromDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractDataFromDocumentPrompt',
  input: {schema: ExtractDataFromDocumentInputSchema},
  output: {schema: InternalPromptOutputSchema},
  prompt: `You are an expert in document analysis and data extraction. Your task is to extract all relevant fields from the given document.

Document Type: {{{docType}}}

Here is the document:
{{media url=fileUri contentType=mimeType}}

Extract all identifiable fields from the document. For each field, identify its label and its value. 

If the document is of low quality and data cannot be reliably extracted, include a field with key "error" and value "low_quality".
`,
});

const extractDataFromDocumentFlow = ai.defineFlow(
  {
    name: 'extractDataFromDocumentFlow',
    inputSchema: ExtractDataFromDocumentInputSchema,
    outputSchema: ExtractDataFromDocumentOutputSchema,
  },
  async (input: ExtractDataFromDocumentInput) => {
    const response = await prompt(input);
    const { output, usage } = response;
    
    // Transform the array back into the record format expected by the frontend
    const extractedData: Record<string, any> = {};
    if (output?.fields) {
      output.fields.forEach((f: { key: string; value: string }) => {
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
  }
);
