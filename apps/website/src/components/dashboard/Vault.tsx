"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { UserProfile } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FileUp,
  FileCheck,
  Loader2,
  Search,
  Filter,
  Eye,
  Trash2,
  ExternalLink,
  Plus,
  FolderPlus,
  FilePlus,
  Folder,
  Sparkles,
  Edit2,
  Download,
  ArrowRight
} from 'lucide-react';
import { processVaultDocument, uploadVaultDocument } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const getVaultTabs = (user: UserProfile) => {
  const professions = user.professions || [];
  const founderTab = {
    id: 'founder',
    label: 'Founder',
    folder: 'Founder',
    aliases: ['Founder Documents'],
    defaultDocs: ['Pitch Deck', 'Incorporation Certificate', 'Company Registration / Proof of Formation']
  };

  if (user.marketSegment === 'global_founder') {
    return [founderTab];
  }

  const base = [
    {
      id: 'personal',
      label: 'Personal Identity',
      folder: 'Personal Identity',
      defaultDocs: [
        'Passport Photo',
        'Signature',
        'Aadhaar Card',
        'PAN Card',
        'Voter ID',
        'Driving Licence',
        '10th Marksheet',
        '12th Marksheet',
        'Graduation/UG Certification',
        'PG Certification'
      ]
    },
    {
      id: 'student',
      label: 'Student / Opportunity Seeker',
      folder: 'Student / Opportunity Seeker',
      aliases: ['Student', 'Student Documents'],
      defaultDocs: [
        'Passport Photo',
        'Signature',
        'Resume',
        '10th Certificate',
        'Caste Certificate',
        'Left Thumb'
      ]
    },
  ];

  const profession_tabs = [];

  if (professions.includes('Professional')) {
    profession_tabs.push({
      id: 'professional',
      label: 'Professional',
      folder: 'Professional',
      aliases: ['Professional Documents'],
      defaultDocs: ['Offer Letter', 'Experience Letter', 'Salary Slip']
    });
  }

  if (professions.includes('Founder')) {
    profession_tabs.push(founderTab);
  }

  if (professions.includes('Researcher')) {
    profession_tabs.push({
      id: 'researcher',
      label: 'Researcher',
      folder: 'Researcher',
      aliases: ['Researcher Documents'],
      defaultDocs: ['Publications', 'Research Papers', 'Lab Certificates']
    });
  }

  return [...base, ...profession_tabs];
};

const hasIncompleteFounderDetails = (user: UserProfile) => {
  if (!(user.marketSegment === 'global_founder' || user.professions.includes('Founder'))) {
    return false;
  }

  return [
    user.phone,
    user.linkedInProfile,
    user.education,
    user.workExperience,
    user.startupRole,
    user.startupName,
    user.startupWebsite,
    user.startupLinkedInProfile,
    user.industry,
    user.startupStage,
    user.incorporationDate,
    user.companyType,
  ].some((value) => !value?.trim());
};

interface VaultProps {
  authToken: string;
  user: UserProfile;
  saveUser: (user: UserProfile) => void;
  onEditFounderDetails: () => void;
}

export const Vault: React.FC<VaultProps> = ({ authToken, user, saveUser, onEditFounderDetails }) => {
  const [activeTab, setActiveTab] = useState<string>(user.marketSegment === 'global_founder' ? 'founder' : 'personal');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingDoc, setProcessingDoc] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  // Custom Folder State
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [newDocFolder, setNewDocFolder] = useState('');

  // Rename/Delete State
  const [isRenameFolderOpen, setIsRenameFolderOpen] = useState(false);
  const [renamingFolderName, setRenamingFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [isRenameDocOpen, setIsRenameDocOpen] = useState(false);
  const [renamingDocName, setRenamingDocName] = useState('');
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);

  const isDeveloper = user.email === 'jithusoe@gmail.com' || user.email === 'sabapplierai100m@gmail.com' || user.email === 'palanirudh82994@gmail.com';

  const VAULT_TABS = getVaultTabs(user);

  // Calculate all tabs (standard + custom)
  const standardFolderNames = VAULT_TABS.map(t => t.folder);
  const docFolders = new Set<string>();
  if (user.documents) {
    Object.values(user.documents).forEach(d => {
      // Check if folder is not standard and not an alias
      const folder = d.folder;
      if (folder && !standardFolderNames.includes(folder) && !VAULT_TABS.some(t => t.aliases && t.aliases.includes(folder))) {
        docFolders.add(folder);
      }
    });
  }
  customFolders.forEach(f => docFolders.add(f));

  const dynamicTabs = Array.from(docFolders).map(f => ({
    id: f.toLowerCase().replace(/\s+/g, '-'),
    label: f,
    folder: f,
    aliases: [] as string[],
    defaultDocs: [] as string[]
  }));

  const allTabs = [...VAULT_TABS, ...dynamicTabs];
  const currentTabConfig = allTabs.find(t => t.id === activeTab) || allTabs[0];

  React.useEffect(() => {
    if (!allTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(allTabs[0]?.id || 'founder');
    }
  }, [activeTab, allTabs]);

  const getDocumentsForTab = (tabId: string) => {
    const config = allTabs.find(t => t.id === tabId);
    if (!config) return [];

    const relevantFolders = [config.folder, ...(config.aliases || [])];
    const docs = new Set(config.defaultDocs);

    // Define shared documents that appear in multiple tabs
    const sharedDocs = {
      'student': ['Passport Photo', 'Signature'] // These also appear from Personal Identity
    };

    if (user.documents) {
      Object.entries(user.documents).forEach(([docName, docData]) => {
        if (docData.folder && relevantFolders.includes(docData.folder)) {
          docs.add(docName);
        }
        // Add shared documents from Personal Identity folder to other tabs
        if (tabId in sharedDocs && sharedDocs[tabId as keyof typeof sharedDocs].includes(docName) && docData.folder === 'Personal Identity') {
          docs.add(docName);
        }
      });
    }
    return Array.from(docs);
  };

  const activeDocs = getDocumentsForTab(activeTab);
  const uniqueActiveDocs = Array.from(new Set(activeDocs));

  const completedInActive = uniqueActiveDocs.filter(
    (doc) => user.documents?.[doc]?.fileUrl
  ).length;
  const totalInActive = uniqueActiveDocs.length;
  const vaultCompletionPercent = totalInActive > 0
    ? Math.round((completedInActive / totalInActive) * 100)
    : 0;

  const filteredDocs = uniqueActiveDocs.filter((doc) =>
    doc.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleCreateFolder = () => {
    if (newFolderName && !allTabs.some(t => t.label === newFolderName)) {
      setCustomFolders([...customFolders, newFolderName]);
      const newId = newFolderName.toLowerCase().replace(/\s+/g, '-');
      // If tab already exists (e.g. from dynamic calc), use its ID
      const existing = allTabs.find(t => t.label === newFolderName);
      if (existing) {
        setActiveTab(existing.id);
      } else {
        // It will be created in next render
        setActiveTab(newId);
      }
      setNewFolderName('');
      setIsAddFolderOpen(false);
    }
  };

  const handleCreateCustomDoc = () => {
    if (newDocName && newDocFolder) {
      const updatedDocs = {
        ...user.documents,
        [newDocName]: {
          fileUrl: '',
          status: 'idle' as const,
          uploadedAt: new Date().toISOString(),
          folder: newDocFolder
        }
      };
      saveUser({ ...user, documents: updatedDocs });
      setNewDocName('');
      setNewDocFolder('');
      setIsAddDocOpen(false);

      const targetTab = allTabs.find(t => t.folder === newDocFolder);
      if (targetTab) setActiveTab(targetTab.id);
    }
  };

  const handleFileUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingDoc(docType);
    const currentDoc = user.documents?.[docType];
    const folder = currentDoc?.folder || currentTabConfig.folder;

    try {
      const normalizedDocType = docType.toLowerCase().replace(/\s+/g, '_');
      const { fileUrl, storagePath } = await uploadVaultDocument(authToken, {
        docType: normalizedDocType,
        file,
      });

      const tempDocs = {
        ...user.documents,
        [docType]: {
          fileUrl,
          storagePath,
          status: 'processing' as const,
          uploadedAt: new Date().toISOString(),
          folder
        }
      };
      saveUser({ ...user, documents: tempDocs });

      const processed = await processVaultDocument(authToken, {
        docType: normalizedDocType,
        fileUrl,
        storagePath,
        mimeType: file.type,
      });

      const updatedDocs = {
        ...user.documents,
        [docType]: {
          fileUrl,
          storagePath,
          extractedData: processed.user.documents?.[normalizedDocType]?.extractedData || null,
          status: processed.user.documents?.[normalizedDocType]?.status || 'verified',
          uploadedAt: processed.user.documents?.[normalizedDocType]?.uploadedAt || new Date().toISOString(),
          processedAt: processed.user.documents?.[normalizedDocType]?.processedAt,
          folder: folder
        }
      };

      saveUser({ ...user, documents: updatedDocs });
    } catch (err) {
      console.error('AI Processing failed:', err);
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleRemove = (docType: string) => {
    const updatedDocs = { ...user.documents };
    if (updatedDocs[docType]) {
      delete updatedDocs[docType];
      saveUser({ ...user, documents: updatedDocs });
    }
  };

  const handleRenameFolder = () => {
    if (renamingFolderId && renamingFolderName && renamingFolderName !== renamingFolderId) {
      const updatedFolders = customFolders.map(f => f === renamingFolderId ? renamingFolderName : f);
      setCustomFolders(updatedFolders);

      // Update documents folder references
      const updatedDocs = { ...user.documents };
      Object.keys(updatedDocs).forEach(docName => {
        if (updatedDocs[docName]?.folder === renamingFolderId) {
          updatedDocs[docName] = { ...updatedDocs[docName], folder: renamingFolderName };
        }
      });
      saveUser({ ...user, documents: updatedDocs });

      // Update activeTab if needed
      if (activeTab === renamingFolderId.toLowerCase().replace(/\s+/g, '-')) {
        const newId = renamingFolderName.toLowerCase().replace(/\s+/g, '-');
        setActiveTab(newId);
      }

      setRenamingFolderId(null);
      setRenamingFolderName('');
      setIsRenameFolderOpen(false);
    }
  };

  const handleDeleteFolder = (folderName: string) => {
    if (window.confirm(`Are you sure you want to delete the folder "${folderName}" and its documents?`)) {
      // Remove from custom folders
      setCustomFolders(customFolders.filter(f => f !== folderName));

      // Delete all documents in this folder
      const updatedDocs = { ...user.documents };
      Object.keys(updatedDocs).forEach(docName => {
        if (updatedDocs[docName]?.folder === folderName) {
          delete updatedDocs[docName];
        }
      });
      saveUser({ ...user, documents: updatedDocs });

      // Reset to personal tab if delete folder is active
      if (activeTab === folderName.toLowerCase().replace(/\s+/g, '-')) {
        setActiveTab('personal');
      }
    }
  };

  const handleRenameDocument = () => {
    if (renamingDocId && renamingDocName && renamingDocName !== renamingDocId) {
      const updatedDocs = { ...user.documents };
      if (updatedDocs[renamingDocId]) {
        const docData = updatedDocs[renamingDocId];
        delete updatedDocs[renamingDocId];
        updatedDocs[renamingDocName] = docData;
      }
      saveUser({ ...user, documents: updatedDocs });

      setRenamingDocId(null);
      setRenamingDocName('');
      setIsRenameDocOpen(false);
    }
  };

  const handleDeleteDocument = (docName: string) => {
    if (window.confirm(`Are you sure you want to delete "${docName}"?`)) {
      const updatedDocs = { ...user.documents };
      delete updatedDocs[docName];
      saveUser({ ...user, documents: updatedDocs });
    }
  };

  const handleDeleteFile = (docName: string) => {
    if (window.confirm(`Are you sure you want to delete the file for "${docName}"?`)) {
      const updatedDocs = { ...user.documents };
      if (updatedDocs[docName]) {
        if (isCustomDocument(docName)) {
          // For custom doc, keep the entry but clear file data
          updatedDocs[docName] = {
            ...updatedDocs[docName],
            fileUrl: '',
            extractedData: null,
            status: 'idle',
          };
        } else {
          // For default doc, deleting the key resets it
          delete updatedDocs[docName];
        }

        saveUser({ ...user, documents: updatedDocs });

        // Clear processing state if it was processing
        if (processingDoc === docName) {
          setProcessingDoc(null);
        }
      }
    }
  };

  const isCustomFolder = (folderName: string) => customFolders.includes(folderName);

  const isCustomDocument = (docName: string) => {
    const config = allTabs.find(t => t.id === activeTab);
    return config && !config.defaultDocs.includes(docName);
  };

  const currentDocData = viewingDoc ? user.documents?.[viewingDoc] : null;
  const shouldShowFounderReminder = activeTab === 'founder' && hasIncompleteFounderDetails(user);

  const handleDownload = async (url: string, filename: string) => {
    try {
      // Use the proxy API endpoint to download the file
      // This avoids CORS issues and sets the correct headers for download

      // Try to determine extension if missing from filename
      let extension = '';
      if (!filename.includes('.')) {
        const urlPath = new URL(url).pathname;
        const dotIndex = urlPath.lastIndexOf('.');
        if (dotIndex !== -1) {
          extension = urlPath.substring(dotIndex);
        }
      }

      const finalFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;

      const proxyUrl = `/api/proxy-file?url=${encodeURIComponent(url)}&name=${encodeURIComponent(finalFilename)}`;

      // Trigger download by navigating to the proxy URL
      const link = document.createElement('a');
      link.href = proxyUrl;
      link.download = finalFilename; // Fallback
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-primary">
          {user.marketSegment === 'global_founder'
            ? 'Keep your founder and startup documents ready for accelerators, grants, and fundraising workflows.'
            : 'Upload your important documents to manage, access them anytime, and easily share or fill complex forms.'}
        </h2>
        <p className="text-muted-foreground font-medium">
          {user.marketSegment === 'global_founder'
            ? 'Your founder vault is optimized for the core startup documents most global founder applications ask for.'
            : 'Documents get resized, cropped, compressed and change file format according to the form requirements.'}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
        <h3 className="font-semibold text-blue-900">Upload Documents</h3>
        <p className="text-sm text-blue-800">
          {user.marketSegment === 'global_founder'
            ? 'Start with your pitch deck, incorporation certificate, and company formation proof.'
            : 'We recommend uploading these documents for a smooth application process.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="flex justify-end">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5c75b8]" />
              <input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/95 border border-[#c5d3f7] rounded-2xl text-sm text-[#1f3f87] placeholder:text-[#90a0c8] focus:outline-none focus:ring-2 focus:ring-[#2F56C0]/30 focus:border-[#6a84c7] transition-all shadow-sm hover:shadow"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-8">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-slate-100 p-1 rounded-xl h-auto gap-1">
                {allTabs.map(tab => {
                  const isCustom = isCustomFolder(tab.label);
                  return (
                    <div key={tab.id} className="relative group">
                      <TabsTrigger
                        value={tab.id}
                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all whitespace-normal h-auto py-3 px-2 w-full text-left"
                      >
                        {tab.label}
                      </TabsTrigger>
                      {isCustom && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-blue-600 hover:bg-blue-100 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingFolderId(tab.label);
                              setRenamingFolderName(tab.label);
                              setIsRenameFolderOpen(true);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-600 hover:bg-red-100 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(tab.label);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </TabsList>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold text-primary">{currentTabConfig.label}</h3>

              <div className="flex flex-col sm:flex-row gap-2">
                <Dialog open={isAddFolderOpen} onOpenChange={setIsAddFolderOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-xl border-[#c5d3f7] text-[#2F56C0] hover:bg-[#eef2ff] w-full sm:w-auto">
                      <FolderPlus className="w-4 h-4" /> New Folder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Folder</DialogTitle>
                      <DialogDescription>Organize your documents into custom categories.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label>Folder Name</Label>
                      <Input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="e.g., Medical Records"
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateFolder} disabled={!newFolderName}>Create Folder</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddDocOpen} onOpenChange={(open) => {
                  setIsAddDocOpen(open);
                  if (open) setNewDocFolder(currentTabConfig.folder);
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 rounded-xl bg-[#2F56C0] hover:bg-[#284aa8] w-full sm:w-auto">
                      <FilePlus className="w-4 h-4" /> Add Custom Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Document</DialogTitle>
                      <DialogDescription>
                        Add a new document to your vault.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Document Name</Label>
                        <Input
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          placeholder="e.g., Bonafide Certificate"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Folder</Label>
                        <Select value={newDocFolder} onValueChange={setNewDocFolder}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select folder" />
                          </SelectTrigger>
                          <SelectContent>
                            {allTabs.map(tab => (
                              <SelectItem key={tab.id} value={tab.folder}>{tab.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateCustomDoc} disabled={!newDocName || !newDocFolder}>Add Document</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isRenameFolderOpen} onOpenChange={setIsRenameFolderOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rename Folder</DialogTitle>
                      <DialogDescription>Enter a new name for your folder.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label>Folder Name</Label>
                      <Input
                        value={renamingFolderName}
                        onChange={(e) => setRenamingFolderName(e.target.value)}
                        placeholder="e.g., Medical Records"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRenameFolderOpen(false)}>Cancel</Button>
                      <Button onClick={handleRenameFolder} disabled={!renamingFolderName || renamingFolderName === renamingFolderId}>Rename</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isRenameDocOpen} onOpenChange={setIsRenameDocOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rename Document</DialogTitle>
                      <DialogDescription>Enter a new name for your document.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label>Document Name</Label>
                      <Input
                        value={renamingDocName}
                        onChange={(e) => setRenamingDocName(e.target.value)}
                        placeholder="e.g., Bonafide Certificate"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRenameDocOpen(false)}>Cancel</Button>
                      <Button onClick={handleRenameDocument} disabled={!renamingDocName || renamingDocName === renamingDocId}>Rename</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {shouldShowFounderReminder && (
              <div className="mb-6 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-black uppercase tracking-widest text-amber-700">Founder Reminder</p>
                    <h4 className="text-xl font-bold text-slate-900">
                      You haven&apos;t completed your Founder & Startup details yet.
                    </h4>
                    <p className="text-sm text-slate-700 max-w-2xl leading-relaxed">
                      These are repeated questions in long founder application forms. If you complete them once, it becomes much easier for Sabapplier AI extension to help fill long forms for you.
                    </p>
                  </div>
                  <Button onClick={onEditFounderDetails} className="h-11 rounded-2xl px-5 font-bold shrink-0">
                    Complete Founder Details <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            <TabsContent value={activeTab} className="mt-0 space-y-4">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-900">No documents found</h3>
                  <p className="text-slate-500">Add a custom document or try a different search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocs.map((docType) => {
                    const docData = user.documents?.[docType];
                    const isUploaded = !!docData?.fileUrl;
                    const isProcessing = processingDoc === docType || docData?.status === 'processing';

                    return (
                      <Card key={docType} className="group relative overflow-hidden border-[#c5d3f7]/60 hover:border-[#2F56C0]/30 transition-all hover:shadow-lg bg-white/80 backdrop-blur-sm">
                        <div className="p-5 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`p-3 rounded-xl flex-shrink-0 ${isUploaded ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                              {isUploaded ? <FileCheck className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <h3 className="font-bold text-[#1f3f87] truncate pr-2" title={docType}>
                                {docType}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isUploaded
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-500'
                                  }`}>
                                  {isUploaded ? 'Uploaded' : 'Pending'}
                                </span>
                                {docData?.uploadedAt && (
                                  <span className="text-xs text-slate-400">
                                    {new Date(docData.uploadedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex gap-1">
                              {isUploaded && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-[#2F56C0] hover:bg-blue-50 rounded-lg"
                                    onClick={() => setViewingDoc(docType)}
                                    title="View Document"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-[#2F56C0] hover:bg-blue-50 rounded-lg"
                                    onClick={() => handleDownload(docData.fileUrl, docType)}
                                    title="Download Document"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {(isUploaded || isProcessing) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  onClick={() => handleDeleteFile(docType)}
                                  title="Delete File"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                              {isCustomDocument(docType) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                  onClick={() => {
                                    setRenamingDocId(docType);
                                    setRenamingDocName(docType);
                                    setIsRenameDocOpen(true);
                                  }}
                                  title="Rename Document"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              )}
                              {isCustomDocument(docType) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                  onClick={() => handleDeleteDocument(docType)}
                                  title="Delete Document Field"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                          {isProcessing ? (
                            <div className="flex items-center gap-2 text-sm text-[#2F56C0]">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {isDeveloper ? 'Processing with AI...' : 'Uploading...'}
                            </div>
                          ) : (
                            <div className="w-full">
                              <input
                                type="file"
                                id={`file-${docType}`}
                                className="hidden"
                                onChange={(e) => handleFileUpload(docType, e)}
                                accept=".pdf,.jpg,.jpeg,.png"
                              />
                              <label
                                htmlFor={`file-${docType}`}
                                className={`
                                                        flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors
                                                        ${isUploaded
                                    ? 'text-slate-600 hover:text-[#2F56C0] hover:bg-white border border-transparent hover:border-slate-200'
                                    : 'bg-white border border-[#c5d3f7] text-[#2F56C0] hover:bg-[#2F56C0] hover:text-white shadow-sm'
                                  }
                                                    `}
                              >
                                {isUploaded ? 'Replace File' : 'Upload Document'}
                              </label>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-[#2F56C0] to-[#1e3a8a] text-white border-none shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <FileCheck className="w-24 h-24" />
            </div>
            <h3 className="text-lg font-bold mb-2">Vault Status</h3>
            <div className="space-y-4 relative z-10">
              <div>
                <div className="flex justify-between text-sm mb-2 text-blue-100">
                  <span>Profile Completion</span>
                  <span className="font-bold">{vaultCompletionPercent}%</span>
                </div>
                <Progress value={vaultCompletionPercent} className="h-2 bg-blue-900/30" />
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-blue-200">Documents Uploaded</span>
                  <span className="text-2xl font-black">{completedInActive}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-200">Pending Actions</span>
                  <span className="text-lg font-bold text-orange-300">{totalInActive - completedInActive}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Document Preview Dialog */}
          <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-50">
              {currentDocData && (
                <>
                  <DialogHeader className="p-4 border-b bg-white flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col text-left space-y-1">
                      <DialogTitle className="font-bold text-lg">{viewingDoc}</DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground">
                        Uploaded on {new Date(currentDocData.uploadedAt).toLocaleDateString()}
                      </DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={currentDocData.fileUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                        <ExternalLink className="w-4 h-4" /> Open Original
                      </a>
                    </Button>
                  </DialogHeader>

                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/50">
                    <iframe
                      src={currentDocData.fileUrl}
                      className="w-full h-full rounded-lg border shadow-sm bg-white"
                      title="Document Preview"
                    />
                  </div>

                  {isDeveloper && currentDocData.extractedData && (
                    <div className="p-4 bg-white border-t max-h-48 overflow-y-auto">
                      <h4 className="font-bold text-sm mb-2 text-primary flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> AI Extracted Data
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        {Object.entries(currentDocData.extractedData).map(([key, value]) => (
                          <div key={key} className="p-2 bg-slate-50 rounded border">
                            <span className="block text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">{key}</span>
                            <span className="font-medium truncate block" title={String(value)}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};
