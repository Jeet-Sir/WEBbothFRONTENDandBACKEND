'use client';

import React from 'react';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import LandingNavbar from '@/components/landing/LandingNavbar';
import Footer from '@/components/landing/Footer';
import BlogContentRenderer from '@/components/landing/BlogContentRenderer';
import { blogPosts } from '@/data/blogData';
import { ArrowLeft, Share2, Bookmark, Clock, Calendar, Tag } from 'lucide-react';

interface BlogDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

const BlogDetailPage = ({ params }: BlogDetailPageProps) => {
    const router = useRouter();
    const resolvedParams = React.use(params);
    const postId = parseInt(resolvedParams.id);
    const post = blogPosts.find((p) => p.id === postId);

    if (!post) {
        return notFound();
    }

    const popularPosts = blogPosts.filter((p) => p.featured && p.id !== postId).slice(0, 5);

    const handleLogin = () => {
        router.push('/signin');
    };

    const handleSignup = () => {
        router.push('/signup');
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: post.title,
                text: post.summary,
                url: window.location.href,
            }).catch(console.error);
        } else {
            // Fallback or toast
            console.log('Share API not supported');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-900">
            <LandingNavbar onLogin={handleLogin} onSignup={handleSignup} />

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <button
                    onClick={() => router.push('/blog')}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Back to Articles
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <article className="lg:col-span-2">
                        {/* Header */}
                        <header className="mb-8">
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    {post.category}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {post.readTime}
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight font-display">
                                {post.title}
                            </h1>

                            {/* Featured Image */}
                            <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-xl mb-10">
                                <Image
                                    src={post.thumbnail}
                                    alt={post.title}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center justify-between py-4 border-y border-gray-200 mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                                        SA
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">SabApplier AI Team</p>
                                        <p className="text-xs text-gray-500">Product & Research</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleShare}
                                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                                        title="Share"
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                                        title="Save"
                                    >
                                        <Bookmark className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Content Render */}
                        <div className="prose prose-lg prose-blue max-w-none">
                            <BlogContentRenderer content={post.content} />
                        </div>

                        {/* Newsletter / CTA */}
                        <div className="mt-16 p-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white text-center shadow-xl">
                            <h3 className="text-2xl font-bold mb-4">Never Miss an Update</h3>
                            <p className="text-blue-100 mb-6">Join 10,000+ students and professionals using SabApplier AI.</p>
                            <button
                                onClick={() => window.open('https://chromewebstore.google.com/detail/sabapplier-ai-smart-form/pbokcepmfdenanohfjfgkilcpgceohhl?utm_source=item-share-cb', '_blank')}
                                className="px-8 py-3 bg-white text-blue-700 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-md"
                            >
                                Get Started for Free
                            </button>
                        </div>
                    </article>

                    {/* Sidebar */}
                    <aside className="space-y-8">
                        {/* Search (Placeholder) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search articles..."
                                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <span className="absolute right-3 top-3.5 text-gray-400">🔍</span>
                            </div>
                        </div>

                        {/* Popular Posts */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="text-yellow-500">★</span> Popular Posts
                            </h3>
                            <div className="space-y-6">
                                {popularPosts.map((p) => (
                                    <div
                                        key={p.id}
                                        className="group cursor-pointer flex gap-4 items-start"
                                        onClick={() => router.push(`/blog/${p.id}`)}
                                    >
                                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                                            <Image
                                                src={p.thumbnail}
                                                alt={p.title}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                {p.title}
                                            </h4>
                                            <span className="text-xs text-gray-500 mt-1 block">{p.readTime}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
                            <ul className="space-y-3">
                                {[
                                    { name: 'Home', path: '/' },
                                    { name: 'Features', path: '/#features' },
                                    { name: 'How it Works', path: '/#how-it-works' },
                                    { name: 'Privacy Policy', path: '/privacy-policy' }
                                ].map((link) => (
                                    <li key={link.name}>
                                        <button
                                            onClick={() => router.push(link.path)}
                                            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors w-full text-left p-2 hover:bg-gray-50 rounded-lg"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-blue-500"></span>
                                            {link.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Tags Cloud (Static for now) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Topics</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Exam Tips', 'AI Safety', 'Productivity', 'Digital India', 'Startups', 'Grants', 'Tutorials'].map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default BlogDetailPage;
