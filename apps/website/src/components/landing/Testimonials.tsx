'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TestimonialCardProps {
    name: string;
    role: string;
    content: string;
    rating: number;
    index: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ name, role, content, rating }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 min-h-80 flex flex-col">
        <div className="flex items-center mb-4">
            {[...Array(5)].map((_, i) => (
                <svg
                    key={i}
                    className={`w-5 h-5 ${i < rating ? 'text-green-500' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
        <p className="text-gray-600 mb-4 leading-relaxed flex-1">"{content}"</p>
        <div className="flex items-center mt-auto">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-slate-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                {name.charAt(0)}
            </div>
            <div>
                <h4 className="font-semibold text-gray-900">{name}</h4>
                <p className="text-sm text-gray-500">{role}</p>
            </div>
        </div>
    </div>
);

const Testimonials: React.FC = () => {
    const testimonials = [
        {
            name: "Priya Sharma",
            role: "MBA Student",
            content:
                "SabApplier saved me hours during my job application process. The AI extension filled forms perfectly every time!",
            rating: 5
        },
        {
            name: "Rahul Kumar",
            role: "Engineering Graduate",
            content:
                "Never thought form filling could be this easy. The document storage and auto-fill features are game-changers.",
            rating: 5
        },
        {
            name: "Anjali Singh",
            role: "Government Job Aspirant",
            content:
                "Applied to 50+ government positions in half the time. The accuracy and speed are incredible!",
            rating: 5
        },
        {
            name: "Amit Verma",
            role: "SSC & Banking Exam Candidate",
            content:
                "Filling multiple exam forms used to be stressful. With SabApplier, everything is auto-filled correctly in minutes.",
            rating: 5
        },
        {
            name: "Neha Patel",
            role: "Final Year B.Tech Student",
            content:
                "Uploading documents once and using them everywhere is a huge relief. SabApplier feels made for students like us.",
            rating: 5
        }
    ];

    return (
        <section id="testimonials" className="py-12 bg-white">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold bg-gradient-to-br from-slate-800 to-blue-600 bg-clip-text text-transparent mb-4">What Our Users Say</h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Join thousands of satisfied users who have transformed their application process
                    </p>
                </div>

                {/* Testimonials Carousel Container */}
                <div className="relative overflow-hidden py-4">
                    {/* Animated Testimonials Row */}
                    <motion.div
                        className="flex gap-8 items-stretch"
                        animate={{
                            x: [0, -((400 + 32) * 5)], // Card width (400px) + gap (32px) * 5 testimonials
                        }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: 30,
                                ease: "linear",
                            },
                        }}
                    >
                        {/* Multiple sets for seamless infinite scroll */}
                        {[...Array(2)].map((_, setIndex) => (
                            <React.Fragment key={setIndex}>
                                {testimonials.map((testimonial, index) => (
                                    <div key={`set-${setIndex}-${index}`} className="flex-shrink-0 w-[400px]">
                                        <TestimonialCard {...testimonial} index={index} />
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
