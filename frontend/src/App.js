import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link as RouterLink } from 'react-router-dom';
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

const drawerWidth = 240;

const menuItems = [
  { text: 'Application Monitoring', icon: <AnalyticsIcon />, path: '/monitoring' },
  { text: 'Incident Dashboard', icon: <AssessmentIcon />, path: '/incident-dashboard' },
  { text: 'Incident Analyzer', icon: <BugReportIcon />, path: '/analyzer' },
  { text: 'K8s Log Scanner', icon: <StorageIcon />, path: '/k8s' },
  { text: 'Configuration', icon: <SettingsIcon />, path: '/config' }
];

function AppContent({ setMode, mode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState({});
  const location = useLocation();

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

  // Build breadcrumbs from current location
  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(Boolean);
    let currPath = '';
    const crumbs = [];
    for (let i = 0; i < pathnames.length; i++) {
      currPath += '/' + pathnames[i];
      // Find menu item for this path
      const match = flatMenu.find(item => item.path === currPath);
      if (match) {
        crumbs.push({ text: match.text, path: match.path });
      }
    }
    return crumbs;
  };
  const breadcrumbs = getBreadcrumbs();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuExpand = (item) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [item.text]: !prev[item.text]
    }));
  };

  const renderMenuItems = (items) => (
    items.map((item) => (
      item.children ? (
        <React.Fragment key={item.text}>
          <ListItem 
            button
            onClick={() => handleMenuExpand(item)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
            {expandedMenus[item.text] ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={expandedMenus[item.text]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 4 }}>
              {renderMenuItems(item.children)}
            </List>
          </Collapse>
        </React.Fragment>
      ) : (
        <ListItem 
          button 
          key={item.text}
          component="a"
          href={item.path}
          onClick={() => isMobile && setMobileOpen(false)}
          sx={item.path.startsWith('/dashboard/') ? { pl: 4 } : {}}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItem>
      )
    ))
  );

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Incident Assistant
        </Typography>
      </Toolbar>
      <List>
        {renderMenuItems(menuItems)}
      </List>
    </Box>
  );

  return (
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
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div">
                AI-Powered Incident Resolution Assistant
              </Typography>
            </Box>
            <IconButton sx={{ ml: 1 }} color="inherit" onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 1 }}>
            {breadcrumbs.map((crumb, idx) => (
              idx < breadcrumbs.length - 1 ? (
                <MuiLink
                  key={crumb.path}
                  component={RouterLink}
                  to={crumb.path}
                  underline="hover"
                  color="inherit"
                >
                  {crumb.text}
                </MuiLink>
              ) : (
                <Typography key={crumb.path} color="text.primary">
                  {crumb.text}
                </Typography>
              )
            ))}
          </Breadcrumbs>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

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
          <Route path="/" element={<ApplicationMonitoring />} />
          <Route path="/monitoring" element={<ApplicationMonitoring />} />
          <Route path="/incident-dashboard" element={<IncidentAnalytics />} />
          <Route path="/analyzer" element={<IncidentAnalyzer />} />
          <Route path="/k8s" element={<K8sLogScanner />} />
          <Route path="/config" element={<Configuration />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App({ setMode, mode }) {
  return (
    <Router>
      <AppContent setMode={setMode} mode={mode} />
    </Router>
  );
}

export default App; 