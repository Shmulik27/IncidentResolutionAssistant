# Incident Resolution Assistant - Frontend

A modern React-based web dashboard for managing and monitoring the AI-powered incident resolution assistant.

## Features

- **Service Dashboard**: Real-time monitoring of all microservices
- **Incident Analyzer**: Step-by-step log analysis workflow
- **Test Runner**: Execute and view test results
- **Configuration Management**: Configure service settings and feature flags
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 16+ 
- npm or yarn
- All backend services running (see main README.md)

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Building for Production

Create a production build:
```bash
npm run build
```

The built files will be in the `build/` directory.

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Create production build
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (not recommended)

## Configuration

The frontend connects to the following backend services:

- Go Backend: `http://localhost:8080`
- Log Analyzer: `http://localhost:8001`
- Root Cause Predictor: `http://localhost:8002`
- Knowledge Base: `http://localhost:8003`
- Action Recommender: `http://localhost:8004`
- Incident Integrator: `http://localhost:8005`

You can modify these URLs in the Configuration page or update the `api.js` file.

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── IncidentAnalyzer.jsx
│   │   ├── TestRunner.jsx
│   │   └── Configuration.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Technologies Used

- **React 18** - UI framework
- **Material-UI (MUI)** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Create React App** - Build tool

## Troubleshooting

### CORS Issues
If you encounter CORS errors, make sure your backend services are configured to allow requests from `http://localhost:3000`.

### Service Connection Issues
- Verify all backend services are running
- Check service URLs in the Configuration page
- Ensure no firewall is blocking the connections

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force` 