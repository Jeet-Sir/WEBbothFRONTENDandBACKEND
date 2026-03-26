'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/landing/Footer';
import { blogPosts } from '@/data/blogData';
import Image from 'next/image';

const BlogPage = () => {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = ['All', 'Form Guides', 'Product Updates', 'Use Case & Story Blogs', 'Product Tips', 'Core Problem & Awareness Blogs', 'Product & Technology Blogs'];

    const filteredPosts = selectedCategory === 'All'
        ? blogPosts
        : blogPosts.filter(post => post.category === selectedCategory);

    const handleLogin = () => {
        router.push('/signin');
    };

    const handleSignup = () => {
        router.push('/signup');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans text-gray-900">
            <LandingNavbar onLogin={handleLogin} onSignup={handleSignup} />

            <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-display"
                    >
                        Insights & Updates from <span className="text-blue-600">SabApplier AI</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-600 max-w-2xl mx-auto"
                    >
                        Expert guides, product updates, and deep dives into the future of automated applications.
                    </motion.p>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    {categories.map((category, index) => (
                        <motion.button
                            key={category}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap
                ${selectedCategory === category
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-blue-200'
                                }`}
                        >
                            {category}
                        </motion.button>
                    ))}
                </div>

                {/* Blog Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredPosts.map((post, index) => (
                        <motion.article
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col cursor-pointer h-full"
                            onClick={() => router.push(`/blog/${post.id}`)}
                        >
                            {/* Image Container */}
                            <div className="relative h-56 overflow-hidden">
                                <div className="absolute inset-0 bg-gray-200 animate-pulse" /> {/* Placeholder */}
                                <Image
                                    src={post.thumbnail}
                                    alt={post.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        // Fallback handled by parent div color or default
                                        (e.target as HTMLImageElement).src = '/assets/blog/first.jpg'; // Simple fallback
                                    }}
                                />
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-blue-600 shadow-sm">
                                    {post.category}
                                </div>
                                {post.featured && (
                                    <div className="absolute top-4 right-4 bg-orange-500/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm flex items-center gap-1">
                                        ★ Featured
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        📅 {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span className="flex items-center gap-1">
                                        ⏱️ {post.readTime}
                                    </span>
                                </div>

                                <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                                    {post.title}
                                </h2>

                                <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3 flex-grow">
                                    {post.summary}
                                </p>

                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-sm font-semibold text-blue-600 flex items-center gap-2 group-hover:gap-3 transition-all">
                                        Read Article →
                                    </span>
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>

                {filteredPosts.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">No posts found in this category yet.</p>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default BlogPage;
