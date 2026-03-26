"use client";

import React, { useEffect } from 'react';
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
  COUNTRY_OPTIONS,
  STARTUP_STAGES,
  COMPANY_TYPES,
  getCountryLabel,
} from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft, Check, Globe2, Plus, Trash2 } from 'lucide-react';

interface OnboardingWizardProps {
  userId: string;
  authToken: string;
  user: UserProfile;
  saveUser: (user: UserProfile) => void;
}

function detectCountryCode(): string {
  if (typeof window === 'undefined') return '';

  const supportedCountryCodes = new Set(COUNTRY_OPTIONS.map((country) => country.code));
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language].filter(Boolean);

  for (const locale of locales) {
    const region = locale.split(/[-_]/)[1]?.toUpperCase();
    if (region && supportedCountryCodes.has(region)) {
      return region;
    }
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone === 'Asia/Kolkata') {
      return 'IN';
    }
  } catch {
    // Ignore browser locale detection failures.
  }

  return '';
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

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, saveUser }) => {
  const [localUser, setLocalUser] = React.useState<UserProfile>({
    ...user,
    coFounders: user.coFounders || [],
  });
  const [selectedCountryCode, setSelectedCountryCode] = React.useState(user.countryCode || '');

  useEffect(() => {
    setLocalUser({
      ...user,
      coFounders: user.coFounders || [],
    });
    setSelectedCountryCode(user.countryCode || detectCountryCode());
  }, [user]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const { userId: _u1, googleId: _g1, createdAt: _c1, updatedAt: _up1, ...localRest } = localUser as any;
      const { userId: _u2, googleId: _g2, createdAt: _c2, updatedAt: _up2, ...propRest } = user as any;

      if (JSON.stringify(localRest) !== JSON.stringify(propRest)) {
        saveUser(localUser);
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [localUser, saveUser, user]);

  const isMarketConfirmed = Boolean(localUser.countryCode && localUser.marketSegment);
  const isGlobalFounder = localUser.marketSegment === 'global_founder';
  const hasFounderStep = isGlobalFounder || localUser.professions?.includes('Founder');
  const stepOrder = isGlobalFounder
    ? ['basic', 'founder']
    : hasFounderStep
      ? ['basic', 'identity', 'geography', 'founder']
      : ['basic', 'identity', 'geography'];
  const TOTAL_STEPS = stepOrder.length;
  const currentStep = Math.min(localUser.onboardingStep || 1, TOTAL_STEPS);
  const currentStepKey = stepOrder[currentStep - 1];
  const progress = (currentStep / TOTAL_STEPS) * 100;

  const handleChange = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    setLocalUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfessionChange = (profession: Profession) => {
    if (isGlobalFounder) return;

    const current = [...(localUser.professions || [])];
    const nextProfessions = current.includes(profession)
      ? current.filter((value) => value !== profession)
      : current.length < 3
        ? [...current, profession]
        : current;

    setLocalUser((prev) => ({
      ...prev,
      professions: nextProfessions,
      onboardingStep: Math.min(prev.onboardingStep || 1, profession === 'Founder' || nextProfessions.includes('Founder') ? 4 : 3),
    }));
  };

  const updateCoFounder = (index: number, field: keyof CoFounderProfile, value: string) => {
    const current = [...(localUser.coFounders || [])];
    current[index] = {
      ...current[index],
      [field]: value,
    };
    handleChange('coFounders', current);
  };

  const addCoFounder = () => {
    handleChange('coFounders', [...(localUser.coFounders || []), createEmptyCoFounder()]);
  };

  const removeCoFounder = (index: number) => {
    handleChange('coFounders', (localUser.coFounders || []).filter((_, currentIndex) => currentIndex !== index));
  };

  const validateStep = () => {
    const profile = localUser;

    if (currentStepKey === 'basic') {
      if (isGlobalFounder) {
        return Boolean(profile.firstName && profile.lastName && profile.phone && profile.permanentAddress && profile.countryCode);
      }

      return Boolean(profile.firstName && profile.lastName && profile.dob && profile.phone && profile.permanentAddress);
    }

    if (currentStepKey === 'identity') {
      return Boolean(profile.gender && profile.motherTongue && profile.professions && profile.professions.length > 0);
    }

    if (currentStepKey === 'geography') {
      return Boolean(profile.nationality && profile.domicileState && profile.district && profile.pincode);
    }

    if (currentStepKey === 'founder') {
      return Boolean(profile.startupName && profile.industry && profile.startupStage);
    }

    return false;
  };

  const isStepValid = validateStep();

  const handleMarketConfirm = () => {
    if (!selectedCountryCode) return;

    const nextMarketSegment = selectedCountryCode === 'IN' ? 'india' : 'global_founder';
    const nextUser: UserProfile = {
      ...localUser,
      countryCode: selectedCountryCode,
      marketSegment: nextMarketSegment,
      onboardingStep: 1,
      professions: nextMarketSegment === 'global_founder' ? ['Founder'] : localUser.professions || [],
      coFounders: localUser.coFounders || [],
    };

    setLocalUser(nextUser);
    saveUser(nextUser);
  };

  const handleNext = () => {
    const nextStep = currentStep < TOTAL_STEPS ? currentStep + 1 : currentStep;
    const isComplete = currentStep === TOTAL_STEPS;
    const nextUser: UserProfile = {
      ...localUser,
      professions: isGlobalFounder ? ['Founder'] : localUser.professions,
      onboardingStep: nextStep,
      onboardingComplete: isComplete ? true : localUser.onboardingComplete,
    };

    setLocalUser(nextUser);
    saveUser(nextUser);
  };

  const handleBack = () => {
    if (currentStep <= 1) return;

    const previousUser: UserProfile = {
      ...localUser,
      onboardingStep: currentStep - 1,
    };

    setLocalUser(previousUser);
    saveUser(previousUser);
  };

  if (!isMarketConfirmed) {
    const detectedCountry = selectedCountryCode ? getCountryLabel(selectedCountryCode) : 'Not detected';

    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 border-border shadow-xl space-y-8">
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Globe2 className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-black text-primary tracking-tight">Confirm Your Country</h1>
              <p className="text-muted-foreground">
                We will tailor your onboarding and default vault based on your country. India keeps the current broader flow. All other countries use the founder-focused global flow.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Your Country</Label>
              <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Browser guess: {detectedCountry}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <p>
                <span className="font-semibold">India:</span> student, opportunity, government, exam, and founder-focused onboarding.
              </p>
              <p>
                <span className="font-semibold">Outside India:</span> streamlined founder-only onboarding and founder-only default documents.
              </p>
            </div>

            <Button disabled={!selectedCountryCode} onClick={handleMarketConfirm} className="w-full h-12 shadow-lg shadow-primary/20">
              Continue <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-black text-primary tracking-tight">Complete Your Profile</h1>
          <p className="text-muted-foreground font-medium">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
          <Progress value={progress} className="h-2 w-full max-w-md mx-auto" />
          <p className="text-xs text-muted-foreground">
            {localUser.marketSegment === 'india' ? 'India flow' : 'Global founder flow'} for {getCountryLabel(localUser.countryCode)}
          </p>
        </div>

        <Card className="p-8 border-border shadow-xl">
          {currentStepKey === 'basic' && (
            isGlobalFounder ? (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-primary">Basic Founder Profile</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        placeholder="First Name"
                        value={localUser.firstName || ''}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        placeholder="Last Name"
                        value={localUser.lastName || ''}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={localUser.email || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <Input
                        placeholder="+1"
                        value={localUser.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Country</Label>
                      <Input value={getCountryLabel(localUser.countryCode)} disabled />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Address *</Label>
                  <Textarea
                    placeholder="Street, city, region, postal code"
                    value={localUser.permanentAddress || ''}
                    onChange={(e) => handleChange('permanentAddress', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-primary">Basic Bio & Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        placeholder="First Name"
                        value={localUser.firstName || ''}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        placeholder="Last Name"
                        value={localUser.lastName || ''}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date of Birth *</Label>
                      <Input
                        type="date"
                        value={localUser.dob || ''}
                        onChange={(e) => handleChange('dob', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <Input
                        placeholder="+91"
                        value={localUser.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-primary">Parents Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Father's Name</Label>
                      <Input
                        placeholder="Father's Name"
                        value={localUser.fatherName || ''}
                        onChange={(e) => handleChange('fatherName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mother's Name</Label>
                      <Input
                        placeholder="Mother's Name"
                        value={localUser.motherName || ''}
                        onChange={(e) => handleChange('motherName', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Permanent Address *</Label>
                  <Textarea
                    placeholder="Street, City, Building..."
                    value={localUser.permanentAddress || ''}
                    onChange={(e) => handleChange('permanentAddress', e.target.value)}
                  />
                </div>
              </div>
            )
          )}

          {currentStepKey === 'identity' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-primary">Identity & Profession</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={localUser.gender} onValueChange={(value) => handleChange('gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mother Tongue *</Label>
                    <Select value={localUser.motherTongue} onValueChange={(value) => handleChange('motherTongue', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Education Qualification</Label>
                <Select value={localUser.highestQualification} onValueChange={(value) => handleChange('highestQualification', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Qualification" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALIFICATIONS.map((qualification) => (
                      <SelectItem key={qualification} value={qualification}>
                        {qualification}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Profession (Select up to 3) *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['Student', 'Professional', 'Founder', 'Researcher', 'Other'] as Profession[]).map((profession) => (
                    <Button
                      key={profession}
                      type="button"
                      variant={localUser.professions?.includes(profession) ? 'default' : 'outline'}
                      className="justify-between px-4 h-14 rounded-xl"
                      onClick={() => handleProfessionChange(profession)}
                    >
                      {profession}
                      {localUser.professions?.includes(profession) && <Check className="w-4 h-4" />}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStepKey === 'geography' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-primary">Social & Geographic</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Social Category</Label>
                    <Select value={localUser.socialCategory} onValueChange={(value) => handleChange('socialCategory', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Religion</Label>
                    <Select value={localUser.religion} onValueChange={(value) => handleChange('religion', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Religion" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELIGIONS.map((religion) => (
                          <SelectItem key={religion} value={religion}>
                            {religion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Marital Status</Label>
                    <Select value={localUser.maritalStatus} onValueChange={(value) => handleChange('maritalStatus', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Marital Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Disability Status</Label>
                    <Select value={localUser.disabilityStatus} onValueChange={(value) => handleChange('disabilityStatus', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISABILITY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nationality *</Label>
                  <Input
                    placeholder="Indian"
                    value={localUser.nationality || ''}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Domicile State *</Label>
                  <Select value={localUser.domicileState} onValueChange={(value) => handleChange('domicileState', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>District *</Label>
                  <Input
                    placeholder="District"
                    value={localUser.district || ''}
                    onChange={(e) => handleChange('district', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mandal</Label>
                  <Input
                    placeholder="Mandal"
                    value={localUser.mandal || ''}
                    onChange={(e) => handleChange('mandal', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pincode *</Label>
                  <Input
                    placeholder="6-digit PIN"
                    maxLength={6}
                    value={localUser.pincode || ''}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStepKey === 'founder' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-primary">Founder Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={`${localUser.firstName || ''} ${localUser.lastName || ''}`.trim()} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={localUser.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={localUser.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn Profile</Label>
                    <Input
                      placeholder="https://linkedin.com/in/your-profile"
                      value={localUser.linkedInProfile || ''}
                      onChange={(e) => handleChange('linkedInProfile', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Role In Startup</Label>
                    <Input
                      placeholder="CEO, CTO, Founder, Product Lead"
                      value={localUser.startupRole || ''}
                      onChange={(e) => handleChange('startupRole', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Education</Label>
                    <Textarea
                      placeholder="Degrees, institutions, certifications"
                      value={localUser.education || ''}
                      onChange={(e) => handleChange('education', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Work Experience</Label>
                    <Textarea
                      placeholder="Relevant companies, roles, domain experience"
                      value={localUser.workExperience || ''}
                      onChange={(e) => handleChange('workExperience', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-primary">Co-Founder Details</h3>
                  <Button type="button" variant="outline" onClick={addCoFounder}>
                    <Plus className="w-4 h-4 mr-2" /> Add Co-Founder
                  </Button>
                </div>

                {(localUser.coFounders || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
                    Add co-founders if you want to store the core startup team profile now.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(localUser.coFounders || []).map((coFounder, index) => (
                      <div key={index} className="rounded-2xl border border-slate-200 p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-primary">Co-Founder {index + 1}</h4>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeCoFounder(index)}>
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Role In Startup</Label>
                            <Input value={coFounder.startupRole || ''} onChange={(e) => updateCoFounder(index, 'startupRole', e.target.value)} />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Education</Label>
                            <Textarea value={coFounder.education || ''} onChange={(e) => updateCoFounder(index, 'education', e.target.value)} />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Work Experience</Label>
                            <Textarea value={coFounder.workExperience || ''} onChange={(e) => updateCoFounder(index, 'workExperience', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-primary">Startup Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Startup Name *</Label>
                    <Input
                      placeholder="Startup Name"
                      value={localUser.startupName || ''}
                      onChange={(e) => handleChange('startupName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      placeholder="https://yourstartup.com"
                      value={localUser.startupWebsite || ''}
                      onChange={(e) => handleChange('startupWebsite', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Startup LinkedIn Profile</Label>
                    <Input
                      placeholder="https://linkedin.com/company/your-startup"
                      value={localUser.startupLinkedInProfile || ''}
                      onChange={(e) => handleChange('startupLinkedInProfile', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry / Sector *</Label>
                    <Input
                      placeholder="Fintech, Healthtech, SaaS"
                      value={localUser.industry || ''}
                      onChange={(e) => handleChange('industry', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stage *</Label>
                    <Select value={localUser.startupStage} onValueChange={(value) => handleChange('startupStage', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {STARTUP_STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Incorporation</Label>
                    <Input
                      type="date"
                      value={localUser.incorporationDate || ''}
                      onChange={(e) => handleChange('incorporationDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Type</Label>
                    <Select value={localUser.companyType} onValueChange={(value) => handleChange('companyType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Company Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_TYPES.map((companyType) => (
                          <SelectItem key={companyType} value={companyType}>
                            {companyType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 flex gap-4 pt-6 border-t">
            {currentStep > 1 && (
              <Button variant="ghost" onClick={handleBack} className="flex-1 h-12">
                <ChevronLeft className="mr-2 w-4 h-4" /> Back
              </Button>
            )}
            <Button
              disabled={!isStepValid}
              onClick={handleNext}
              className="flex-[2] h-12 shadow-lg shadow-primary/20"
            >
              {currentStep === TOTAL_STEPS ? 'Complete Profile' : 'Continue'} <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
