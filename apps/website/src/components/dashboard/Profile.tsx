"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
  UserProfile,
  Profession,
  CoFounderProfile,
  QUALIFICATIONS,
  CATEGORIES,
  RELIGIONS,
  STATES,
  LANGUAGES,
  MARITAL_STATUSES,
  DISABILITY_OPTIONS,
  STARTUP_STAGES,
  COMPANY_TYPES,
  getCountryLabel,
} from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, ShieldCheck, Edit3, Save, MapPin, Briefcase, GraduationCap, Check, FileCheck2, Settings, Trash2, Globe2, Building2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

interface ProfileProps {
  user: UserProfile;
  saveUser: (user: UserProfile) => void;
  onDeleteAccount: () => void;
  autoOpenFounderEditor?: boolean;
  onAutoOpenHandled?: () => void;
}

function createEmptyCoFounder(): CoFounderProfile {
  return {
    fullName: '',
    email: '',
    phone: '',
    linkedInProfile: '',
    education: '',
    workExperience: '',
    startupRole: '',
  };
}

export const Profile: React.FC<ProfileProps> = ({
  user,
  saveUser,
  onDeleteAccount,
  autoOpenFounderEditor = false,
  onAutoOpenHandled,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editedUser, setEditedUser] = useState<UserProfile>({ ...user, coFounders: user.coFounders || [] });
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const founderEditorRef = useRef<HTMLDivElement | null>(null);
  const isGlobalFounder = user.marketSegment === 'global_founder';
  const isFounder = user.marketSegment === 'global_founder' || user.professions.includes('Founder');

  useEffect(() => {
    setEditedUser({ ...user, coFounders: user.coFounders || [] });
    setAvatarLoadFailed(false);
  }, [user]);

  useEffect(() => {
    if (!autoOpenFounderEditor) return;

    setEditedUser({ ...user, coFounders: user.coFounders || [] });
    setIsEditing(true);

    const timer = window.setTimeout(() => {
      founderEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    onAutoOpenHandled?.();

    return () => window.clearTimeout(timer);
  }, [autoOpenFounderEditor, onAutoOpenHandled, user]);

  const handleSave = () => {
    saveUser({
      ...editedUser,
      fullName: `${editedUser.firstName || ''} ${editedUser.lastName || ''}`.trim() || user.fullName,
      professions: editedUser.marketSegment === 'global_founder' ? ['Founder'] : editedUser.professions,
      coFounders: editedUser.coFounders || [],
    });
    setIsEditing(false);
  };

  const toggleProfession = (profession: Profession) => {
    if (editedUser.marketSegment === 'global_founder') return;

    const current = [...editedUser.professions];
    if (current.includes(profession)) {
      setEditedUser({ ...editedUser, professions: current.filter((value) => value !== profession) });
      return;
    }

    if (current.length < 3) {
      setEditedUser({ ...editedUser, professions: [...current, profession] });
    }
  };

  const updateCoFounder = (index: number, field: keyof CoFounderProfile, value: string) => {
    const nextCoFounders = [...(editedUser.coFounders || [])];
    nextCoFounders[index] = {
      ...nextCoFounders[index],
      [field]: value,
    };
    setEditedUser({ ...editedUser, coFounders: nextCoFounders });
  };

  const addCoFounder = () => {
    setEditedUser({ ...editedUser, coFounders: [...(editedUser.coFounders || []), createEmptyCoFounder()] });
  };

  const removeCoFounder = (index: number) => {
    setEditedUser({
      ...editedUser,
      coFounders: (editedUser.coFounders || []).filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const personalDocuments = [
    { label: 'Passport Size Photo', keys: ['passport_photo', 'Passport Photo'] },
    { label: 'Aadhaar Card', keys: ['aadhaar_card', 'Aadhaar Card'] },
    { label: 'Signature', keys: ['signature', 'Signature'] },
    { label: 'PAN Card', keys: ['pan_card', 'PAN Card'] },
    { label: '10th Marksheet', keys: ['10th_marksheet', '10th Marksheet'] },
    { label: '12th Marksheet', keys: ['12th_marksheet', '12th Marksheet'] },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center text-center space-y-6">
        <Badge variant="outline" className="px-4 py-1.5 rounded-full bg-slate-50 text-primary border-slate-200 flex items-center gap-2">
          <User className="w-3 h-3" /> Profile Settings
        </Badge>

        <div className="space-y-2">
          <h1 className="text-5xl font-black text-primary tracking-tighter">
            My <span className="text-[#2F56C0]">Profile</span>
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Manage your personal, market, and founder information
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              setEditedUser({ ...user, coFounders: user.coFounders || [] });
              setIsEditing(true);
            }}
            className="h-12 px-8 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 flex items-center gap-3 transition-transform hover:scale-105"
          >
            <Edit3 className="w-5 h-5" /> Edit Profile
          </Button>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-12 px-6 rounded-2xl text-lg font-bold border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
              >
                <Settings className="w-5 h-5" /> Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Profile Settings</DialogTitle>
                <DialogDescription>
                  Manage your account preferences and data.
                </DialogDescription>
              </DialogHeader>
              <div className="pt-4 space-y-4">
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 space-y-3">
                  <div className="flex items-center gap-2 text-red-700 font-bold">
                    <Trash2 className="w-4 h-4" /> Danger Zone
                  </div>
                  <p className="text-xs text-red-600/80 leading-relaxed">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full font-bold"
                    onClick={() => {
                      const confirmed = window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.');
                      if (confirmed) {
                        onDeleteAccount();
                        setIsSettingsOpen(false);
                      }
                    }}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card className="p-8 relative overflow-hidden group dashboard-card">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#2F56C0]" />
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="w-32 h-32 bg-primary rounded-[3rem] flex items-center justify-center text-5xl font-black text-white shadow-2xl overflow-hidden">
                  {user.avatarUrl && !avatarLoadFailed ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarLoadFailed(true)}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    user.firstName?.[0] || user.fullName?.[0]
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-black text-primary">{user.fullName}</h2>
                <p className="text-muted-foreground font-medium">{user.email}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
                  {user.marketSegment === 'global_founder' ? 'Global Founder' : 'India'}
                </Badge>
                <Badge className="bg-slate-100 text-primary border border-slate-200">
                  {getCountryLabel(user.countryCode)}
                </Badge>
              </div>

              <div className="px-4 py-2 bg-green-50 text-green-700 text-xs font-bold uppercase rounded-xl flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Signed in with Google
              </div>
            </div>
          </Card>

          <Card className="p-8 space-y-6 dashboard-card">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Core Stats</h4>
            <div className="space-y-4">
              <StatItem label="Verified Documents" value={Object.keys(user.documents).length} />
              <StatItem label="Co-Founders" value={user.coFounders?.length || 0} />
              <StatItem label="Account Type" value={isGlobalFounder ? 'Global Founder' : 'Identity Vault Free'} />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DetailSection title="Basic Contact" icon={<Mail className="w-5 h-5 text-[#2F56C0]" />}>
              <DetailItem label="Full Name" value={`${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim() || user.fullName} />
              <DetailItem label="Email" value={user.email} />
              <DetailItem label="Phone Number" value={user.phone} />
              <DetailItem label="Country" value={getCountryLabel(user.countryCode)} />
              <DetailItem label="Address" value={user.permanentAddress} />
              {!isGlobalFounder && (
                <>
                  <DetailItem label="Date of Birth" value={user.dob} />
                  <DetailItem label="Father's Name" value={user.fatherName} />
                  <DetailItem label="Mother's Name" value={user.motherName} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Market & Roles" icon={<Globe2 className="w-5 h-5 text-cyan-600" />}>
              <DetailItem label="Market Segment" value={user.marketSegment === 'global_founder' ? 'Global Founder' : 'India'} />
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Professional Roles</span>
                <div className="flex flex-wrap gap-2">
                  {user.professions.map((profession) => (
                    <Badge key={profession} className="bg-slate-100 text-primary hover:bg-slate-200 font-bold px-3 py-1 rounded-lg border border-slate-200">
                      {profession}
                    </Badge>
                  ))}
                  {user.professions.length === 0 && <span className="text-xs text-muted-foreground italic">None specified</span>}
                </div>
              </div>
            </DetailSection>

            {!isGlobalFounder && (
              <DetailSection title="Identity & Education" icon={<GraduationCap className="w-5 h-5 text-purple-500" />}>
                <DetailItem label="Gender" value={user.gender} />
                <DetailItem label="Mother Tongue" value={user.motherTongue} />
                <DetailItem label="Highest Qualification" value={user.highestQualification} />
                <DetailItem label="Social Category" value={user.socialCategory} />
                <DetailItem label="Religion" value={user.religion} />
                <DetailItem label="Marital Status" value={user.maritalStatus} />
                <DetailItem label="Disability Status" value={user.disabilityStatus} />
              </DetailSection>
            )}

            {!isGlobalFounder && (
              <DetailSection title="Geographic Details" icon={<MapPin className="w-5 h-5 text-red-500" />}>
                <DetailItem label="Nationality" value={user.nationality} />
                <DetailItem label="Domicile State" value={user.domicileState} />
                <DetailItem label="District" value={user.district} />
                <DetailItem label="Mandal" value={user.mandal} />
                <DetailItem label="Pincode" value={user.pincode} />
              </DetailSection>
            )}

            {isFounder && (
              <DetailSection title="Founder & Startup" icon={<Building2 className="w-5 h-5 text-emerald-600" />}>
                <DetailItem label="Founder LinkedIn" value={user.linkedInProfile} />
                <DetailItem label="Founder Education" value={user.education} />
                <DetailItem label="Work Experience" value={user.workExperience} />
                <DetailItem label="Role In Startup" value={user.startupRole} />
                <DetailItem label="Startup Name" value={user.startupName} />
                <DetailItem label="Startup Website" value={user.startupWebsite} />
                <DetailItem label="Startup LinkedIn" value={user.startupLinkedInProfile} />
                <DetailItem label="Industry / Sector" value={user.industry} />
                <DetailItem label="Stage" value={user.startupStage} />
                <DetailItem label="Date of Incorporation" value={user.incorporationDate} />
                <DetailItem label="Company Type" value={user.companyType} />

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Co-Founders</span>
                  {(user.coFounders || []).length === 0 ? (
                    <div className="text-sm font-medium text-muted-foreground">No co-founders added yet</div>
                  ) : (
                    <div className="space-y-3">
                      {(user.coFounders || []).map((coFounder, index) => (
                        <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                          <div className="font-semibold text-primary">{coFounder.fullName || `Co-Founder ${index + 1}`}</div>
                          <div className="text-sm text-slate-600">{coFounder.email || 'No email added'}</div>
                          <div className="text-sm text-slate-600">{coFounder.startupRole || 'No role added'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DetailSection>
            )}
          </div>

          {!isGlobalFounder && (
            <DetailSection title="Personal Documents" icon={<FileCheck2 className="w-5 h-5 text-[#2F56C0]" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {personalDocuments.map((doc) => {
                  const matchedDoc = doc.keys.map((key) => user.documents?.[key]).find(Boolean);
                  const isUploaded = Boolean(matchedDoc?.fileUrl);

                  return (
                    <div
                      key={doc.label}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold ${
                        isUploaded
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <span>{doc.label}</span>
                      <span className="inline-flex items-center gap-1">
                        {isUploaded && <FileCheck2 className="w-3 h-3" />}
                        {isUploaded ? 'Uploaded' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </DetailSection>
          )}
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none rounded-[2.5rem]">
          <DialogHeader className="p-8 border-b bg-white sticky top-0 z-10">
            <DialogTitle className="text-3xl font-black text-primary tracking-tight">Edit Profile</DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">Update your personal and founder information</DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-10 bg-slate-50/50">
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="font-bold text-primary">First Name</Label>
                  <Input value={editedUser.firstName || ''} onChange={(e) => setEditedUser({ ...editedUser, firstName: e.target.value })} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Last Name</Label>
                  <Input value={editedUser.lastName || ''} onChange={(e) => setEditedUser({ ...editedUser, lastName: e.target.value })} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Middle Name</Label>
                  <Input value={editedUser.middleName || ''} onChange={(e) => setEditedUser({ ...editedUser, middleName: e.target.value })} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Email</Label>
                  <Input value={editedUser.email || ''} disabled className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Phone Number</Label>
                  <Input value={editedUser.phone || ''} onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-primary">Country</Label>
                  <Input value={getCountryLabel(editedUser.countryCode)} disabled className="h-12 rounded-xl" />
                </div>
                {!isGlobalFounder && (
                  <>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Date of Birth</Label>
                      <Input type="date" value={editedUser.dob || ''} onChange={(e) => setEditedUser({ ...editedUser, dob: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Gender</Label>
                      <Select value={editedUser.gender} onValueChange={(value) => setEditedUser({ ...editedUser, gender: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Father's Name</Label>
                      <Input value={editedUser.fatherName || ''} onChange={(e) => setEditedUser({ ...editedUser, fatherName: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Mother's Name</Label>
                      <Input value={editedUser.motherName || ''} onChange={(e) => setEditedUser({ ...editedUser, motherName: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-primary">Permanent Address</Label>
                <Textarea value={editedUser.permanentAddress || ''} onChange={(e) => setEditedUser({ ...editedUser, permanentAddress: e.target.value })} className="min-h-[100px] rounded-xl" />
              </div>
            </div>

            {!isGlobalFounder && (
              <>
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Education & Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Mother Tongue</Label>
                      <Select value={editedUser.motherTongue} onValueChange={(value) => setEditedUser({ ...editedUser, motherTongue: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((language) => <SelectItem key={language} value={language}>{language}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Highest Qualification</Label>
                      <Select value={editedUser.highestQualification} onValueChange={(value) => setEditedUser({ ...editedUser, highestQualification: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUALIFICATIONS.map((qualification) => <SelectItem key={qualification} value={qualification}>{qualification}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Social Category</Label>
                      <Select value={editedUser.socialCategory} onValueChange={(value) => setEditedUser({ ...editedUser, socialCategory: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Religion</Label>
                      <Select value={editedUser.religion} onValueChange={(value) => setEditedUser({ ...editedUser, religion: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select Religion" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELIGIONS.map((religion) => <SelectItem key={religion} value={religion}>{religion}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Marital Status</Label>
                      <Select value={editedUser.maritalStatus} onValueChange={(value) => setEditedUser({ ...editedUser, maritalStatus: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select Marital Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {MARITAL_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Disability Status</Label>
                      <Select value={editedUser.disabilityStatus} onValueChange={(value) => setEditedUser({ ...editedUser, disabilityStatus: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISABILITY_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Professional Roles</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {(['Student', 'Professional', 'Founder', 'Researcher', 'Other'] as Profession[]).map((profession) => (
                      <Button
                        key={profession}
                        type="button"
                        variant={editedUser.professions.includes(profession) ? 'default' : 'outline'}
                        className="justify-between px-4 h-12 rounded-xl text-xs font-bold"
                        onClick={() => toggleProfession(profession)}
                      >
                        {profession}
                        {editedUser.professions.includes(profession) && <Check className="w-4 h-4" />}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Geographic Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Nationality</Label>
                      <Input value={editedUser.nationality || ''} onChange={(e) => setEditedUser({ ...editedUser, nationality: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Domicile State</Label>
                      <Select value={editedUser.domicileState} onValueChange={(value) => setEditedUser({ ...editedUser, domicileState: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">District</Label>
                      <Input value={editedUser.district || ''} onChange={(e) => setEditedUser({ ...editedUser, district: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Mandal</Label>
                      <Input value={editedUser.mandal || ''} onChange={(e) => setEditedUser({ ...editedUser, mandal: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Pincode</Label>
                      <Input value={editedUser.pincode || ''} maxLength={6} onChange={(e) => setEditedUser({ ...editedUser, pincode: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {isGlobalFounder && (
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Professional Roles</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-slate-100 text-primary border border-slate-200 px-3 py-1 rounded-lg">Founder</Badge>
                </div>
              </div>
            )}

            {(editedUser.marketSegment === 'global_founder' || editedUser.professions.includes('Founder')) && (
              <>
                <div ref={founderEditorRef} className="space-y-6">
                  <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Founder Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">LinkedIn Profile</Label>
                      <Input value={editedUser.linkedInProfile || ''} onChange={(e) => setEditedUser({ ...editedUser, linkedInProfile: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Role In Startup</Label>
                      <Input value={editedUser.startupRole || ''} onChange={(e) => setEditedUser({ ...editedUser, startupRole: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="font-bold text-primary">Education</Label>
                      <Textarea value={editedUser.education || ''} onChange={(e) => setEditedUser({ ...editedUser, education: e.target.value })} className="min-h-[100px] rounded-xl" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="font-bold text-primary">Work Experience</Label>
                      <Textarea value={editedUser.workExperience || ''} onChange={(e) => setEditedUser({ ...editedUser, workExperience: e.target.value })} className="min-h-[100px] rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest">Co-Founder Details</h3>
                    <Button type="button" variant="outline" onClick={addCoFounder}>
                      <Plus className="w-4 h-4 mr-2" /> Add Co-Founder
                    </Button>
                  </div>

                  {(editedUser.coFounders || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-muted-foreground">
                      Add co-founders to keep the full founding team profile ready for startup applications.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(editedUser.coFounders || []).map((coFounder, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="font-semibold text-primary">Co-Founder {index + 1}</h4>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCoFounder(index)}>
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Full Name</Label>
                              <Input value={coFounder.fullName} onChange={(e) => updateCoFounder(index, 'fullName', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input value={coFounder.email} onChange={(e) => updateCoFounder(index, 'email', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Phone Number</Label>
                              <Input value={coFounder.phone} onChange={(e) => updateCoFounder(index, 'phone', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>LinkedIn Profile</Label>
                              <Input value={coFounder.linkedInProfile || ''} onChange={(e) => updateCoFounder(index, 'linkedInProfile', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label>Role In Startup</Label>
                              <Input value={coFounder.startupRole || ''} onChange={(e) => updateCoFounder(index, 'startupRole', e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Education</Label>
                              <Textarea value={coFounder.education || ''} onChange={(e) => updateCoFounder(index, 'education', e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Work Experience</Label>
                              <Textarea value={coFounder.workExperience || ''} onChange={(e) => updateCoFounder(index, 'workExperience', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Startup Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Startup Name</Label>
                      <Input value={editedUser.startupName || ''} onChange={(e) => setEditedUser({ ...editedUser, startupName: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Website</Label>
                      <Input value={editedUser.startupWebsite || ''} onChange={(e) => setEditedUser({ ...editedUser, startupWebsite: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Startup LinkedIn Profile</Label>
                      <Input value={editedUser.startupLinkedInProfile || ''} onChange={(e) => setEditedUser({ ...editedUser, startupLinkedInProfile: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Industry / Sector</Label>
                      <Input value={editedUser.industry || ''} onChange={(e) => setEditedUser({ ...editedUser, industry: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Stage</Label>
                      <Select value={editedUser.startupStage} onValueChange={(value) => setEditedUser({ ...editedUser, startupStage: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {STARTUP_STAGES.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Date of Incorporation</Label>
                      <Input type="date" value={editedUser.incorporationDate || ''} onChange={(e) => setEditedUser({ ...editedUser, incorporationDate: e.target.value })} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Company Type</Label>
                      <Select value={editedUser.companyType} onValueChange={(value) => setEditedUser({ ...editedUser, companyType: value })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select Company Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_TYPES.map((companyType) => <SelectItem key={companyType} value={companyType}>{companyType}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-8 border-t bg-white flex justify-end gap-4 sticky bottom-0">
            <Button variant="outline" onClick={() => setIsEditing(false)} className="h-12 px-8 rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={handleSave} className="h-12 px-8 rounded-xl font-bold gap-2 shadow-lg shadow-[#2F56C0]/30">
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm font-black text-primary">{value}</span>
  </div>
);

const DetailSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <Card className="p-8 space-y-6 dashboard-card">
    <h3 className="text-lg font-black text-primary flex items-center gap-2">
      {icon} {title}
    </h3>
    <div className="space-y-4">
      {children}
    </div>
  </Card>
);

const DetailItem = ({ label, value }: { label: string; value?: string }) => (
  <div className="space-y-1">
    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</span>
    <div className="text-sm font-bold text-primary break-words">{value || 'Not provided'}</div>
  </div>
);
