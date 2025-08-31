# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React TypeScript application for creating photo books ("写真集作成ツール"). The app provides a multi-step wizard interface allowing users to:

1. Configure photobook format settings (pages, orientation, size, binding, image handling)
2. Upload and manage photos via drag-and-drop
3. Preview the final photobook layout

## Development Commands

### Start Development Server
```bash
npm start
```
Runs the app in development mode at http://localhost:3000

### Build for Production
```bash
npm run build
```
Creates optimized production build in the `build/` folder

### Run Tests
```bash
npm test
```
Launches Jest test runner in interactive watch mode

### TypeScript Checking
TypeScript checking is handled by Create React App's build process. No separate typecheck command is available.

### Linting
ESLint is configured through Create React App's built-in setup. No separate lint command is defined.

## Tech Stack & Architecture

- **Framework**: React 19.1.0 with TypeScript
- **Build Tool**: Create React App (react-scripts)
- **Styling**: Tailwind CSS 4.x with PostCSS
- **File Upload**: react-dropzone for drag-and-drop functionality
- **State Management**: React useState hooks (no external state management)

## Application Architecture

### Main Component Structure
- `src/App.tsx`: Single-page application with step-based wizard interface
- `src/index.tsx`: React app entry point with React.StrictMode
- Configuration files: `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`

### Core Data Types
```typescript
interface FormatSettings {
  pages: number;           // 4-48 pages in multiples of 4
  orientation: 'portrait' | 'landscape';
  size: 'A4' | 'A5' | 'B5' | 'B6' | 'square' | 'postcard';
  binding: 'left' | 'right';
  imageHandling: 'crop' | 'padding';
}

interface PhotoFile {
  id: string;
  file: File;
  preview: string;        // Object URL for preview
}
```

### State Management Pattern
The app uses a single component with multiple useState hooks:
- `currentStep`: Controls wizard navigation ('format' | 'photos' | 'preview')
- `formatSettings`: Stores all photobook configuration
- `photos`: Array of uploaded photos with preview URLs

### Key Features
- **Step Navigation**: Three-step wizard with visual progress indicator
- **File Upload**: react-dropzone with support for multiple image formats
- **Photo Management**: Preview thumbnails with delete functionality and automatic count validation
- **Memory Management**: Proper cleanup of Object URLs to prevent memory leaks

## Development Notes

### Tailwind CSS Configuration
- Uses Tailwind CSS 4.x (latest version at time of creation)
- Content scanning configured for `src/**/*.{js,jsx,ts,tsx}`
- PostCSS setup with autoprefixer

### Image Handling
- Supported formats: JPEG, PNG, GIF, BMP, WebP
- Uses URL.createObjectURL() for previews with proper cleanup
- Photo count validation against selected page count

### Incomplete Features
- Preview step (step 3) is not yet implemented - shows placeholder text
- Actual photobook generation/export functionality not implemented