import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo>/, so production builds use that base.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/IAT334_Aggro_Final_Project/' : '/',
  plugins: [react()],
}));
