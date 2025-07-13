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

Thank you for reporting this! If you’re not seeing any namespaces in the UI after selecting a cluster, here are the most likely causes and how to debug/fix them:

---

## 1. **Check the Backend Endpoint Directly**

Let’s verify if the Go backend is returning namespaces for your cluster.

**Try this in your terminal (replace the cluster name as needed):**
```sh
curl "http://localhost:8080/k8s-namespaces?cluster=arn:aws:eks:eu-west-1:582866566323:cluster/EKSClusterDev"
```
- If you get a list of namespaces (e.g. `{"namespaces":["default","kube-system",...]}`), the backend is working.
- If you get an error or an empty list, the issue is in the backend or the K8s log scanner.

---

## 2. **Check the K8s Log Scanner Directly**

Try calling the log scanner service directly:
```sh
<code_block_to_apply_changes_from>
```
- If this returns namespaces, the log scanner is working.
- If not, the issue is in the log scanner or with cluster access.

---

## 3. **Check the Frontend Network Tab**

- Open your browser’s DevTools → Network tab.
- Select a cluster in the UI.
- Look for a request to `/k8s-namespaces?...` and check the response.
- If the response is empty or an error, copy the error message here.

---

## 4. **Possible Causes**

- The cluster name may need to be URL-encoded (the backend and frontend should already do this, but double-check).
- The K8s log scanner may not have permission to list namespaces in the selected cluster.
- The Go backend or log scanner may be logging an error—check their logs for clues.

---

### **What to Do Next**

1. Please run the two `curl` commands above and paste the outputs here.
2. If you see errors in the browser’s Network tab, paste those as well.
3. If you see errors in the Go backend or k8s log scanner logs, let me know.

Once I have this info, I’ll quickly pinpoint and fix the issue! 