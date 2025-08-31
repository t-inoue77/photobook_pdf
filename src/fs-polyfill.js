import { Buffer } from 'buffer';

// Individual fs functions for named exports
export const readFileSync = (path, encoding) => {
  console.warn(`fs.readFileSync called with path: ${path} - returning empty buffer`);
  const buffer = Buffer.alloc(0);
  return encoding ? buffer.toString(encoding) : buffer;
};

export const existsSync = (path) => {
  console.warn(`fs.existsSync called with path: ${path} - returning false`);
  return false;
};

export const readFile = (path, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  console.warn(`fs.readFile called with path: ${path} - returning empty buffer`);
  const buffer = Buffer.alloc(0);
  const result = options && options.encoding ? buffer.toString(options.encoding) : buffer;
  setTimeout(() => callback(null, result), 0);
};

export const writeFileSync = (path, data, options) => {
  console.warn(`fs.writeFileSync called with path: ${path} - no-op in browser`);
};

export const writeFile = (path, data, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  console.warn(`fs.writeFile called with path: ${path} - no-op in browser`);
  if (callback) setTimeout(() => callback(null), 0);
};

export const statSync = (path) => {
  console.warn(`fs.statSync called with path: ${path} - returning mock stat`);
  return {
    isFile: () => false,
    isDirectory: () => false,
    size: 0,
    mtime: new Date(),
    ctime: new Date(),
    atime: new Date()
  };
};

export const stat = (path, callback) => {
  console.warn(`fs.stat called with path: ${path} - returning mock stat`);
  const stat = {
    isFile: () => false,
    isDirectory: () => false,
    size: 0,
    mtime: new Date(),
    ctime: new Date(),
    atime: new Date()
  };
  setTimeout(() => callback(null, stat), 0);
};

// Default export as complete fs object
const fsPolyfill = {
  readFileSync,
  existsSync,
  readFile,
  writeFileSync,
  writeFile,
  statSync,
  stat
};

export default fsPolyfill;