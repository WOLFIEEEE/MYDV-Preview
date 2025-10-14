# Car Dealership Landing Page 4
A modern, professional landing page for a car dealership management platform built with Next.js, Tailwind CSS, and shadcn/ui.
## Features

- **Dark Theme Design**: Sleek and modern dark theme perfect for automotive industry
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile devices
- **Professional Navigation**: Sticky header with comprehensive navigation menu
- **Hero Section**: Compelling mission statement with beautiful background imagery
- **Feature Cards**: Showcase key platform capabilities with icons and descriptions
- **FAQ Section**: Answers common customer questions
- **Call-to-Action**: Clear contact and engagement buttons
- **Modern UI Components**: Built with shadcn/ui for consistent, accessible design

## Sections Included

1. **Header Navigation** - Professional navigation with company branding
2. **Hero Section (Our Mission)** - Company mission and value proposition
3. **What's in it for you** - Platform benefits with visual gallery
4. **Next Steps** - Clear guidance for potential customers
5. **Features Grid** - Six key platform features with icons
6. **FAQ** - Frequently asked questions in two-column layout
7. **Contact CTA** - Call-to-action section for customer engagement
8. **Footer** - Company branding and copyright

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd car-dealership-landing
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles with dark theme
│   ├── layout.tsx           # Root layout with dark theme configuration
│   └── page.tsx            # Main landing page component
├── components/
│   └── ui/                 # shadcn/ui components
└── lib/
    └── utils.ts           # Utility functions
```

## Customization

### Colors & Theme
The project uses a dark theme with the following primary colors:
- Background: Slate-900 gradient
- Primary: Blue-600
- Secondary: Various accent colors for features

### Content
All content can be easily customized by editing the `src/app/page.tsx` file. Update text, images, and sections as needed.

### Images
The project uses high-quality Unsplash images. Replace the image URLs in the component with your own professional automotive imagery.

## Build & Deployment

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Deploy
The project can be deployed on any platform that supports Next.js:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Docker containers

## Components Used

- `Button` - Interactive buttons with hover effects
- `Card` - Feature cards with consistent styling
- `NavigationMenu` - Professional navigation components

## Performance & SEO

- Optimized images with proper alt text
- Semantic HTML structure
- Fast loading with Next.js optimization
- Mobile-responsive design
- Professional metadata for SEO

## License

This project is proprietary and confidential for client presentation purposes.

---

**Built for professional car dealership presentation**
