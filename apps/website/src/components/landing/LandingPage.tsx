'use client';

import React from 'react';
import LandingNavbar from './LandingNavbar';
import Hero from './Hero';
import Features from './Features';
import HowItWorks from './HowItWorks';
import TargetAudience from './TargetAudience';
import Testimonials from './Testimonials';
import Privacy from './Privacy';
import CTA from './CTA';
import Footer from './Footer';

interface LandingPageProps {
    onLogin: () => void;
    onSignup?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup }) => {
    const handleSignup = onSignup ?? (() => {
        if (typeof window === 'undefined') return;
        window.location.href = '/signup';
    });

    return (
        <div className="min-h-screen bg-white">
            <LandingNavbar onLogin={onLogin} onSignup={handleSignup} />
            <section id="hero" className='-mb-10'>
                <Hero onSignup={handleSignup} />
            </section>
            <section id="how-it-works" className="pt-0">
                <HowItWorks />
            </section>
            <section id="target-audience" className="-mt-8">
                <TargetAudience />
            </section>
            <section id="features" className="-mt-8">
                <Features />
            </section>
            <section id="privacy" className="-mt-8">
                <Privacy />
            </section>
            <section id="testimonials" className="-mt-8">
                <Testimonials />
            </section>
            <section id="cta" className="-mt-8">
                <CTA onSignup={handleSignup} />
            </section>
            <Footer />
        </div>
    );
};

export default LandingPage;
