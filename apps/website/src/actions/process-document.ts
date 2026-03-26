'use server';

export async function processDocument(fileBase64: string, docType: string) {
    try {
        // In dev, Genkit usually runs on port 4000. 
        // The flow name matches the export in backend.
        const GENKIT_URL = process.env.GENKIT_URL || 'http://localhost:4000/extractDataFromDocumentFlow';

        const response = await fetch(GENKIT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    dataUri: fileBase64,
                    docType: docType
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Genkit Error: ${response.statusText}`);
        }

        const json = await response.json();
        // Genkit response format: { result: ... }
        return { success: true, data: json.result?.extractedData };

    } catch (error) {
        console.error("AI Extraction Error:", error);
        return { success: false, error: 'Failed to extract data' };
    }
}
