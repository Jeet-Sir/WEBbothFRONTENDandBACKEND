# **App Name**: Sabapplier AI

## Core Features:

- Google OAuth Sign-In: Users sign in via Google OAuth 2.0 for secure authentication.
- Mandatory Onboarding Wizard: A 3-page profile completion flow is required for new users before accessing the dashboard.
- Dynamic Document Vault: The document categories displayed in the vault are based on the user's selected professions.
- AI-Powered Document Extraction: Use Gemini-3-Flash tool to automatically extract structured JSON data from uploaded images and PDFs.
- Document Storage via AWS S3: Store documents securely using AWS S3 with pre-signed URLs for uploads and temporary viewing.
- Gmail SMTP Service: Implement Gmail SMTP using Nodemailer to send welcome emails and OTPs for data sharing requests.
- Progress Tracking: Use a progress bar to display how far the user is in completing the onboarding process.

## Style Guidelines:

- Primary color: Navy blue (#1e2b48) to convey trust and professionalism.
- Background color: Light gray (#f0f2f5) to provide a clean and modern feel.
- Accent color: Light blue (#ADD8E6) for highlighting interactive elements and CTAs.
- Body and headline font: 'Inter', a sans-serif font, for clear and modern readability.
- Use a set of consistent, professional icons in a minimalist style, related to document types and categories.
- Employ a card-based layout with clear, high-fidelity input fields for forms and a persistent right-hand sidebar for document categories.
- Subtle animations for transitions, loading states, and document verifications to enhance user experience.