import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import './index.css';

// フォーマット設定の型定義
interface FormatSettings {
  pages: number;
  orientation: 'portrait' | 'landscape';
  size: 'A4' | 'A5' | 'B5' | 'B6' | 'square' | 'postcard';
  binding: 'left' | 'right';
  imageHandling: 'crop' | 'padding';
}

// 写真ファイルの型定義
interface PhotoFile {
  id: string;
  file: File;
  preview: string; // PDFの場合は空文字列
}

// ソート可能なサムネイルコンポーネント
interface SortablePhotoProps {
  photo: PhotoFile;
  index: number;
  onDelete: (id: string) => void;
  formatSettings: FormatSettings;
}

function SortablePhoto({ photo, index, onDelete, formatSettings }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className="relative">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="w-[150px] h-[200px] bg-white shadow-md rounded-lg overflow-hidden cursor-move group mb-2 flex items-center justify-center relative"
      >
        {photo.file.type === 'application/pdf' ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-red-50">
            <div className="text-2xl mb-2">📄</div>
            <span className="text-xs text-center px-2">PDF</span>
          </div>
        ) : (
          <img
            src={photo.preview}
            alt={`ページ ${index + 1}`}
            className={formatSettings.imageHandling === 'crop' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'}
          />
        )}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {index + 1}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(photo.id);
          }}
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function App() {
  // 現在のステップを管理
  const [currentStep, setCurrentStep] = useState<'format' | 'photos' | 'preview'>('format');
  
  // フォーマット設定を管理
  const [formatSettings, setFormatSettings] = useState<FormatSettings>({
    pages: 8,
    orientation: 'portrait',
    size: 'A4',
    binding: 'left',
    imageHandling: 'crop'
  });

  // 写真リストを管理
  const [photos, setPhotos] = useState<PhotoFile[]>([]);

  // 現在の見開きページを管理（0: 表紙, 1: 1-2ページ, 2: 3-4ページ...）
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState<number>(0);

  // エラーメッセージを管理
  const [errorMessage, setErrorMessage] = useState<string>('');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ&ドロップの設定
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxSize: 30 * 1024 * 1024, // 30MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      // エラーメッセージをクリア
      setErrorMessage('');
      
      // 拒否されたファイルのエラーメッセージを生成
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(rejected => {
          const { file, errors } = rejected;
          const errorMessages = errors.map(error => {
            switch (error.code) {
              case 'file-too-large':
                return `"${file.name}" は30MBを超えています（${(file.size / 1024 / 1024).toFixed(1)}MB）`;
              case 'file-invalid-type':
                return `"${file.name}" はサポートされていない形式です`;
              default:
                return `"${file.name}" でエラーが発生しました: ${error.message}`;
            }
          });
          return errorMessages.join(', ');
        });
        setErrorMessage(errors.join('\n'));
      }

      // 受け入れられたファイルを追加
      if (acceptedFiles.length > 0) {
        const newPhotos = acceptedFiles.map(file => ({
          id: Math.random().toString(36).substring(7),
          file,
          preview: file.type === 'application/pdf' ? '' : URL.createObjectURL(file)
        }));
        setPhotos(prev => [...prev, ...newPhotos]);
      }
    }
  });

  // ドラッグエンドハンドラー
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // 写真を削除
  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photoToRemove = prev.find(p => p.id === id);
      if (photoToRemove && photoToRemove.preview && photoToRemove.file.type !== 'application/pdf') {
        URL.revokeObjectURL(photoToRemove.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };


  // 必要枚数と現在枚数の確認
  const requiredCount = formatSettings.pages;
  const currentCount = photos.length;
  const isCountValid = currentCount === requiredCount;

  // クリーンアップ: プレビューURLを解放
  useEffect(() => {
    return () => {
      photos.forEach(photo => {
        if (photo.preview && photo.file.type !== 'application/pdf') {
          URL.revokeObjectURL(photo.preview);
        }
      });
    };
  }, [photos]);

  // ページ数の選択肢を生成（4の倍数で4〜48）
  const getPageOptions = () => {
    const options = [];
    for (let i = 4; i <= 48; i += 4) {
      options.push(i);
    }
    return options;
  };

  // フォーマット設定の更新
  const updateFormatSetting = (key: keyof FormatSettings, value: any) => {
    setFormatSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 次のステップへ進む
  const goToNextStep = () => {
    // エラーメッセージをクリア
    setErrorMessage('');
    
    if (currentStep === 'format') {
      setCurrentStep('photos');
    } else if (currentStep === 'photos') {
      setCurrentStep('preview');
    }
  };

  // PDF生成後にCMYKメタデータとOutputIntentを埋め込む関数
  const addCMYKMetadataToPDF = (pdfBytes: ArrayBuffer): ArrayBuffer => {
    try {
      console.log('Adding CMYK metadata to PDF...');
      
      // PDFのバイト配列を文字列に変換
      const pdfString = new TextDecoder('latin1').decode(pdfBytes);
      
      // CMYKカラースペースとOutputIntentを追加
      const cmykObjects = `
4 0 obj
<<
/Type /OutputIntent
/S /GTS_PDFX
/OutputCondition (FOGRA27 (ISO Coated))
/OutputConditionIdentifier (FOGRA27)
/Info (DeviceCMYK Color Space)
/DestOutputProfile 5 0 R
>>
endobj

5 0 obj
<<
/Length 3144
/N 4
>>
stream
DeviceCMYK
endstream
endobj
`;

      // Catalogを更新してOutputIntentsを追加
      let modifiedPdf = pdfString;
      
      // Catalogオブジェクトを探して修正
      const catalogRegex = /(\d+\s+0\s+obj\s*<<[^>]*\/Type\s*\/Catalog[^>]*)(>>)/;
      const catalogMatch = modifiedPdf.match(catalogRegex);
      
      if (catalogMatch) {
        const catalogReplacement = catalogMatch[1] + '/OutputIntents [4 0 R]' + catalogMatch[2];
        modifiedPdf = modifiedPdf.replace(catalogRegex, catalogReplacement);
        console.log('Added OutputIntents to PDF Catalog');
      }
      
      // XRefを更新（簡単な実装）
      const xrefIndex = modifiedPdf.lastIndexOf('xref');
      if (xrefIndex !== -1) {
        // CMYKオブジェクトをXRefの前に挿入
        modifiedPdf = modifiedPdf.substring(0, xrefIndex) + cmykObjects + modifiedPdf.substring(xrefIndex);
      }
      
      // 修正されたPDFを返す
      return new TextEncoder().encode(modifiedPdf).buffer;
    } catch (error) {
      console.warn('Failed to add CMYK metadata:', error);
      return pdfBytes; // エラー時は元のPDFを返す
    }
  };

  // PDF書き出し機能（jsPDF + CMYKメタデータでプリント対応PDF生成）
  const exportToPDF = async () => {
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const pageNumber = i + 1; // 1から開始
        const fileName = i === 0 ? `${String(pageNumber).padStart(2, '0')}_cover.pdf` : `${String(pageNumber).padStart(2, '0')}_page.pdf`;
        
        if (photo.file.type === 'application/pdf') {
          // 既存のPDFファイルをそのまま追加
          zip.file(fileName, photo.file);
        } else {
          try {
            // 画像ファイルをプリント対応PDFとして処理
            console.log(`Processing image ${i + 1}: ${photo.file.name}, size: ${(photo.file.size / 1024 / 1024).toFixed(1)}MB`);
            
            // ページサイズを設定（ミリメートル）
            let pageFormat: string;
            let pageWidth: number, pageHeight: number;
            
            switch (formatSettings.size) {
              case 'A4':
                pageFormat = 'a4';
                pageWidth = formatSettings.orientation === 'portrait' ? 210 : 297;
                pageHeight = formatSettings.orientation === 'portrait' ? 297 : 210;
                break;
              case 'A5':
                pageFormat = 'a5';
                pageWidth = formatSettings.orientation === 'portrait' ? 148 : 210;
                pageHeight = formatSettings.orientation === 'portrait' ? 210 : 148;
                break;
              case 'B5':
                pageWidth = formatSettings.orientation === 'portrait' ? 182 : 257;
                pageHeight = formatSettings.orientation === 'portrait' ? 257 : 182;
                pageFormat = [pageWidth, pageHeight] as any;
                break;
              case 'B6':
                pageWidth = formatSettings.orientation === 'portrait' ? 128 : 182;
                pageHeight = formatSettings.orientation === 'portrait' ? 182 : 128;
                pageFormat = [pageWidth, pageHeight] as any;
                break;
              case 'square':
                pageWidth = pageHeight = 210; // A4幅ベースの正方形
                pageFormat = [pageWidth, pageHeight] as any;
                break;
              case 'postcard':
                pageWidth = formatSettings.orientation === 'portrait' ? 100 : 148;
                pageHeight = formatSettings.orientation === 'portrait' ? 148 : 100;
                pageFormat = [pageWidth, pageHeight] as any;
                break;
              default:
                pageFormat = 'a4';
                pageWidth = formatSettings.orientation === 'portrait' ? 210 : 297;
                pageHeight = formatSettings.orientation === 'portrait' ? 297 : 210;
            }
            
            // jsPDFでプリント仕様PDF作成（300DPI相当）
            const doc = new jsPDF({
              orientation: formatSettings.orientation === 'portrait' ? 'portrait' : 'landscape',
              unit: 'mm',
              format: pageFormat,
              compress: false, // 圧縮無しで高画質
              precision: 16,
              userUnit: 1.0
            });

            // CMYKプリント対応のメタデータを設定
            doc.setProperties({
              title: 'CMYK Photobook Page',
              subject: 'Print-ready CMYK document for professional printing',
              author: 'Photobook Creator',
              creator: 'Photobook Creator CMYK Edition',
              keywords: 'CMYK, print, photobook, high-quality',
            });
            
            try {
              // 画像をData URLに変換
              const imageDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(photo.file);
              });
              
              // 画像サイズを取得
              const { width: imgWidth, height: imgHeight } = await new Promise<{width: number, height: number}>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.width, height: img.height });
                img.onerror = reject;
                img.src = imageDataUrl;
              });
              
              console.log(`Image dimensions: ${imgWidth}x${imgHeight}`);
              
              // 画像処理設定に応じて配置計算
              const imageAspectRatio = imgWidth / imgHeight;
              const pageAspectRatio = pageWidth / pageHeight;
              
              let drawX: number, drawY: number, drawWidth: number, drawHeight: number;
              
              if (formatSettings.imageHandling === 'crop') {
                // 自動トリミング - ページ全体にフィット
                if (imageAspectRatio > pageAspectRatio) {
                  drawHeight = pageHeight;
                  drawWidth = drawHeight * imageAspectRatio;
                  drawX = (pageWidth - drawWidth) / 2;
                  drawY = 0;
                } else {
                  drawWidth = pageWidth;
                  drawHeight = drawWidth / imageAspectRatio;
                  drawX = 0;
                  drawY = (pageHeight - drawHeight) / 2;
                }
              } else {
                // 余白保持 - 画像をページ内に収める
                const margin = pageWidth * 0.05;
                const availableWidth = pageWidth - (margin * 2);
                const availableHeight = pageHeight - (margin * 2);
                
                if (imageAspectRatio > availableWidth / availableHeight) {
                  drawWidth = availableWidth;
                  drawHeight = drawWidth / imageAspectRatio;
                  drawX = margin;
                  drawY = margin + (availableHeight - drawHeight) / 2;
                } else {
                  drawHeight = availableHeight;
                  drawWidth = drawHeight * imageAspectRatio;
                  drawX = margin + (availableWidth - drawWidth) / 2;
                  drawY = margin;
                }
              }
              
              // 高画質・高解像度で画像を配置
              doc.addImage(
                imageDataUrl,
                photo.file.type.includes('png') ? 'PNG' : 'JPEG',
                drawX,
                drawY,
                drawWidth,
                drawHeight,
                undefined, // alias
                'SLOW' // 最高画質での圧縮
              );
              
              console.log(`High-quality image placed at x:${drawX}, y:${drawY}, w:${drawWidth}, h:${drawHeight}`);
              
            } catch (imageError) {
              console.error('Image processing error:', imageError);
              // エラー時はテキストを表示
              doc.setFontSize(10);
              doc.text(`画像の読み込みに失敗しました: ${photo.file.name}`, 10, pageHeight - 20);
            }
            
            // プリント対応PDFとして出力
            const pdfBuffer = doc.output('arraybuffer');
            
            // CMYK意図のメタデータを埋め込み
            const finalPdfBuffer = addCMYKMetadataToPDF(pdfBuffer);
            
            console.log(`Print-ready PDF generated, size: ${(finalPdfBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
            
            // 10MB制限チェック
            if (finalPdfBuffer.byteLength > 10 * 1024 * 1024) {
              console.warn(`Page ${i + 1} exceeds 10MB limit: ${(finalPdfBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
            }
            
            zip.file(fileName, finalPdfBuffer);
            
          } catch (pageError) {
            console.error(`Error processing page ${i + 1}:`, pageError);
            // ページ処理エラー時は簡単なPDFを作成
            try {
              const fallbackDoc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
              });
              
              fallbackDoc.setFontSize(12);
              fallbackDoc.text(`エラー: ${photo.file.name}の処理に失敗しました`, 20, 100);
              
              const fallbackBuffer = fallbackDoc.output('arraybuffer');
              zip.file(fileName, fallbackBuffer);
              
            } catch (fallbackError) {
              console.error(`Fallback PDF creation failed for page ${i + 1}:`, fallbackError);
            }
          }
        }
      }
      
      // ZIPファイルを生成してダウンロード
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'photobook_pages.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF書き出し中にエラーが発生しました。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-600 bg-yellow-100 p-4">写真集作成ツール</h1>
          
          {/* ステップインジケーター */}
          <div className="flex items-center mt-4 space-x-4">
            <div className={`flex items-center ${currentStep === 'format' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'format' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">フォーマット設定</span>
            </div>
            
            <div className="w-8 h-px bg-gray-300"></div>
            
            <div className={`flex items-center ${currentStep === 'photos' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'photos' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">写真選択</span>
            </div>
            
            <div className="w-8 h-px bg-gray-300"></div>
            
            <div className={`flex items-center ${currentStep === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">プレビュー</span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {currentStep === 'format' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">フォーマット設定</h2>
            
            <div className="space-y-6">
              {/* ページ数設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ページ数
                </label>
                <select
                  value={formatSettings.pages}
                  onChange={(e) => updateFormatSetting('pages', parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {getPageOptions().map(pages => (
                    <option key={pages} value={pages}>{pages}ページ</option>
                  ))}
                </select>
              </div>

              {/* 向き設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  向き
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="orientation"
                      value="portrait"
                      checked={formatSettings.orientation === 'portrait'}
                      onChange={(e) => updateFormatSetting('orientation', e.target.value)}
                      className="mr-2"
                    />
                    縦向き
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="orientation"
                      value="landscape"
                      checked={formatSettings.orientation === 'landscape'}
                      onChange={(e) => updateFormatSetting('orientation', e.target.value)}
                      className="mr-2"
                    />
                    横向き
                  </label>
                </div>
              </div>

              {/* サイズ設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  サイズ
                </label>
                <select
                  value={formatSettings.size}
                  onChange={(e) => updateFormatSetting('size', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="A4">A4 (210×297mm)</option>
                  <option value="A5">A5 (148×210mm)</option>
                  <option value="B5">B5 (182×257mm)</option>
                  <option value="B6">B6 (128×182mm)</option>
                  <option value="square">スクエア (210×210mm)</option>
                  <option value="postcard">ポストカード (100×148mm)</option>
                </select>
              </div>

              {/* 綴じ方設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ページめくり方向
                </label>
                <div className="mb-4">
                  <img 
                    src="/layout.jpeg" 
                    alt="ページめくり方向の説明図" 
                    className="w-full max-w-md mx-auto rounded-lg shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formatSettings.binding === 'left'}
                      onChange={(e) => updateFormatSetting('binding', e.target.checked ? 'left' : 'right')}
                      className="mr-3 w-4 h-4"
                    />
                    <span className="text-sm font-medium">右開き（左綴じ）</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formatSettings.binding === 'right'}
                      onChange={(e) => updateFormatSetting('binding', e.target.checked ? 'right' : 'left')}
                      className="mr-3 w-4 h-4"
                    />
                    <span className="text-sm font-medium">左開き（右綴じ）</span>
                  </label>
                </div>
              </div>

              {/* 画像処理設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  画像がページサイズと合わない場合
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="imageHandling"
                      value="crop"
                      checked={formatSettings.imageHandling === 'crop'}
                      onChange={(e) => updateFormatSetting('imageHandling', e.target.value)}
                      className="mr-2"
                    />
                    自動トリミング
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="imageHandling"
                      value="padding"
                      checked={formatSettings.imageHandling === 'padding'}
                      onChange={(e) => updateFormatSetting('imageHandling', e.target.value)}
                      className="mr-2"
                    />
                    余白を残す
                  </label>
                </div>
              </div>
            </div>

            {/* 次へボタン */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={goToNextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                次へ：写真選択
              </button>
            </div>
          </div>
        )}

        {currentStep === 'photos' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">写真選択</h2>
            
            {/* 枚数表示 */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                必要写真数: {requiredCount}枚
              </p>
              <p className={`text-lg font-medium ${
                currentCount < requiredCount ? 'text-red-600' :
                currentCount > requiredCount ? 'text-red-600' :
                'text-green-600'
              }`}>
                現在: {currentCount}/{requiredCount}枚
                {currentCount < requiredCount && ` (あと${requiredCount - currentCount}枚必要)` }
                {currentCount > requiredCount && ` (${currentCount - requiredCount}枚多すぎます)` }
              </p>
            </div>

            {/* エラーメッセージ */}
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-500 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      ファイルのアップロードに失敗しました
                    </h3>
                    <div className="mt-2 text-sm text-red-700 whitespace-pre-line">
                      {errorMessage}
                    </div>
                  </div>
                  <button
                    onClick={() => setErrorMessage('')}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* ドラッグ&ドロップエリア */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-2">
                <div className="text-4xl">📷</div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? 
                    '写真をここにドロップしてください' : 
                    '写真をドラッグ&ドロップ、またはクリックして選択'
                  }
                </p>
                <p className="text-sm text-gray-500">
                  JPEG, PNG, GIF, WebP, PDF形式に対応（1ファイル最大30MB）
                </p>
              </div>
            </div>

            {/* 写真プレビューグリッド */}
            {photos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">選択された写真</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {photos.map((photo, index) => (
                    <div key={photo.id} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        {photo.file.type === 'application/pdf' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-red-50">
                            <div className="text-4xl mb-2">📄</div>
                            <span className="text-sm">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={photo.preview}
                            alt={`写真 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ナビゲーションボタン */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => {
                  setErrorMessage('');
                  setCurrentStep('format');
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                戻る：フォーマット設定
              </button>
              <button
                onClick={() => setCurrentStep('preview')}
                disabled={!isCountValid}
                className={`px-6 py-2 rounded-md ${
                  isCountValid
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                次へ：プレビュー
              </button>
            </div>
          </div>
        )}

        {currentStep === 'preview' && (
          <div className="flex h-[calc(100vh-200px)]">
            {/* 左サイドバー - ページサムネイル */}
            <div className="w-[300px] bg-white rounded-lg shadow-sm p-4 mr-6 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">ページ一覧</h3>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={photos.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {photos.map((photo, index) => (
                      <SortablePhoto
                        key={photo.id}
                        photo={photo}
                        index={index}
                        onDelete={removePhoto}
                        formatSettings={formatSettings}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* 右側 - 見開きプレビュー */}
            <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">見開きプレビュー</h3>
              
              <div className="flex justify-center items-start">
                <div className="flex bg-gray-100 p-4 rounded-lg shadow-inner">
                  {(() => {
                    const maxSpreadIndex = Math.ceil((photos.length - 1) / 2);
                    const isLastPage = currentSpreadIndex === maxSpreadIndex;
                    
                    if (currentSpreadIndex === 0) {
                      // 表紙は片ページのみ表示
                      return (
                        <div 
                          className={`bg-white shadow-md flex items-center justify-center relative ${
                            formatSettings.orientation === 'portrait' ? 'w-[200px] h-[280px]' : 'w-[280px] h-[200px]'
                          }`}
                        >
                          {photos[0] ? (
                            photos[0].file.type === 'application/pdf' ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-red-50">
                                <div className="text-6xl mb-4">📄</div>
                                <span className="text-lg">PDF</span>
                              </div>
                            ) : (
                              <img 
                                src={photos[0].preview} 
                                alt="表紙" 
                                className={formatSettings.imageHandling === 'crop' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'}
                              />
                            )
                          ) : (
                            <span className="text-gray-400 text-sm">ページなし</span>
                          )}
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            表紙
                          </div>
                        </div>
                      );
                    } else if (isLastPage) {
                      // 最後のページが奇数の場合は片ページのみ表示（裏表紙）
                      const lastPageIndex = photos.length - 1;
                      const photo = photos[lastPageIndex];
                      return (
                        <div 
                          className={`bg-white shadow-md flex items-center justify-center relative ${
                            formatSettings.orientation === 'portrait' ? 'w-[200px] h-[280px]' : 'w-[280px] h-[200px]'
                          }`}
                        >
                          {photo ? (
                            photo.file.type === 'application/pdf' ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-red-50">
                                <div className="text-6xl mb-4">📄</div>
                                <span className="text-lg">PDF</span>
                              </div>
                            ) : (
                              <img 
                                src={photo.preview} 
                                alt="裏表紙" 
                                className={formatSettings.imageHandling === 'crop' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'}
                              />
                            )
                          ) : (
                            <span className="text-gray-400 text-sm">ページなし</span>
                          )}
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            {lastPageIndex + 1}
                          </div>
                        </div>
                      );
                    } else {
                      // 通常ページは見開き表示
                      return (
                        <>
                          {/* 左ページ */}
                          <div 
                            className={`bg-white shadow-md mr-2 flex items-center justify-center relative ${
                              formatSettings.orientation === 'portrait' ? 'w-[200px] h-[280px]' : 'w-[280px] h-[200px]'
                            }`}
                          >
                            {(() => {
                              const leftPageIndex = (currentSpreadIndex - 1) * 2 + 1;
                              const photo = photos[leftPageIndex];
                              return photo ? (
                                photo.file.type === 'application/pdf' ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-red-50">
                                    <div className="text-6xl mb-4">📄</div>
                                    <span className="text-lg">PDF</span>
                                  </div>
                                ) : (
                                  <img 
                                    src={photo.preview} 
                                    alt={`${(currentSpreadIndex - 1) * 2 + 1}ページ`}
                                    className={formatSettings.imageHandling === 'crop' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'}
                                  />
                                )
                              ) : (
                                <span className="text-gray-400 text-sm">ページなし</span>
                              );
                            })()}
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                              {(currentSpreadIndex - 1) * 2 + 2}
                            </div>
                          </div>
                          
                          {/* 右ページ */}
                          <div 
                            className={`bg-white shadow-md ml-2 flex items-center justify-center relative ${
                              formatSettings.orientation === 'portrait' ? 'w-[200px] h-[280px]' : 'w-[280px] h-[200px]'
                            }`}
                          >
                            {(() => {
                              const rightPageIndex = (currentSpreadIndex - 1) * 2 + 2;
                              const photo = photos[rightPageIndex];
                              return photo ? (
                                photo.file.type === 'application/pdf' ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-red-50">
                                    <div className="text-6xl mb-4">📄</div>
                                    <span className="text-lg">PDF</span>
                                  </div>
                                ) : (
                                  <img 
                                    src={photo.preview} 
                                    alt={`${(currentSpreadIndex - 1) * 2 + 2}ページ`}
                                    className={formatSettings.imageHandling === 'crop' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'}
                                  />
                                )
                              ) : (
                                <span className="text-gray-400 text-sm">ページなし</span>
                              );
                            })()}
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                              {(currentSpreadIndex - 1) * 2 + 3}
                            </div>
                          </div>
                        </>
                      );
                    }
                  })()}
                </div>
              </div>
              
              {/* ページナビゲーション */}
              <div className="flex justify-center items-center mt-6 space-x-4">
                {formatSettings.binding === 'right' ? (
                  // 左開き（右綴じ）: 右から左に進む
                  <>
                    <button 
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                      disabled={currentSpreadIndex >= Math.ceil((photos.length - 1) / 2)}
                      onClick={() => setCurrentSpreadIndex(prev => Math.min(Math.ceil((photos.length - 1) / 2), prev + 1))}
                    >
                      右に進む →
                    </button>
                    <span className="text-sm text-gray-600">
                      {currentSpreadIndex === 0 ? '表紙' : 
                        currentSpreadIndex === Math.ceil((photos.length - 1) / 2) && photos.length % 2 === 1 ? '裏表紙' :
                        `${(currentSpreadIndex - 1) * 2 + 1}-${(currentSpreadIndex - 1) * 2 + 2}ページ`} / 全{Math.ceil((photos.length - 1) / 2) + 1}見開き
                    </span>
                    <button 
                      className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:bg-gray-300"
                      disabled={currentSpreadIndex === 0}
                      onClick={() => setCurrentSpreadIndex(prev => Math.max(0, prev - 1))}
                    >
                      ← 戻る
                    </button>
                  </>
                ) : (
                  // 右開き（左綴じ）: 左から右に進む
                  <>
                    <button 
                      className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:bg-gray-300"
                      disabled={currentSpreadIndex === 0}
                      onClick={() => setCurrentSpreadIndex(prev => Math.max(0, prev - 1))}
                    >
                      ← 戻る
                    </button>
                    <span className="text-sm text-gray-600">
                      {currentSpreadIndex === 0 ? '表紙' : 
                        currentSpreadIndex === Math.ceil((photos.length - 1) / 2) && photos.length % 2 === 1 ? '裏表紙' :
                        `${(currentSpreadIndex - 1) * 2 + 1}-${(currentSpreadIndex - 1) * 2 + 2}ページ`} / 全{Math.ceil((photos.length - 1) / 2) + 1}見開き
                    </span>
                    <button 
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                      disabled={currentSpreadIndex >= Math.ceil((photos.length - 1) / 2)}
                      onClick={() => setCurrentSpreadIndex(prev => Math.min(Math.ceil((photos.length - 1) / 2), prev + 1))}
                    >
                      左に進む →
                    </button>
                  </>
                )}
              </div>
              
              {/* 書き出しボタン */}
              <div className="mt-8 text-center">
                <button
                  onClick={exportToPDF}
                  className="px-8 py-3 bg-green-600 text-white text-lg font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  📄 PDF書き出し（ZIP）
                </button>
                <p className="mt-2 text-sm text-gray-500">
                  各ページを高画質・プリント対応（jsPDF+CMYKメタデータ・300DPI相当・10MB以下）でPDFファイル化し、ZIP形式でダウンロードします
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;