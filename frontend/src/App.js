import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery,
  Collapse,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  BugReport as BugReportIcon,
  PlayArrow as TestIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Menu as MenuIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  ExpandLess,
  ExpandMore,
  Brightness4,
  Brightness7
} from '@mui/icons-material';
import IncidentAnalyzer from './components/IncidentAnalyzer';
import TestRunner from './components/TestRunner';
import Configuration from './components/Configuration';
import K8sLogScanner from './components/K8sLogScanner';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import RealTimeMetrics from './components/RealTimeMetrics';
import IncidentAnalytics from './components/IncidentAnalytics';
import ApplicationMonitoring from './components/ApplicationMonitoring';
import ErrorBoundary from './components/ErrorBoundary';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDVfdoB6MBHmRt6tR6FUwwLb_Zow8dmUYQ',
  authDomain: 'incident-assistant-frontend.firebaseapp.com',
  // ...other config from Firebase console
};
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const drawerWidth = 240;

const menuItems = [
  { text: 'Incident Dashboard', icon: <AssessmentIcon />, path: '/incident-dashboard' },
  { text: 'Application Monitoring', icon: <TimelineIcon />, path: '/monitoring' },
  { text: 'Incident Analyzer', icon: <BugReportIcon />, path: '/analyzer' },
  { text: 'K8s Log Scanner', icon: <StorageIcon />, path: '/k8s' },
  { text: 'Configuration', icon: <SettingsIcon />, path: '/config' }
];

const NotificationContext = React.createContext({ notify: () => {} });

function AppContent({ setMode, mode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState({});
  const location = useLocation();
  const [notification, setNotification] = React.useState({ open: false, message: '', severity: 'info' });
  const notify = (message, severity = 'info') => setNotification({ open: true, message, severity });
  const handleClose = () => setNotification(n => ({ ...n, open: false }));
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('firebaseToken', token);
      } else {
        setUser(null);
        localStorage.removeItem('firebaseToken');
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper to flatten menuItems for lookup
  const flattenMenu = (items, parent = null) => {
    let flat = [];
    for (const item of items) {
      flat.push({ ...item, parent });
      if (item.children) {
        flat = flat.concat(flattenMenu(item.children, item));
      }
    }
    return flat;
  };
  const flatMenu = flattenMenu(menuItems);

  const handleLogin = async () => {
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      notify('Login failed: ' + err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      notify('Logout failed: ' + err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Incident Assistant
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem button key={item.text} component={RouterLink} to={item.path} selected={location.pathname === item.path}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  // If not authenticated, show login screen
  if (!user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Incident Assistant Login</Typography>
        <button onClick={handleLogin} disabled={authLoading} style={{ fontSize: 18, padding: '12px 32px', borderRadius: 6, background: '#4285F4', color: 'white', border: 'none', cursor: 'pointer' }}>
          {authLoading ? 'Redirecting...' : 'Login with Google'}
        </button>
      </Box>
    );
  }

  // Main app UI when authenticated
  return (
    <NotificationContext.Provider value={{ notify }}>
      <ErrorBoundary>
        <Box sx={{ display: 'flex' }}>
          <AppBar
            position="fixed"
            sx={{
              width: { md: `calc(100% - ${drawerWidth}px)` },
              ml: { md: `${drawerWidth}px` },
            }}
          >
            <Toolbar sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    sx={{ mr: 2, display: { md: 'none' } }}
                  >
                    <MenuIcon />
                  </IconButton>
                  <Typography variant="h6" noWrap component="div">
                    AI-Powered Incident Resolution Assistant
                  </Typography>
                </Box>
                <Box>
                  <IconButton sx={{ ml: 1 }} color="inherit" onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
                    {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                  </IconButton>
                  <button onClick={handleLogout} style={{ marginLeft: 16, fontSize: 16, padding: '6px 18px', borderRadius: 4, background: '#eee', border: 'none', cursor: 'pointer' }}>Logout</button>
                </Box>
              </Box>
            </Toolbar>
          </AppBar>
          <Drawer
            variant={isMobile ? 'temporary' : 'permanent'}
            open={isMobile ? mobileOpen : true}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
              display: { xs: 'block', md: 'block' },
            }}
          >
            {drawer}
          </Drawer>
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { md: `calc(100% - ${drawerWidth}px)` },
              mt: 8
            }}
          >
            <Routes>
              <Route path="/" element={<IncidentAnalytics />} />
              <Route path="/monitoring" element={<ApplicationMonitoring />} />
              <Route path="/incident-dashboard" element={<IncidentAnalytics />} />
              <Route path="/analyzer" element={<IncidentAnalyzer />} />
              <Route path="/k8s" element={<K8sLogScanner />} />
              <Route path="/config" element={<Configuration />} />
            </Routes>
          </Box>
        </Box>
        <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <MuiAlert onClose={handleClose} severity={notification.severity} sx={{ width: '100%' }} elevation={6} variant="filled">
            {notification.message}
          </MuiAlert>
        </Snackbar>
      </ErrorBoundary>
    </NotificationContext.Provider>
  );
}

function App({ setMode, mode }) {
  return (
    <Router>
      <AppContent setMode={setMode} mode={mode} />
    </Router>
  );
}

export { NotificationContext };
export default App;