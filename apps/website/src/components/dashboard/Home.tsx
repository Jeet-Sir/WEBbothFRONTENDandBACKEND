"use client";

import React from 'react';
import { UserProfile } from '@/lib/types';
import Footer from '@/components/landing/Footer';

// Hardcoded official exam portals for competitive exams
export const defaultApplications = [
  {
    id: 1,
    title: "IBPS (Institute of Banking Personnel Selection)",
    officialLink: "https://www.ibps.in/",
    category: "Banking",
  },
  {
    id: 2,
    title: "RRB (Railway Recruitment Board)",
    officialLink: "https://www.rrbapply.gov.in/#/auth/landing",
    category: "Railways",
  },
  {
    id: 3,
    title: "SSC (Staff Selection Commission)",
    officialLink: "https://ssc.gov.in/",
    category: "Government",
  },
  {
    id: 4,
    title: "UPSC (Union Public Service Commission)",
    officialLink: "https://upsconline.nic.in/",
    category: "Government",
  },
  {
    id: 5,
    title: "SBI (State Bank of India)",
    officialLink: "https://sbi.co.in/web/careers/Current-openings",
    category: "Banking",
  },
  {
    id: 6,
    title: "NTA (National Testing Agency)",
    officialLink: "https://www.nta.ac.in/",
    category: "Testing Agency",
  },
  {
    id: 7,
    title: "State PSC (State Public Service Commissions)",
    officialLink: "https://www.freejobalert.com/latest-notifications/#google_vignette",
    category: "State Government",
  },
];

// Hardcoded incubation/acceleration programs
export const incubationPrograms = [
  {
    id: 1,
    title: "Y Combinator",
    officialLink: "https://www.ycombinator.com/",
    category: "Accelerator",
  },
  {
    id: 2,
    title: "Accubate",
    officialLink: "https://www.accubate.app/en/programs",
    category: "Incubator/Accelerator",
  },
  {
    id: 3,
    title: "F6S",
    officialLink: "https://www.f6s.com/programs",
    category: "Platform",
  },
  {
    id: 4,
    title: "Gust programs",
    officialLink: "https://gust.com/search/new?accepting_applications=true&category=accelerators",
    category: "Incubator/Accelerator",
  },
  {
    id: 5,
    title: "Startup India Seed Fund",
    officialLink: "https://seedfund.startupindia.gov.in/",
    category: "Government",
  },
  {
    id: 6,
    title: "Startup India Investor Connect",
    officialLink: "https://app-investorconnect.startupindia.gov.in/login",
    category: "Government",
  },
  {
    id: 7,
    title: "Techstars",
    officialLink: "https://www.techstars.com/accelerators",
    category: "Accelerator",
  },
  {
    id: 8,
    title: "500 Global",
    officialLink: "https://500.co/founders",
    category: "VC / Accelerator",
  },
  {
    id: 9,
    title: "Antler",
    officialLink: "https://www.antler.co/apply",
    category: "VC / Generator",
  },
  {
    id: 10,
    title: "Entrepreneur First",
    officialLink: "https://apply.joinef.com/",
    category: "Talent Investor",
  },
  {
    id: 11,
    title: "SOSV",
    officialLink: "https://sosv.com/apply/",
    category: "VC / Accelerator",
  },
  {
    id: 12,
    title: "Alchemist Accelerator",
    officialLink: "https://www.alchemistaccelerator.com/apply?hsCtaTracking=158cbd02-6c3d-4216-bc77-8041cac65ee1%7C09bb0443-2928-405b-ba25-3831dbfaebce",
    category: "Accelerator",
  },
  
];

interface HomeProps {
  applications?: typeof defaultApplications;
  loadingExams?: boolean;
  user?: UserProfile;
}

const founderResources = [
  {
    id: 1,
    title: 'Company Setup',
    description: 'Keep your core founder profile, startup basics, and formation documents ready for funding and accelerator applications.',
  },
  {
    id: 2,
    title: 'Investor Readiness',
    description: 'Use your founder vault to keep your pitch deck and company proof documents ready for faster submission cycles.',
  },
  {
    id: 3,
    title: 'Accelerator Applications',
    description: 'Stay ready for incubator, accelerator, and grant applications without repeatedly retyping your startup details.',
  },
];

export const Home: React.FC<HomeProps> = ({ applications = defaultApplications, loadingExams = false, user }) => {
  const isGlobalFounder = user?.marketSegment === 'global_founder';

  // Loading skeleton for 7 official portals
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="bg-white rounded-lg shadow-md border border-blue-100 p-3 h-32" />
    </div>
  );

  if (isGlobalFounder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200">
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-2 font-sans tracking-tight drop-shadow-sm" style={{ letterSpacing: '0.01em' }}>
              Founder workspace for <span className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-2 py-1 rounded shadow-sm inline-flex items-center gap-2">global startups</span>
            </h1>
            <p className="text-lg text-gray-600 mb-4 font-medium">
              Keep your founder profile, startup details, and core documents ready for every application.
            </p>
            <p className="text-base text-gray-500 mb-8 max-w-2xl mx-auto">
              SabApplier now serves global founders with a lighter profile flow and a founder-first vault for accelerators, incubators, grants, and fundraising workflows.
            </p>
            <div className="mb-12">
              <a
                href="https://chromewebstore.google.com/detail/pbokcepmfdenanohfjfgkilcpgceohhl?utm_source=item-share-cb"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><g><circle fill="#fff" cx="24" cy="24" r="21" /><path fill="#ea4335" d="M23.5 22.7V9.2c4.2 0 8.1 1.7 11 4.4l-4.7 8.1c-1.7-1.6-4-2.6-6.3-2.6z" /><path fill="#4285f4" d="M23.5 38.8c-6.2 0-11.5-5.1-11.5-11.5 0-2.1.6-4.1 1.6-5.8l9.9 5.7v11.6z" /><path fill="#fbbc04" d="M35.2 13.6c3.1 2.9 5.1 7 5.1 11.7h-11.8l6.7-11.7z" /><path fill="#34a853" d="M23.5 38.8c4.2 0 8.1-1.7 11-4.4l-4.7-8.1c-1.7 1.6-4 2.6-6.3 2.6v9.9z" /><path fill="#fbbc04" d="M12.8 34.4c-3.1-2.9-5.1-7-5.1-11.7h11.8l-6.7 11.7z" /></g></svg>
                Get Our Extension
              </a>
            </div>
          </div>

          <div className="w-full flex justify-center mb-12">
            <div className="h-1 w-32 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full opacity-70" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {founderResources.map((resource) => (
              <div key={resource.id} className="rounded-2xl shadow-md bg-white border border-blue-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">{resource.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{resource.description}</p>
              </div>
            ))}
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Founder Programs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {incubationPrograms.map((program) => (
                <a
                  key={program.id}
                  href={program.officialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl shadow-md bg-white border border-blue-100 hover:shadow-xl hover:border-blue-400 hover:scale-[1.025] transition-all duration-200 p-6 group focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ textDecoration: 'none' }}
                  aria-label={`Go to ${program.title} official site`}
                >
                  <div className="flex items-center mb-2">
                    <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-lg font-semibold text-gray-900 font-sans">{program.title}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {program.category}
                    </span>
                    <span className="text-xs text-green-600 font-medium ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Official link</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-2 font-sans tracking-tight drop-shadow-sm" style={{letterSpacing: '0.01em'}}>
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-2 py-1 rounded shadow-sm inline-flex items-center gap-2">
              SabApplier AI
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-4 font-medium">
            Your Trusted form filler Agent
          </p>
          <p className="text-base text-gray-500 mb-8 max-w-xl mx-auto">
            Streamline your applications with Sabapplier. Use website to manage documents, extension to fill form
          </p>
          {/* Extension Download Button (unchanged, but with Chrome icon) */}
          <div className="mb-12">
            <a
              href="https://chromewebstore.google.com/detail/pbokcepmfdenanohfjfgkilcpgceohhl?utm_source=item-share-cb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><g><circle fill="#fff" cx="24" cy="24" r="21"/><path fill="#ea4335" d="M23.5 22.7V9.2c4.2 0 8.1 1.7 11 4.4l-4.7 8.1c-1.7-1.6-4-2.6-6.3-2.6z"/><path fill="#4285f4" d="M23.5 38.8c-6.2 0-11.5-5.1-11.5-11.5 0-2.1.6-4.1 1.6-5.8l9.9 5.7v11.6z"/><path fill="#fbbc04" d="M35.2 13.6c3.1 2.9 5.1 7 5.1 11.7h-11.8l6.7-11.7z"/><path fill="#34a853" d="M23.5 38.8c4.2 0 8.1-1.7 11-4.4l-4.7-8.1c-1.7 1.6-4 2.6-6.3 2.6v9.9z"/><path fill="#fbbc04" d="M12.8 34.4c-3.1-2.9-5.1-7-5.1-11.7h11.8l-6.7 11.7z"/></g></svg>
              Get Our Extension
            </a>
          </div>
        </div>
        {/* Divider for spacing and theme match */}
        <div className="w-full flex justify-center mb-12">
          <div className="h-1 w-32 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full opacity-70"></div>
        </div>
        
        {/* Incubation/Acceleration Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Incubation/Acceleration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incubationPrograms.map((program) => (
              <a
                key={program.id}
                href={program.officialLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl shadow-md bg-white border border-blue-100 hover:shadow-xl hover:border-blue-400 hover:scale-[1.025] transition-all duration-200 p-6 group focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ textDecoration: 'none' }}
                aria-label={`Go to ${program.title} official site`}
              >
                <div className="flex items-center mb-2">
                  <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-900 font-sans">{program.title}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {program.category} <span className="ml-2">🚀</span>
                  </span>
                  <span className="text-xs text-green-600 font-medium ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Official link ✅</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Competitive Exams Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5.25-3.5 10-8 12-4.5-2-8-6.75-8-12V7l8-4z" />
            </svg>
            Competitive Exams
          </h2>
          {loadingExams ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(7)].map((_, idx) => <LoadingSkeleton key={idx} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(applications || []).map((app) => (
                <a
                  key={app.id}
                  href={app.officialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl shadow-md bg-white border border-blue-100 hover:shadow-xl hover:border-blue-400 hover:scale-[1.025] transition-all duration-200 p-6 group focus:outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ textDecoration: 'none' }}
                  aria-label={`Go to ${app.title} official form site`}
                >
                  <div className="flex items-center mb-2">
                    {/* Shield Icon for Security */}
                    <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5.25-3.5 10-8 12-4.5-2-8-6.75-8-12V7l8-4z" />
                    </svg>
                    <span className="text-lg font-semibold text-gray-900 font-sans">{app.title}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {app.category} <span className="ml-2">🔒</span>
                    </span>
                    <span className="text-xs text-green-600 font-medium ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Secure link verified ✅</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
