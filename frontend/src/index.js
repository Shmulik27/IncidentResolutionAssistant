import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const root = ReactDOM.createRoot(document.getElementById('root'));

function Main() {
  // Default to light mode, will be controlled by App via context or prop
  const [mode, setMode] = React.useState('light');
  const theme = React.useMemo(() => createTheme({
    palette: {
      mode,
    },
  }), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <App setMode={setMode} mode={mode} />
    </ThemeProvider>
  );
}

root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
); 