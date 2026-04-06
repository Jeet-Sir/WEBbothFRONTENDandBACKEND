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
import { validateDocumentPrompt } from './validate-document';

const ExtractDataFromDocumentInputSchema = z.object({
  fileUri: z.string().describe("The URI returned by the Gemini File API."),
  mimeType: z.string().describe("The MIME type of the uploaded file."),
  docType: z.string().describe('The type of the document (e.g., aadhaar_card).'),
});
export type ExtractDataFromDocumentInput = z.infer<typeof ExtractDataFromDocumentInputSchema>;

const ExtractDataFromDocumentOutputSchema = z.object({
  documentType: z.string().describe('The detected document type.'),
  displayName: z.string().describe('The user-facing display name for the document.'),
  profileSection: z.string().describe('The best profile section for this document.'),
  confidence: z.number().min(0).max(1).describe('Confidence score for the classification.'),
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
  documentType: z.string().describe('The specific detected document type.'),
  displayName: z.string().describe('A short user-facing display name for the document.'),
  profileSection: z.string().describe('The best profile section for this document.'),
  confidence: z.number().min(0).max(1).describe('Confidence in the document type classification.'),
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

Expected Document Type: {{{docType}}}

Here is the document:
{{media url=fileUri contentType=mimeType}}

Tasks:
1. If the expected document type is "auto", infer the specific document type from the document itself. Otherwise use the expected document type as the validation target and identify the specific type.
2. Produce a short display name users should see in the vault.
3. Choose the best profileSection from: identity, career, education, financial, other.
4. Return a confidence score between 0 and 1.
5. Extract all identifiable fields from the document. For each field, identify its label and its value.

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
    if (input.docType !== 'auto') {
      const validation = await validateDocumentPrompt({
        fileUri: input.fileUri,
        mimeType: input.mimeType,
        expectedDocType: input.docType,
      });

      if (!validation.output?.isValid) {
        return {
          documentType: validation.output?.detectedType || input.docType,
          displayName: validation.output?.detectedType || input.docType,
          profileSection: 'other',
          confidence: validation.output?.confidence || 0,
          extractedData: {
            error: "Invalid document uploaded",
            detectedType: validation.output?.detectedType,
          },
        };
      }
    }

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
      documentType: output?.documentType || input.docType,
      displayName: output?.displayName || output?.documentType || input.docType,
      profileSection: output?.profileSection || 'other',
      confidence: output?.confidence ?? 0,
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
