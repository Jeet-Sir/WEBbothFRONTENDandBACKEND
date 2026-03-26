"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { DashboardTab, UserProfile } from '@/lib/types';
import { LogOut, Home, FileText, Share2, User, Menu, ChevronDown, Activity } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface NavbarProps {
  user: UserProfile;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const userInitial = user.firstName?.[0] || user.fullName?.[0] || 'U';

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user.avatarUrl]);

  const tabs: Array<{
    key: DashboardTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    { key: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { key: 'activity', label: 'My Activity', icon: <Activity className="w-4 h-4" /> },
    { key: 'documents', label: 'Vault', icon: <FileText className="w-4 h-4" /> },
    { key: 'sharing', label: 'Sharing', icon: <Share2 className="w-4 h-4" /> },
    { key: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <nav className="glass-nav text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-white/30 bg-white/10 shadow-lg">
              <Image
                src="/logo.jpeg"
                alt="SabApplier AI"
                fill
                className="object-cover"
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-[18px] font-black tracking-tight leading-none">SABAPPLIER</div>
              <div className="text-[10px] text-[#d2ddff] font-bold tracking-widest uppercase mt-1">Identity Vault</div>
            </div>
          </div>

          <div className="hidden md:flex gap-2 p-1.5 rounded-xl bg-white/8 border border-white/10 backdrop-blur-sm">
            {tabs.map((tab) => (
              <NavButton
                key={tab.key}
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden w-10 h-10 bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-gradient-to-b from-[#2F56C0] to-[#284aa8] text-white border-white/10">
              <SheetHeader>
                <SheetTitle className="text-white">Menu</SheetTitle>
                <SheetDescription className="text-white/70">
                  Navigate to Home, My Activity, Vault, Sharing, and Profile.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-3">
                {tabs.map((tab) => (
                  <NavButton
                    key={`mobile-${tab.key}`}
                    active={activeTab === tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setIsMobileMenuOpen(false);
                    }}
                    icon={tab.icon}
                    label={tab.label}
                    className="w-full justify-start"
                  />
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl bg-white/10 border border-white/15">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black overflow-hidden">
              {user.avatarUrl && !avatarLoadFailed ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                userInitial
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-bold leading-none">{user.fullName}</div>
              <div className="text-[10px] opacity-70 uppercase font-bold tracking-tighter mt-1">
                {user.professions.join(' • ') || 'Identity User'}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-10 px-3 bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-105"
                title="Account options"
              >
                <LogOut className="w-4 h-4" />
                <ChevronDown className="w-4 h-4 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#c5d3f7]">
              <DropdownMenuItem
                className="font-semibold text-[#1f3f87] focus:bg-[#eef2ff] focus:text-[#1f3f87]"
                onClick={() => setActiveTab('profile')}
              >
                <User className="w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="font-semibold text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

const NavButton = ({
  active,
  onClick,
  icon,
  label,
  className,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-bold text-sm border ${className ?? ''} ${
      active
        ? 'bg-white text-[#1f3f87] border-white/70 shadow-[0_8px_16px_rgba(17,24,39,0.2)]'
        : 'text-white/80 border-transparent hover:text-white hover:bg-white/12 hover:border-white/25'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    {icon}
    {label}
  </button>
);
