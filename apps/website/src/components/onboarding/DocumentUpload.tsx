"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, CheckCircle, Eye, Sparkles } from 'lucide-react';
import { processVaultDocument, uploadVaultDocument } from '@/lib/api';

interface DocumentUploadProps {
    authToken: string;
    label: string;
    docType: string;
    currentUrl?: string;
    onUploadComplete: (url: string) => void;
    onExtractionComplete?: (data: any) => void;
    onStoragePathReady?: (path: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
    authToken,
    label,
    docType,
    currentUrl,
    onUploadComplete,
    onExtractionComplete,
    onStoragePathReady
}) => {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files[0]);
        }
    };

    const handleFiles = async (file: File) => {
        // Basic validation
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError("Please upload a PDF or Image (JPEG/PNG/WEBP).");
            return;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            setError("File size must be less than 50MB.");
            return;
        }

        setError(null);
        setUploading(true);
        setProgress(0);

        try {
            setProgress(25);
            const { fileUrl, storagePath } = await uploadVaultDocument(authToken, {
                docType,
                file
            });
            setProgress(100);
            onUploadComplete(fileUrl);
            onStoragePathReady?.(storagePath);

            setProcessing(true);
            const processed = await processVaultDocument(authToken, {
                docType,
                fileUrl,
                storagePath,
                mimeType: file.type
            });

            if (onExtractionComplete) {
                onExtractionComplete(processed.user.documents?.[docType]?.extractedData);
            }
            setProcessing(false);

        } catch (err) {
            console.error(err);
            setError("Upload failed. Please try again.");
            setProcessing(false);
        } finally {
            setUploading(false);
        }
    };

    const triggerFileInput = () => {
        inputRef.current?.click();
    };

    return (
        <Card className={`p-4 border border-dashed transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-border'
            } ${currentUrl ? 'bg-primary/5 border-solid border-primary/20' : ''}`}>

            <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-foreground">{label}</span>
                {currentUrl && (
                    <span className="flex items-center text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1" /> Uploaded
                    </span>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={handleChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
            />

            {!uploading && !processing && !currentUrl && (
                <div
                    className="flex flex-col items-center justify-center py-6 cursor-pointer"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                >
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center mb-2">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                        <br />PDF, JPG or PNG (max 5MB)
                    </p>
                </div>
            )}

            {uploading && (
                <div className="py-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Uploading...</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                </div>
            )}

            {processing && (
                <div className="py-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-primary font-medium animate-pulse">
                        <Sparkles className="w-4 h-4" />
                        <span>Analyzing document with AI...</span>
                    </div>
                    <Progress value={100} className="h-1.5 animate-pulse" />
                </div>
            )}

            {currentUrl && !uploading && !processing && (
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                        <FileText className="w-8 h-8 text-primary/40" />
                        <div className="flex flex-col">
                            <span className="text-xs font-medium truncate max-w-[150px]">Document Uploaded</span>
                            <a
                                href={currentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary underline flex items-center hover:text-primary/80"
                            >
                                <Eye className="w-3 h-3 mr-1" /> View File
                            </a>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={triggerFileInput} className="h-8 text-xs">
                        Replace
                    </Button>
                </div>
            )}

            {error && (
                <div className="mt-2 text-xs text-red-500 flex items-center bg-red-50 p-2 rounded">
                    <X className="w-3 h-3 mr-1" /> {error}
                </div>
            )}
        </Card>
    );
};
