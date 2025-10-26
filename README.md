# 🎯 JobHunter - All-in-One Job Search Platform

> **Stop wasting hours visiting 10+ job sites.** JobHunter aggregates jobs from Indeed, LinkedIn, Glassdoor, and 50+ more job boards—delivering every opportunity in one powerful search.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🚀 Features

### 🔍 **Smart Job Search**
- **Multi-Platform Aggregation**: Search 50+ job boards simultaneously
- **Real-time Results**: Get instant job listings from Indeed, LinkedIn, Glassdoor, ZipRecruiter, and more
- **Advanced Filters**: Filter by salary, job type, work mode (remote/hybrid/onsite), experience level
- **Smart Search**: Autocomplete with search history and popular suggestions
- **Location Intelligence**: City/region autocomplete with geolocation support

### 💾 **Job Management**
- **Save Jobs**: Bookmark interesting positions for later
- **Job Comparison**: Compare up to 3 jobs side-by-side
- **Recently Viewed**: Automatic tracking of browsed jobs
- **Saved Searches**: Save search queries with custom filters and get alerts
- **Export Options**: Share jobs via LinkedIn, Twitter, Facebook, WhatsApp, Email

### 🤖 **AI-Powered Features**
- **Job Recommendations**: Personalized suggestions based on your activity
- **Smart Matching**: AI analyzes your saved/viewed jobs to find similar opportunities
- **Keyword Extraction**: Intelligent job matching using NLP techniques

### 🎨 **Premium User Experience**
- **Dark Mode**: Full dark/light theme support with system preference detection
- **Infinite Scroll**: Seamless browsing with automatic load-more
- **Skeleton Loaders**: Smooth loading states for better UX
- **Exit Intent Popup**: Email capture for job alerts
- **Confetti Celebrations**: Gamification for milestone achievements (save milestones)
- **Toast Notifications**: Undo actions, success/error messages
- **Responsive Design**: Perfect on desktop, tablet, and mobile

### 📊 **Professional Dashboard**
- **Job Statistics**: Track search history, saved jobs, application progress
- **Activity Timeline**: View your job search journey
- **Saved Search Management**: Organize and manage custom searches
- **Search History**: Quick access to previous searches

### 🔐 **Authentication & Security**
- **User Authentication**: Secure JWT-based login/register system
- **Protected Routes**: Private job boards and saved jobs
- **Session Management**: Persistent login with secure storage
- **Role-based Access**: Different access levels (user, professional, enterprise)

---

## 📸 Screenshots

### Light Mode
![Browse Jobs - Light](docs/browse-jobs-light.png)
*Professional job search interface with advanced filters*

### Dark Mode
![Browse Jobs - Dark](docs/browse-jobs-dark.png)
*Full dark mode support across all pages*

### Job Details
![Job Comparison](docs/job-comparison.png)
*Side-by-side job comparison feature*

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Build Tool**: Vite (fast HMR, optimized builds)
- **Routing**: React Router v6
- **State Management**: 
  - Zustand (auth state)
  - React Query / TanStack Query (server state, caching)
  - Custom hooks for local features
- **UI Components**: Lucide React icons
- **Animations**: Custom CSS animations + Framer Motion concepts
- **Forms**: React Hook Form + Zod validation
- **Notifications**: React Hot Toast + Custom toast system
- **Special Effects**: Canvas Confetti for celebrations

### **Backend**
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: 
  - Prisma ORM
  - SQLite (development)
  - PostgreSQL ready (production)
- **Web Scraping**:
  - Puppeteer (headless browser automation)
  - Multiple Job API integrations (Indeed, LinkedIn, etc.)
- **Authentication**: JWT tokens with bcrypt password hashing
- **API Architecture**: RESTful API with structured error handling
- **Real-time**: WebSocket support for live updates
- **Job Queue**: Background job processing for scraping tasks

### **Key Libraries & Tools**
- **TypeScript**: Full type safety across frontend & backend
- **Concurrently**: Run multiple dev servers simultaneously
- **ESBuild**: Fast TypeScript compilation
- **TSX**: TypeScript execution for development
- **Axios**: HTTP client for API requests
- **Date-fns**: Date manipulation and formatting

---

## 📁 Project Structure

```
JobHunter/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ExitIntentModal.tsx
│   │   │   ├── JobComparisonModal.tsx
│   │   │   ├── JobFilters.tsx
│   │   │   ├── JobRecommendations.tsx
│   │   │   ├── RecentlyViewed.tsx
│   │   │   ├── SavedSearches.tsx
│   │   │   ├── SearchAutocomplete.tsx
│   │   │   ├── ShareJobModal.tsx
│   │   │   ├── SkeletonLoader.tsx
│   │   │   ├── ThemeSwitcher.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ToastContainer.tsx
│   │   ├── contexts/                # React contexts
│   │   │   └── ThemeContext.tsx     # Dark mode management
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useExitIntent.ts
│   │   │   ├── useInfiniteScroll.ts
│   │   │   ├── useJobComparison.ts
│   │   │   ├── useRecentlyViewed.ts
│   │   │   ├── useSavedSearches.ts
│   │   │   └── useSearchHistory.ts
│   │   ├── pages/                   # Route pages
│   │   │   ├── BrowseJobs.tsx       # Main job search page
│   │   │   ├── SavedJobs.tsx        # Bookmarked jobs
│   │   │   ├── JobBoardLanding.tsx  # Homepage
│   │   │   ├── Landing.tsx          # Product landing
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── ...
│   │   ├── services/                # API services
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   ├── dataService.ts
│   │   │   ├── jobService.ts
│   │   │   ├── locationService.ts
│   │   │   └── searchService.ts
│   │   ├── store/                   # Global state
│   │   │   └── authStore.ts         # Zustand auth store
│   │   ├── types/                   # TypeScript definitions
│   │   ├── utils/                   # Utility functions
│   │   │   ├── confetti.ts
│   │   │   ├── htmlCleaner.ts
│   │   │   └── jobRecommendations.ts
│   │   ├── App.tsx                  # Root component
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Global styles + animations
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js           # Tailwind configuration
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                          # Node.js Backend
│   ├── src/
│   │   ├── middleware/              # Express middlewares
│   │   │   ├── auth.ts              # JWT authentication
│   │   │   ├── errorHandler.ts
│   │   │   └── notFound.ts
│   │   ├── routes/                  # API routes
│   │   │   ├── analytics.ts
│   │   │   ├── auth.ts
│   │   │   ├── data.ts
│   │   │   ├── export.ts
│   │   │   ├── jobs.ts
│   │   │   ├── locations.ts
│   │   │   ├── search.ts
│   │   │   └── users.ts
│   │   ├── services/                # Business logic
│   │   │   ├── analyticsService.ts
│   │   │   ├── jobApiService.ts     # Job board API integrations
│   │   │   ├── jobQueue.ts          # Background jobs
│   │   │   ├── proxyService.ts
│   │   │   └── scrapingService.ts   # Puppeteer scraping
│   │   ├── types/                   # TypeScript types
│   │   ├── utils/                   # Utilities
│   │   │   ├── database.ts
│   │   │   ├── htmlCleaner.ts
│   │   │   └── websocket.ts
│   │   └── index.ts                 # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── dev.db                   # SQLite database
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                     # Root package (runs both servers)
├── start-servers.ps1                # PowerShell startup script
└── README.md                        # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/jobhunter.git
   cd jobhunter
   ```

2. **Install all dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install client and server dependencies
   npm run install:all
   ```

3. **Set up the database**
   ```bash
   cd server
   npx prisma migrate dev
   npx prisma generate
   cd ..
   ```

4. **Start development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   ```

   Or on Windows PowerShell:
   ```powershell
   .\start-servers.ps1
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

---

## 📜 Available Scripts

### Root Level
```bash
npm run dev              # Start both client and server in development mode
npm run dev:server       # Start backend server only
npm run dev:client       # Start frontend only
npm run build            # Build both for production
npm run install:all      # Install all dependencies (root, client, server)
npm run clean            # Remove all node_modules and build files
npm run reset            # Clean + reinstall all dependencies
```

### Client
```bash
cd client
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
```

### Server
```bash
cd server
npm run dev              # Start with hot reload
npm run build            # Compile TypeScript
npm start                # Run production build
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` files in both `client/` and `server/` directories:

#### **server/.env**
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Job APIs (optional - add your API keys)
INDEED_API_KEY=your-indeed-api-key
LINKEDIN_API_KEY=your-linkedin-api-key
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
```

#### **client/.env**
```env
VITE_API_URL=http://localhost:5000
```

---

## 🎨 Theme Customization

### Dark Mode
The application includes a full dark mode with:
- System preference detection
- Manual toggle (Sun/Moon/System icons)
- Smooth transitions
- Persistent user preference (localStorage)

### Colors
Main color: **Teal** (customizable in `tailwind.config.js`)

```javascript
// client/tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: '#0d9488',  // Teal-600
      // Customize your brand colors here
    }
  }
}
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Test frontend
cd client && npm test

# Test backend
cd server && npm test
```

---

## 📊 API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Job Search Endpoints

#### Search Jobs
```http
GET /api/search/jobs?query=software%20engineer&location=New%20York
Authorization: Bearer <token>
```

#### Get Saved Jobs
```http
GET /api/data?limit=100
Authorization: Bearer <token>
```

#### Save a Job
```http
POST /api/data
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Senior Software Engineer",
  "company": "Tech Corp",
  "location": "San Francisco",
  "url": "https://example.com/job/123"
}
```

Full API documentation available at: `/api/docs` (when server is running)

---

## 🚢 Deployment

**📖 See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.**

### Quick Start

**Frontend (Vercel)** ✅ Ready to deploy!
- Push to GitHub and import in Vercel
- Set `VITE_API_URL` environment variable
- Automatic builds on push

**Backend (Railway/Render/Heroku)**
- Deploy backend separately (includes Puppeteer, needs more resources)
- Switch from SQLite to PostgreSQL
- See full guide in [DEPLOYMENT.md](DEPLOYMENT.md)

### Docker (Coming Soon)
```bash
docker-compose up -d
```

---

## 🤝 Contributing

We love contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**John Dansu**

- GitHub: [@johndansu](https://github.com/johndansu)
- LinkedIn: [John Dansu](https://linkedin.com/in/johndansu)
- Email: john@example.com

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Puppeteer](https://pptr.dev/) - Web scraping
- [Prisma](https://www.prisma.io/) - Database ORM
- [Lucide](https://lucide.dev/) - Beautiful icons
- [Vite](https://vitejs.dev/) - Lightning-fast build tool

---

## 📞 Support

Need help? Here's how to get support:

- 📧 Email: support@jobhunter.com
- 💬 Discord: [Join our community](https://discord.gg/jobhunter)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/jobhunter/issues)
- 📖 Docs: [Documentation](https://docs.jobhunter.com)

---

## 🗺️ Roadmap

- [ ] **v2.0** - AI Resume Matching
- [ ] **v2.1** - Application Tracking System
- [ ] **v2.2** - Salary Insights & Analytics
- [ ] **v2.3** - Company Reviews Integration
- [ ] **v2.4** - Mobile App (React Native)
- [ ] **v3.0** - Enterprise Features
- [ ] **v3.1** - Team Collaboration Tools
- [ ] **v3.2** - Advanced Analytics Dashboard

---

<div align="center">

### ⭐ Star this repo if you find it helpful!

**Made with ❤️ by John Dansu**

[Report Bug](https://github.com/yourusername/jobhunter/issues) · [Request Feature](https://github.com/yourusername/jobhunter/issues) · [Documentation](https://docs.jobhunter.com)

</div>
