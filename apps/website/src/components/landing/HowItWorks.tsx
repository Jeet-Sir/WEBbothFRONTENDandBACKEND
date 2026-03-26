'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { FaFileAlt, FaLink, FaCheck, FaRobot } from 'react-icons/fa';

interface HowItWorksStepProps {
    stepNumber: number;
    icon: React.ReactNode;
    title: string;
    description: string;
    delay: number;
    isCompleted: boolean;
    isHovered: boolean;
    onHover: (hovered: boolean) => void;
}

const HowItWorksStep: React.FC<HowItWorksStepProps> = ({ stepNumber, icon, title, description, delay, isCompleted, isHovered, onHover }) => {
    const iconControls = useAnimation();
    const cardControls = useAnimation();

    // Animate when hovered or completed
    useEffect(() => {
        if (isHovered || isCompleted) {
            iconControls.start({
                scale: [1, 1.2, 1.1],
                rotate: [0, 10, -10, 0],
                transition: { duration: 0.6 }
            });
            cardControls.start({
                scale: [1, 1.03, 1],
                transition: { duration: 0.5 }
            });
        }
    }, [isHovered, isCompleted, iconControls, cardControls]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            whileHover={{
                y: -8,
                scale: 1.02,
                transition: { duration: 0.3 }
            }}
            onHoverStart={() => onHover(true)}
            onHoverEnd={() => onHover(false)}
            animate={cardControls}
            className={`rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 border-2 group relative overflow-hidden h-96 flex flex-col ${isCompleted
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-green-200/50'
                : 'bg-white border-gray-100 hover:border-blue-200'
                }`}
        >
            {/* Animated background bubble */}
            <motion.div
                className={`absolute top-0 right-0 w-24 h-24 rounded-full transform translate-x-8 -translate-y-8 ${isCompleted
                    ? 'bg-gradient-to-br from-green-400/20 to-emerald-300/10'
                    : 'bg-gradient-to-br from-blue-500/10 to-transparent'
                    }`}
                whileHover={{ scale: 1.5, rotate: 180 }}
                animate={isCompleted ? {
                    scale: [1, 1.3, 1],
                    rotate: [0, 180, 360],
                    transition: { duration: 2, repeat: Infinity, repeatDelay: 2 }
                } : {}}
                transition={{ duration: 0.7 }}
            />

            <div className="relative z-10 flex flex-col h-full">
                {/* Icon */}
                <div className="text-center mb-4 flex-shrink-0">
                    <motion.div
                        animate={iconControls}
                        whileHover={{ rotate: 5, scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: delay + 0.2, type: "spring", stiffness: 200 }}
                        className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 text-white text-xl shadow-lg ${isCompleted
                            ? 'bg-gradient-to-br from-green-500 via-emerald-600 to-green-700 shadow-green-500/30'
                            : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-blue-500/30'
                            }`}
                    >
                        {isCompleted ? <FaCheck /> : icon}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: delay + 0.3 }}
                        className={`text-xs font-bold mb-2 tracking-wide ${isCompleted ? 'text-green-600' : 'text-blue-600'
                            }`}
                    >
                        {isCompleted ? '✓ COMPLETED' : `STEP ${stepNumber.toString().padStart(2, '0')}`}
                    </motion.div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col text-center">
                    <motion.h3
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: delay + 0.4 }}
                        className={`text-lg font-bold mb-3 transition-colors duration-300 leading-tight flex-shrink-0 ${isCompleted
                            ? 'text-green-700'
                            : 'text-slate-800 group-hover:text-blue-700'
                            }`}
                    >
                        {title}
                    </motion.h3>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: delay + 0.5 }}
                        className={`leading-relaxed text-sm flex-grow ${isCompleted ? 'text-green-600' : 'text-gray-600'
                            }`}
                    >
                        {description}
                    </motion.p>
                </div>
            </div>

            {/* Border animation */}
            <motion.div
                className={`absolute inset-0 rounded-2xl border-2 ${isCompleted
                    ? 'border-green-400/60'
                    : 'border-transparent'
                    }`}
                whileHover={{
                    borderColor: isCompleted
                        ? "rgba(34, 197, 94, 0.8)"
                        : "rgba(59, 130, 246, 0.5)"
                }}
                animate={isCompleted ? {
                    borderColor: ["rgba(34, 197, 94, 0.6)", "rgba(34, 197, 94, 0.9)", "rgba(34, 197, 94, 0.6)"],
                    transition: { duration: 2, repeat: Infinity }
                } : {}}
                transition={{ duration: 0.3 }}
            />

            {/* Completion checkmark overlay */}
            {isCompleted && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: delay + 0.3 }}
                    className="absolute top-4 right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"
                >
                    <FaCheck className="w-4 h-4" />
                </motion.div>
            )}
        </motion.div>
    );
};

const HowItWorks: React.FC = () => {
    const [hoveredStep, setHoveredStep] = useState<number | null>(null);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [isSectionHovered, setIsSectionHovered] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    const sectionRef = useRef<HTMLElement>(null);

    // Auto-start animation when section comes into view
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                    }
                });
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, []);

    // Sequential completion animation: 1->2->3->4
    useEffect(() => {
        if (isInView || isSectionHovered) {
            // Reset first
            setCompletedSteps([]);

            // Then complete steps sequentially
            const timers: NodeJS.Timeout[] = [];

            // Step 1 completes after 0.8s
            timers.push(setTimeout(() => {
                setCompletedSteps([0]);
            }, 800));

            // Step 2 completes after 1.6s
            timers.push(setTimeout(() => {
                setCompletedSteps([0, 1]);
            }, 1600));

            // Step 3 completes after 2.4s
            timers.push(setTimeout(() => {
                setCompletedSteps([0, 1, 2]);
            }, 2400));

            // Step 4 completes after 3.2s
            timers.push(setTimeout(() => {
                setCompletedSteps([0, 1, 2, 3]);
            }, 3200));

            return () => {
                timers.forEach(timer => clearTimeout(timer));
            };
        }
    }, [isInView, isSectionHovered, animationKey]);

    // Loop animation when hovered - continuously replay
    useEffect(() => {
        if (isSectionHovered) {
            const interval = setInterval(() => {
                // Reset and replay animation
                setCompletedSteps([]);
                setAnimationKey(prev => prev + 1);
            }, 4000); // Complete cycle takes ~3.2s, restart after 4s

            return () => clearInterval(interval);
        }
    }, [isSectionHovered]);

    // Animation variants for container
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.1
            }
        }
    };

    // Animation variants for heading
    const headingVariants = {
        hidden: { opacity: 0, y: -30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: "easeOut" as const
            }
        }
    };

    return (
        <section
            id="how-it-works"
            ref={sectionRef}
            className="py-12 bg-white relative overflow-hidden"
            onMouseEnter={() => setIsSectionHovered(true)}
            onMouseLeave={() => setIsSectionHovered(false)}
        >
            <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pb-12 -mt-2">
                {/* Heading Section with Animation */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={containerVariants}
                    className="text-center mb-12"
                >
                    <motion.div
                        variants={headingVariants}
                        className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-200/50 rounded-full text-sm font-semibold text-blue-700 mb-6 backdrop-blur-sm"
                    >
                        <motion.svg
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                            className="w-4 h-4 mr-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </motion.svg>
                        Simple Process
                    </motion.div>

                    <motion.h2
                        variants={headingVariants}
                        className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 to-blue-700 bg-clip-text text-transparent mb-6 leading-tight"
                    >
                        How SabApplier AI Works
                    </motion.h2>

                    <motion.p
                        variants={headingVariants}
                        className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed"
                    >
                        A simple 4-step process that transforms how you handle applications forever.
                    </motion.p>
                </motion.div>

                {/* Steps Grid with Staggered Animation */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative"
                >
                    {/* Connecting Flow Lines (visible on larger screens) */}
                    <motion.div
                        className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 opacity-30"
                        animate={isSectionHovered ? {
                            background: [
                                "linear-gradient(to right, rgb(191, 219, 254), rgb(147, 197, 253), rgb(191, 219, 254))",
                                "linear-gradient(to right, rgb(34, 197, 94), rgb(16, 185, 129), rgb(34, 197, 94))",
                                "linear-gradient(to right, rgb(191, 219, 254), rgb(147, 197, 253), rgb(191, 219, 254))"
                            ],
                            transition: { duration: 2, repeat: Infinity }
                        } : {
                            background: "linear-gradient(to right, rgb(191, 219, 254), rgb(147, 197, 253), rgb(191, 219, 254))"
                        }}
                    />
                    <div className="hidden lg:flex absolute top-20 left-0 right-0 justify-between px-12">
                        {[0, 1, 2, 3].map((index) => (
                            <motion.div
                                key={index}
                                initial={{ scaleX: 0 }}
                                whileInView={{ scaleX: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: index * 0.2 + 0.5 }}
                                animate={completedSteps.includes(index) ? {
                                    scale: [1, 1.5, 1],
                                    backgroundColor: ["rgb(59, 130, 246)", "rgb(34, 197, 94)", "rgb(34, 197, 94)"],
                                    transition: { duration: 0.5, delay: index * 0.2 }
                                } : {}}
                                className={`w-1 h-1 rounded-full ${completedSteps.includes(index) ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                            />
                        ))}
                    </div>

                    {[
                        {
                            stepNumber: 1,
                            icon: <FaFileAlt />,
                            title: "Upload Your Documents",
                            description: "Securely upload your Aadhar card, PAN card, certificates, and other important documents to your SabApplier profile."
                        },
                        {
                            stepNumber: 2,
                            icon: <FaLink />,
                            title: "Install Browser Extension",
                            description: "Add our smart extension to Chrome, Firefox, or Safari. It integrates seamlessly with any online form."
                        },
                        {
                            stepNumber: 3,
                            icon: <FaRobot />,
                            title: "Auto-Fill Forms Instantly",
                            description: "Click the SabApplier extension when you encounter a form. It reads and fills your data automatically."
                        },
                        {
                            stepNumber: 4,
                            icon: <FaCheck />,
                            title: "Review & Submit",
                            description: "Always review the auto-filled information, make any necessary adjustments, and submit with confidence."
                        }
                    ].map((step, index) => (
                        <HowItWorksStep
                            key={index}
                            {...step}
                            stepNumber={step.stepNumber}
                            delay={index * 0.15}
                            isCompleted={completedSteps.includes(index)}
                            isHovered={hoveredStep === index || isSectionHovered}
                            onHover={(hovered) => setHoveredStep(hovered ? index : null)}
                        />
                    ))}
                </motion.div>

                {/* Animated Arrow Flow Indicator (Mobile) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 1 }}
                    className="lg:hidden flex justify-center items-center gap-2 mt-8 text-blue-500"
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ y: [0, -10, 0] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                            }}
                            className="text-2xl"
                        >
                            ↓
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default HowItWorks;
