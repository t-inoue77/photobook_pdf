/* eslint-disable no-undef, no-restricted-globals */
// linebreak module用のpolyfill

import { Buffer } from 'buffer';

// Unicode data用のダミーデータを作成
const createDummyUnicodeData = () => {
  // 最小限のUnicodeテーブルデータを作成
  const size = 1024;
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  
  // ヘッダー情報を設定
  view.setUint32(0, 0x12345678, true); // magic number
  view.setUint32(4, 1, true); // version
  view.setUint32(8, size - 16, true); // data size
  view.setUint32(12, 16, true); // data offset
  
  // デフォルトの改行ルールを設定
  for (let i = 16; i < size; i += 4) {
    view.setUint32(i, 0x00000001, true); // default break opportunity
  }
  
  return buffer;
};

// fs polyfillを拡張してlinebreak用のファイルを提供
const originalReadFileSync = globalThis.fs?.readFileSync || (() => Buffer.alloc(0));

const linebreakReadFileSync = (path, encoding) => {
  console.warn(`linebreak fs.readFileSync called with path: ${path}`);
  
  // linebreak用のファイル要求を検出
  if (typeof path === 'string' && path.includes('linebreak')) {
    console.log('Providing dummy Unicode data for linebreak module');
    const dummyData = createDummyUnicodeData();
    const buffer = Buffer.from(dummyData);
    return encoding ? buffer.toString(encoding) : buffer;
  }
  
  // その他のファイル要求は元の処理に委譲
  return originalReadFileSync(path, encoding);
};

// fs polyfillを更新
if (globalThis.fs) {
  globalThis.fs.readFileSync = linebreakReadFileSync;
}

if (typeof window !== 'undefined' && window.fs) {
  window.fs.readFileSync = linebreakReadFileSync;
}

export default linebreakReadFileSync;