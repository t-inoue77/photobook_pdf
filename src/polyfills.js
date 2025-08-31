/* eslint-disable no-undef, no-restricted-globals */
// ブラウザ環境でのNode.js polyfills
import { Buffer } from 'buffer';
import { Readable } from 'stream-browserify';
import fsPolyfill from './fs-polyfill';
import './linebreak-polyfill'; // linebreak用のpolyfill

// グローバルオブジェクトに追加
window.Buffer = Buffer;
const globalObj = (function() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  if (typeof self !== 'undefined') return self;
  return window;
})();

globalObj.Buffer = Buffer;

window.process = {
  env: {},
  nextTick: (fn) => setTimeout(fn, 0),
  browser: true,
  version: 'v16.0.0',
  versions: { node: '16.0.0' }
};

globalObj.process = window.process;
window.global = window;
globalObj.global = globalObj;

// fs polyfill - set in multiple places to ensure it's available
window.fs = fsPolyfill;
globalObj.fs = fsPolyfill;

if (typeof global !== 'undefined') {
  global.fs = fsPolyfill;
}

// Also export for module resolution
export { Buffer, Readable };
export { fsPolyfill as fs };