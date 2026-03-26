'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiMail, FiGlobe } from 'react-icons/fi';
import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/landing/Footer'; // Adjust import path if needed, Footer.tsx is in src/components/landing/
//import { useAuth } from '@/input_processing/auth_provider'; // Assuming auth provider exists or we pass null
// Actually LandingNavbar takes onLogin. Retrieve onLogin from context or pass a dummy one if it just redirects?
// In LandingPage.tsx, onLogin is passed from page.tsx.
// For these static pages, maybe we just redirect to home for login?
// Or we can duplicate the login logic?
// Let's check page.tsx again to see how strict onLogin is.
// Actually, I can just not pass onLogin if it's optional, or pass a function that redirects to /.

const PrivacyPolicy = () => {
    const router = useRouter();

    const handleLogin = () => {
        router.push('/signin');
    };

    const handleSignup = () => {
        router.push('/signup');
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <LandingNavbar onLogin={handleLogin} onSignup={handleSignup} />

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-24"> {/* Added padding-top for fixed navbar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-6 py-3 bg-white hover:bg-gray-50 rounded-lg transition-colors duration-200 border border-gray-200 text-gray-700 font-medium shadow-sm"
                    >
                        <FiArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </div>

                {/* Introduction */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h1 className="text-3xl font-bold text-slate-800 mb-4">Privacy Policy for SabApplier AI</h1>
                    <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
                        Effective Date: May 12, 2025
                    </div>
                    <p className="text-lg text-gray-700 leading-relaxed">
                        Welcome to SabApplier AI. Your privacy is of utmost importance to us. This Privacy Policy describes how we collect, use, disclose, and protect your information when you use our website, browser extension, and related services ("Services"). By accessing or using SabApplier AI, you agree to the terms of this Privacy Policy.
                    </p>
                </div>

                {/* Section 1 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">1</span>
                        Information We Collect
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-4">1.1 Personal Information You Provide</h3>
                            <p className="text-gray-600 mb-4">When you use SabApplier AI, we may collect the following types of personally identifiable information ("Personal Information"):</p>
                            <ul className="space-y-2 text-gray-600">
                                {[
                                    "Full name",
                                    "Email address",
                                    "Phone number",
                                    "Government ID details (e.g., Aadhaar card, PAN card)",
                                    "Educational documents (e.g., 10th, 12th, graduation certificates)",
                                    "Residential address",
                                    "Profile photo, scanned signatures",
                                    "Documents and data you upload to complete forms",
                                    "Login credentials (only securely encrypted if stored)"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-4">1.2 Information Collected Automatically</h3>
                            <p className="text-gray-600 mb-4">When you access our Services, we may automatically collect:</p>
                            <ul className="space-y-2 text-gray-600">
                                {[
                                    "Device information (IP address, browser type, OS)",
                                    "Usage data (pages visited, features used, timestamps)",
                                    "Interaction data (form fields detected, data filled, error logs)"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-4">1.3 Information from Third Parties</h3>
                            <p className="text-gray-600">We may receive information about you from third-party services like authentication providers, analytics tools, or government portals integrated with our service.</p>
                        </div>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">2</span>
                        How We Use Your Information
                    </h2>
                    <p className="text-gray-600 mb-4">We use your information to:</p>
                    <ul className="space-y-2 text-gray-600">
                        {[
                            "Autofill and manage complex application forms",
                            "Store and organize your documents securely",
                            "Improve accuracy and performance of form-filling using AI",
                            "Send you notifications about deadlines, form progress, and updates",
                            "Provide customer support and resolve issues",
                            "Conduct research and improve our Services",
                            "Comply with legal obligations"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Section 3 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">3</span>
                        Human-in-the-Loop
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                        SabApplier AI uses a human-in-the-loop approach, where certain decisions or entries are reviewed manually (with your consent or action) to ensure accuracy and relevance in forms. This may involve temporary viewing of your data by authorized personnel for assistance or verification.
                    </p>
                </div>

                {/* Section 4 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">4</span>
                        Sharing of Information
                    </h2>
                    <p className="text-gray-600 mb-4">We do not sell your personal data. However, we may share your information in the following situations:</p>
                    <ul className="space-y-2 text-gray-600">
                        {[
                            "With trusted third-party services: For hosting, analytics (e.g., Google Analytics), payment processing, and form-submission integrations.",
                            "With your consent: When you allow us to share your data with a third-party (e.g., to submit a government or exam application).",
                            "Legal obligations: To comply with applicable laws, regulations, court orders, or law enforcement requests.",
                            "Business transfers: In case of a merger, acquisition, or asset sale, we may transfer your data."
                        ].map((item, i) => (
                            <li key={i} className="flex items-start">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Section 5 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">5</span>
                        Data Storage and Security
                    </h2>
                    <ul className="space-y-2 text-gray-600">
                        {[
                            "Your documents and personal data are encrypted in transit (HTTPS) and at rest.",
                            "Only authorized personnel have access to sensitive data, strictly on a need-to-know basis.",
                            "We employ industry-standard security practices, including firewalls, encryption, and access controls.",
                            "You may request deletion of your data at any time."
                        ].map((item, i) => (
                            <li key={i} className="flex items-start">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Section 6 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">6</span>
                        International Data Transfer
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                        As we operate globally, your data may be processed or stored in countries outside your own. We ensure adequate safeguards are in place as per applicable data protection laws (e.g., GDPR if you're in the EU).
                    </p>
                </div>

                {/* Section 7 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">7</span>
                        Your Rights
                    </h2>
                    <p className="text-gray-600 mb-4">Depending on your location, you may have the following rights:</p>
                    <ul className="space-y-2 text-gray-600">
                        {[
                            "Access: You can request a copy of your stored data.",
                            "Correction: You may update inaccurate information.",
                            "Deletion: You may request permanent deletion of your account and data.",
                            "Objection/Restriction: You may object to certain data uses or restrict processing.",
                            "Portability: You can request export of your data in machine-readable format."
                        ].map((item, i) => (
                            <li key={i} className="flex items-start">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                    <p className="text-gray-600 mt-4">Contact us at <a href="mailto:sabapplierai100m@gmail.com" className="text-blue-600 hover:underline">sabapplierai100m@gmail.com</a> to exercise any of these rights.</p>
                </div>

                {/* Section 8 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">8</span>
                        Cookies and Tracking Technologies
                    </h2>
                    <p className="text-gray-600 mb-4">We use cookies and similar tools for:</p>
                    <ul className="space-y-2 text-gray-600">
                        {["Authentication", "Session tracking", "Analytics and performance", "Remembering preferences"].map((item, i) => (
                            <li key={i} className="flex items-start">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {item}
                            </li>
                        ))}
                    </ul>
                    <p className="text-gray-600 mt-4">You can control or disable cookies via your browser settings.</p>
                </div>

                {/* Section 9 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">9</span>
                        Marketing and Communication
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                        By signing up, you agree to receive service-related emails and reminders. You may also receive promotional emails and updates. You can opt out anytime via the unsubscribe link or by contacting us.
                    </p>
                </div>

                {/* Section 10 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">10</span>
                        Children's Privacy
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                        Our services are not directed to children under 13 (or under 16 in certain jurisdictions). We do not knowingly collect data from minors without parental consent.
                    </p>
                </div>

                {/* Section 11 */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">11</span>
                        Changes to This Privacy Policy
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                        We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised "Effective Date." We encourage you to review it periodically.
                    </p>
                </div>

                {/* Section 12 - Contact */}
                <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold mr-4">12</span>
                        Contact Us
                    </h2>
                    <p className="text-gray-600 mb-6">
                        If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact us at:
                    </p>

                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">SabApplier AI</h3>
                        <div className="space-y-3">
                            <div className="flex items-center text-gray-700">
                                <FiMail className="w-5 h-5 mr-3 text-blue-600" />
                                <span>Email: <a href="mailto:sabapplierai100m@gmail.com" className="text-blue-700 font-medium hover:underline">sabapplierai100m@gmail.com</a></span>
                            </div>
                            <div className="flex items-center text-gray-700">
                                <FiGlobe className="w-5 h-5 mr-3 text-blue-600" />
                                <span>Website: <a href="https://sabapplier.com" className="text-blue-700 font-medium hover:underline">https://sabapplier.com</a></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white text-center shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Need More Information?</h3>
                    <p className="text-blue-100 mb-6">
                        Explore our other resources to learn more about how we protect your data.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 border border-white/20 font-medium backdrop-blur-sm"
                        >
                            <FiArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Link>
                        <a
                            href="mailto:sabapplierai100m@gmail.com"
                            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium shadow-lg hover:shadow-xl"
                        >
                            <FiMail className="w-4 h-4 mr-2" />
                            Contact Support
                        </a>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PrivacyPolicy;
