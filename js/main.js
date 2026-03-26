import React from 'react';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { App } from './app.js';

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));
