declare module 'pdfkit-cmyk' {
  import { EventEmitter } from 'events';

  interface PDFDocumentOptions {
    colorSpace?: 'cmyk' | 'rgb' | 'gray';
    size?: [number, number] | string;
    margin?: number;
    compress?: boolean;
    info?: {
      Title?: string;
      Creator?: string;
      Author?: string;
      Subject?: string;
    };
  }

  interface ImageOptions {
    width?: number;
    height?: number;
    fit?: [number, number];
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'center' | 'bottom';
  }

  class PDFDocument extends EventEmitter {
    constructor(options?: PDFDocumentOptions);
    
    image(src: Buffer | string, x?: number, y?: number, options?: ImageOptions): this;
    image(src: Buffer | string, options?: ImageOptions): this;
    
    addPage(options?: { size?: [number, number]; margin?: number }): this;
    
    fillColor(color: string): this;
    fontSize(size: number): this;
    text(text: string, x?: number, y?: number, options?: any): this;
    
    end(): void;
    
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  export default PDFDocument;
}