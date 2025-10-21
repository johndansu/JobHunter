# Web Scraper Pro

A professional web scraping platform with modern UI and powerful scraping capabilities.

## Features

- 🚀 Modern React frontend with TypeScript
- ⚡ Fast Node.js/Express backend
- 🎨 Beautiful UI based on design system
- 🔧 Powerful scraping engine with Puppeteer/Playwright
- 📊 Real-time dashboard and analytics
- 🔐 User authentication and authorization
- 📈 Data visualization and reporting
- ⏰ Job scheduling and monitoring
- 🗄️ Database integration with SQLite/PostgreSQL

## Project Structure

```
web-scraper-pro/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── shared/                 # Shared types and utilities
├── design.json            # Design system configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development servers:
   ```bash
   npm run dev
   ```

This will start both the frontend (http://localhost:3000) and backend (http://localhost:5000) servers.

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm start` - Start production server
- `npm test` - Run tests for both frontend and backend
- `npm run lint` - Run linter for both frontend and backend

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Vite for build tooling
- React Router for routing
- React Query for data fetching
- Chart.js for data visualization

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- SQLite/PostgreSQL database
- Puppeteer/Playwright for web scraping
- JWT for authentication

## Design System

The project uses a comprehensive design system defined in `design.json` with:
- Consistent color palette
- Typography system
- Component specifications
- Layout guidelines
- Accessibility standards

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
