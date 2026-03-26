'use client';

import React from 'react';

interface CTAProps {
    onSignup: () => void;
}

const CTA: React.FC<CTAProps> = ({ onSignup }) => {
    return (
        <section className="py-12 bg-white relative overflow-hidden">
            <div className="relative max-w-4xl mx-auto px-4 text-center">
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                    Ready to Transform Your Application Process?
                </h2>
                <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
                    Join thousands of users who have already simplified their form-filling journey with SabApplier AI.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                    <button
                        onClick={onSignup}
                        className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                    >
                        Start Free Today
                    </button>

                    <a
                        href="https://chromewebstore.google.com/detail/pbokcepmfdenanohfjfgkilcpgceohhl?utm_source=item-share-cb"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-transparent border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all duration-200 flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Get Extension
                    </a>
                </div>

                <div className="text-gray-500 text-sm">
                    ✓ No credit card required • ✓ Free forever plan • ✓ Setup in 2 minutes
                </div>
            </div>
        </section>
    );
};

export default CTA;
