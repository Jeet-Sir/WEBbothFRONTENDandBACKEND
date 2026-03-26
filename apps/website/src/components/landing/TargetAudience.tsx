'use client';

import React from 'react';
import { GraduationCap, Briefcase, Rocket, Microscope } from 'lucide-react';

interface AudienceCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
}

const AudienceCard: React.FC<AudienceCardProps> = ({ icon: Icon, title, description }) => (
    <div className="flex flex-col sm:flex-row items-start p-6 rounded-xl bg-gray-50 border border-transparent hover:border-gray-200 transition-colors duration-300">
        <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 mb-4 sm:mb-0 sm:mr-5">
            <Icon className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
        </div>
        <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{description}</p>
        </div>
    </div>
);

const TargetAudience: React.FC = () => {
    const audiences = [
        {
            icon: GraduationCap,
            title: "Students & Individuals",
            description: "Apply for internships, colleges, courses, competitive exams, and entrance tests with ease."
        },
        {
            icon: Briefcase,
            title: "Professionals",
            description: "Apply for jobs, freelance gigs, consulting projects, and corporate proposals efficiently."
        },
        {
            icon: Rocket,
            title: "Founders / Startups",
            description: "Apply for startup grants, incubators, accelerators, and pre-seed investment opportunities."
        },
        {
            icon: Microscope,
            title: "Researchers / Other Professionals",
            description: "Apply for research grants, fellowships, patents, and inclusive program opportunities."
        }
    ];

    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                        Built for everyone who applies — <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            for themselves or others
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600">
                        One platform to manage all your applications, no matter your role or goal.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 max-w-5xl mx-auto">
                    {audiences.map((audience, index) => (
                        <AudienceCard
                            key={index}
                            {...audience}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TargetAudience;
