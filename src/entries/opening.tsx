// Entry for opening.html (spec 07 Requirement 8.1). A separate page: the main page's immersion rule (spec 04) is untouched.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OpeningFrame } from '../scenes/OpeningFrame';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/motion.css';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <OpeningFrame />
  </StrictMode>,
);