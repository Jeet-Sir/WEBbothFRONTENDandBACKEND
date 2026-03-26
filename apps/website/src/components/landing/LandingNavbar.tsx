'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

interface LandingNavbarProps {
    onLogin: () => void;
    onSignup: () => void;
}

const LandingNavbar: React.FC<LandingNavbarProps> = ({ onLogin, onSignup }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId: string) => {
        if (pathname !== '/') {
            router.push(`/#${sectionId}`);
            setIsMenuOpen(false);
            return;
        }

        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        setIsMenuOpen(false);
    };

    return (
        <header
            className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled
                ? 'bg-gray-900/95 backdrop-blur-md shadow-lg py-2 border-b border-white/10'
                : 'bg-gray-900 py-2 border-b border-white/10'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo Section */}
                    <Link href="/" className="flex items-center gap-3 group transition-all duration-300 hover:scale-105">
                        <div className="relative w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-lg border-2 border-[#c5d3f7]/60 group-hover:border-[#d4dfff]/80 transition-all duration-300 overflow-hidden">
                            <Image
                                src="/logo.jpeg"
                                alt="SabApplier AI"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                SabApplier
                                <span className="text-[#d2ddff] ml-1 font-extrabold">AI</span>
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <button
                            onClick={() => scrollToSection('how-it-works')}
                            className="text-white/90 hover:text-[#d2ddff] font-medium transition-all duration-300 hover:scale-105 relative group"
                        >
                            How it Works
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d2ddff] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => scrollToSection('features')}
                            className="text-white/90 hover:text-[#d2ddff] font-medium transition-all duration-300 hover:scale-105 relative group"
                        >
                            Features
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d2ddff] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <button
                            onClick={() => scrollToSection('testimonials')}
                            className="text-white/90 hover:text-[#d2ddff] font-medium transition-all duration-300 hover:scale-105 relative group"
                        >
                            Reviews
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d2ddff] transition-all duration-300 group-hover:w-full"></span>
                        </button>
                        <Link
                            href="/blog"
                            className="text-white/90 hover:text-[#d2ddff] font-medium transition-all duration-300 hover:scale-105 relative group"
                        >
                            Blog
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d2ddff] transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                        <Link
                            href="/privacy-policy"
                            className="text-white/90 hover:text-[#d2ddff] font-medium transition-all duration-300 hover:scale-105 relative group"
                        >
                            Privacy
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d2ddff] transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                    </nav>

                    {/* Desktop CTA Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={onLogin}
                            className="px-5 py-2.5 text-white border border-white/30 rounded-lg font-semibold text-sm transition-all duration-300 hover:bg-white/10 hover:border-[#d2ddff]/60 hover:shadow-md backdrop-blur-sm"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={onSignup}
                            className="px-6 py-2.5 bg-gradient-to-r from-[#3f67d1] to-[#2F56C0] text-white rounded-lg font-semibold text-sm transition-all duration-300 hover:from-[#345fcf] hover:to-[#284aa8] hover:scale-105 hover:shadow-lg hover:shadow-[#2F56C0]/30 border border-[#7b98de]/40"
                        >
                            Get Started Free
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="fixed top-20 right-4 w-64 bg-[#2F56C0]/95 border border-white/15 shadow-xl backdrop-blur-md rounded-2xl z-50 overflow-hidden transform origin-top-right transition-all duration-300">
                        <div className="px-4 py-6 space-y-4">
                            <button
                                onClick={() => scrollToSection('features')}
                                className="block text-white/90 hover:text-[#d2ddff] font-medium py-2 transition-colors duration-300 w-full text-left"
                            >
                                Features
                            </button>
                            <button
                                onClick={() => scrollToSection('how-it-works')}
                                className="block text-white/90 hover:text-[#d2ddff] font-medium py-2 transition-colors duration-300 w-full text-left"
                            >
                                How it Works
                            </button>
                            <Link
                                href="/privacy-policy"
                                className="block text-white/90 hover:text-[#d2ddff] font-medium py-2 transition-colors duration-300 w-full text-left"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Privacy Policy
                            </Link>
                            <button
                                onClick={() => scrollToSection('testimonials')}
                                className="block text-white/90 hover:text-[#d2ddff] font-medium py-2 transition-colors duration-300 w-full text-left"
                            >
                                Reviews
                            </button>
                            <Link
                                href="/blog"
                                className="block text-white/90 hover:text-[#d2ddff] font-medium py-2 transition-colors duration-300 w-full text-left"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Blog
                            </Link>

                            <div className="pt-4 border-t border-white/10 space-y-3">
                                <button
                                    onClick={() => { setIsMenuOpen(false); onLogin(); }}
                                    className="block w-full text-center px-4 py-3 text-white border border-white/30 rounded-lg font-semibold text-sm transition-all duration-300 hover:bg-white/10"
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => { setIsMenuOpen(false); onSignup(); }}
                                    className="block w-full text-center px-4 py-3 bg-gradient-to-r from-[#3f67d1] to-[#2F56C0] text-white rounded-lg font-semibold text-sm transition-all duration-300 hover:from-[#345fcf] hover:to-[#284aa8]"
                                >
                                    Get Started Free
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default LandingNavbar;
