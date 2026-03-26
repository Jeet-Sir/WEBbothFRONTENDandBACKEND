"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToGemini = uploadFileToGemini;
exports.uploadBufferToGemini = uploadBufferToGemini;
// apps/backend/src/ai/file-manager.ts
const genai_1 = require("@google/genai");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const os_1 = require("os");
// Initialize the Google Gen AI client
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const geminiClient = new genai_1.GoogleGenAI({ apiKey });
async function uploadFileToGemini(fileUrl, mimeType) {
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return uploadBufferToGemini(buffer, mimeType);
}
async function uploadBufferToGemini(buffer, mimeType) {
    // Create a temp file path
    const tempFilePath = (0, path_1.join)((0, os_1.tmpdir)(), `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    try {
        // 1. Write the source file to a temp location for Gemini upload
        await (0, promises_1.writeFile)(tempFilePath, buffer);
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
        let fileState = await geminiClient.files.get({ name: uploadedFile.name });
        while (fileState.state === 'PROCESSING') {
            console.log('Gemini is processing the file...');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            fileState = await geminiClient.files.get({ name: uploadedFile.name });
        }
        if (fileState.state === 'FAILED') {
            throw new Error('Google Gemini failed to process this document.');
        }
        return fileState.uri;
    }
    catch (error) {
        console.error("Error in uploadFileToGemini:", error);
        throw error;
    }
    finally {
        // 4. Cleanup local temp file
        await (0, promises_1.unlink)(tempFilePath).catch(() => { });
    }
}
