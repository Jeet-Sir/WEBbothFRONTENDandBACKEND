'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    FiDownload,
    FiZap,
    FiShield,
    FiFileText
} from 'react-icons/fi';
import Image from 'next/image';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
    <motion.div
        className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-gray-100 group relative overflow-hidden h-80 flex flex-col"
        whileHover={{
            borderColor: '#22c55e',
            backgroundColor: '#f0fdf4',
            scale: 1.02
        }}
        transition={{ duration: 0.3 }}
    >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500"></div>

        <div className="relative z-10 flex flex-col h-full items-center justify-center text-center">
            <motion.div
                className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white text-xl shadow-lg transition-all duration-300 mb-4"
                whileHover={{
                    scale: 1.1,
                    backgroundColor: '#22c55e',
                    boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)'
                }}
            >
                {icon}
            </motion.div>
            <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-green-700 transition-colors duration-300">{title}</h3>
            <p className="text-gray-600 leading-relaxed text-base">{description}</p>
        </div>

        {/* Hover effect border - green */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-green-400 transition-all duration-300"></div>
    </motion.div>
);

const Features: React.FC = () => {
    const router = useRouter();

    const features = [
        {
            icon: <FiDownload />,
            title: "Upload Once",
            description: "Store your documents once and use them for every application.",
            category: 'document-vault'
        },
        {
            icon: <FiZap />,
            title: "Auto-Fill Forms",
            description: "Forms fill automatically in seconds, saving you hours.",
            category: 'opportunity-seeker'
        },
        {
            icon: <FiShield />,
            title: "Secure Storage",
            description: "Your data stays private and encrypted, always under your control.",
            category: 'profession'
        },
        {
            icon: <FiFileText />,
            title: "Works Everywhere",
            description: "Compatible with all major exam portals and job application forms.",
            category: 'create-folder'
        }
    ];

    // Note: Since this is the landing page, we might just want to redirect to login/dashboard
    // instead of specific internal routes if the user is not logged in.
    // But for now, we'll keep the intent.
    const handleFeatureClick = (category: string) => {
        console.log(`Clicked feature: ${category}`);
        // You might want to trigger login modal here instead if not authenticated
    };

    const logos = [
        { src: '/assets/IBPS_LOGO.jpg', name: 'IBPS', alt: 'IBPS Logo' },
        { src: '/assets/Staff_Selection_Commission.jpg', name: 'SSC', alt: 'Staff Selection Commission Logo' },
        { src: '/assets/Union_public_service_commission.jpg', name: 'UPSC', alt: 'Union Public Service Commission Logo' },
        { src: '/assets/microsoftform.jpg', name: 'Microsoft Forms', alt: 'Microsoft Forms Logo' },
        { src: '/assets/rrbform.jpg', name: 'RRB', alt: 'RRB Forms Logo' },
        { src: '/assets/zohoform.jpg', name: 'Zoho Forms', alt: 'Zoho Forms Logo' },
        { src: '/assets/googleform.jpg', name: 'Google Forms', alt: 'Google Forms Logo' },
    ];

    return (
        <section id="features" className="py-12 bg-white relative overflow-hidden">
            <div className="relative max-w-7xl mx-auto px-4 pb-12 lg:px-6">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-200/50 rounded-full text-sm font-semibold text-blue-700 mb-6 backdrop-blur-sm">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Features
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 to-blue-700 bg-clip-text text-transparent mb-6 leading-tight">
                        Apply faster, without the hassle
                    </h2>
                    <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                        Save hours on every application with secure, automated form filling.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="transform hover:-translate-y-2 transition-transform duration-300 cursor-pointer"
                            onClick={() => handleFeatureClick(feature.category)}
                        >
                            <FeatureCard
                                icon={feature.icon}
                                title={feature.title}
                                description={feature.description}
                            />
                        </div>
                    ))}
                </div>

                {/* Supported Platforms/Forms Section */}
                <div className="mt-16 pt-12 border-t border-gray-200">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-8"
                    >
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                            Supported Platforms & Forms
                        </h3>
                        <p className="text-gray-600">
                            SabApplier AI works seamlessly with these platforms
                        </p>
                    </motion.div>

                    {/* Logo Carousel Container */}
                    <div className="relative overflow-hidden py-4">
                        {/* Gradient overlays for smooth fade effect */}
                        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white via-white to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white via-white to-transparent z-10 pointer-events-none"></div>

                        {/* Animated Logo Row */}
                        <motion.div
                            className="flex gap-12 items-center"
                            animate={{
                                x: [0, -176 * 7], // 176px per logo (128px width + 48px gap) * 7 logos
                            }}
                            transition={{
                                x: {
                                    repeat: Infinity,
                                    repeatType: "loop",
                                    duration: 25,
                                    ease: "linear",
                                },
                            }}
                        >
                            {/* Multiple sets for seamless infinite scroll */}
                            {[...Array(2)].map((_, setIndex) => (
                                <React.Fragment key={setIndex}>
                                    {logos.map((logo, index) => (
                                        <motion.div
                                            key={`set-${setIndex}-${index}`}
                                            className="flex-shrink-0 flex flex-col items-center justify-center"
                                            whileHover={{ scale: 1.1, y: -5 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="w-32 h-32 bg-white rounded-xl shadow-md p-4 flex items-center justify-center border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                                                <Image
                                                    src={logo.src}
                                                    alt={logo.alt}
                                                    fill
                                                    className="object-contain p-2"
                                                />
                                            </div>
                                            <p className="mt-2 text-xs font-medium text-gray-600">{logo.name}</p>
                                        </motion.div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;
