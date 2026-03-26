// apps/backend/src/ai/file-manager.ts
import { GoogleGenAI } from '@google/genai';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Initialize the Google Gen AI client
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const geminiClient = new GoogleGenAI({ apiKey });

export async function uploadFileToGemini(fileUrl: string, mimeType: string): Promise<string> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return uploadBufferToGemini(buffer, mimeType);
}

export async function uploadBufferToGemini(buffer: Buffer, mimeType: string): Promise<string> {
  // Create a temp file path
  const tempFilePath = join(tmpdir(), `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  
  try {
    // 1. Write the source file to a temp location for Gemini upload
    await writeFile(tempFilePath, buffer);

    // 2. Upload to Gemini
    console.log(`Uploading file to Gemini: ${mimeType}`);
    const uploadResponse = await geminiClient.files.upload({
      file: tempFilePath,
      config: { mimeType },
    });
    
    // The response IS the file object in the newer SDK
    const uploadedFile = uploadResponse; 
    if (!uploadedFile) {
        throw new Error("File upload response did not contain file metadata.");
    }

    console.log(`File uploaded: ${uploadedFile.name}`);

    // 3. Wait for processing (Crucial for PDFs)
    let fileState = await geminiClient.files.get({ name: uploadedFile.name as string });
    while (fileState.state === 'PROCESSING') {
      console.log('Gemini is processing the file...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fileState = await geminiClient.files.get({ name: uploadedFile.name as string });
    }

    if (fileState.state === 'FAILED') {
      throw new Error('Google Gemini failed to process this document.');
    }

    return fileState.uri as string;

  } catch (error) {
    console.error("Error in uploadFileToGemini:", error);
    throw error;
  } finally {
    // 4. Cleanup local temp file
    await unlink(tempFilePath).catch(() => {});
  }
}
