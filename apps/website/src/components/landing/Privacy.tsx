'use client';

import React from 'react';
import Link from 'next/link';
import { FiLock, FiCheck, FiUser, FiShield } from 'react-icons/fi';

interface PrivacyCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const PrivacyCard: React.FC<PrivacyCardProps> = ({ icon, title, description }) => (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-gray-100 hover:border-blue-200 group relative overflow-hidden h-80 flex flex-col">{/* Fixed height h-80 for uniform cards */}
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>

        <div className="relative z-10 flex flex-col h-full">
            <div className="text-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-3 text-white text-xl shadow-lg group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-blue-500/30 transition-all duration-300">
                    {icon}
                </div>
            </div>

            <div className="flex-1 flex flex-col text-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 mb-4 group-hover:text-blue-700 transition-colors duration-300 leading-tight">{title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm mt-auto">{description}</p>
            </div>
        </div>

        {/* Hover effect border */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-200/50 transition-all duration-300"></div>
    </div>
);

const Privacy: React.FC = () => {
    return (
        <section id="privacy" className="py-12 bg-white relative overflow-hidden">
            <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-200/50 rounded-full text-sm font-semibold text-blue-700 mb-6 backdrop-blur-sm">
                        <FiShield className="w-4 h-4 mr-2" />
                        Privacy & Security
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 to-blue-700 bg-clip-text text-transparent mb-6 leading-tight">
                        Your Privacy is Our Priority
                    </h2>
                    <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                        Bank-level security and complete privacy protection for all your personal data.
                    </p>
                </div>

                {/* Privacy Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <PrivacyCard
                        icon={<FiLock />}
                        title="End-to-End Encryption"
                        description="Military-grade encryption protects your documents and personal data before leaving your device."
                    />

                    <PrivacyCard
                        icon={<FiCheck />}
                        title="Zero-Knowledge Architecture"
                        description="Our system ensures even we cannot access your personal information. Only you hold the keys."
                    />

                    <PrivacyCard
                        icon={<FiUser />}
                        title="Complete User Control"
                        description="Delete data anytime, control information sharing, and decide exactly how your data is used."
                    />

                    <PrivacyCard
                        icon={<FiShield />}
                        title="Private by Design"
                        description="Your data never leaves your control. We can't see, access, or sell your information - guaranteed."
                    />
                </div>

                {/* Your Data, Your Rights Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">Your Data, Your Rights</h3>
                    <div className="flex flex-wrap justify-center gap-4 mb-6">
                        <span className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all duration-300">
                            Right to Access
                        </span>
                        <span className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all duration-300">
                            Right to Rectification
                        </span>
                        <span className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all duration-300">
                            Right to Erasure
                        </span>
                        <span className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all duration-300">
                            Right to Portability
                        </span>
                        <span className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all duration-300">
                            Right to Object
                        </span>
                        <span className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all duration-300">
                            Right to Restrict Processing
                        </span>
                    </div>

                    {/* Read Full Privacy Policy Button */}
                    <div className="text-center">
                        <Link
                            href="/privacy-policy"
                            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 border border-blue-400/30"
                        >
                            <FiShield className="w-5 h-5 mr-2" />
                            Read Full Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Privacy;
