import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import { pipeline } from '@xenova/transformers';
import jsQR from 'jsqr';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, FileText, Brain, QrCode, Loader2, ImagePlus, X, Trash2, Maximize2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export interface ImageAnalysisResult {
  type: 'text' | 'scene' | 'qr';
  content: string;
  confidence?: number;
  id: string;
}

interface ImageAnalysisProps {
  onAnalysisComplete?: (results: ImageAnalysisResult[]) => void;
}

export function ImageAnalysis({ onAnalysisComplete }: ImageAnalysisProps) {
  const [results, setResults] = useState<ImageAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showFullImage, setShowFullImage] = useState(false);

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type || 'image/jpeg'
    };
    try {
      return await imageCompression(file, options);
    } catch (err) {
      console.error('Image compression error:', err);
      throw new Error('Failed to compress image');
    }
  };

  const loadImage = async (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  const clearImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
    setResults([]);
    setError(null);
    setAnalysisProgress(0);
    setShowFullImage(false);
    onAnalysisComplete?.([]);
  };

  const analyzeImage = async (file: File) => {
    setLoading(true);
    setError(null);
    setAnalysisProgress(0);
    const results: ImageAnalysisResult[] = [];

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please upload an image.');
      }

      const compressedFile = await compressImage(file);
      const imageUrl = URL.createObjectURL(compressedFile);
      setPreviewImage(imageUrl);
      const img = await loadImage(imageUrl);

      const updateProgress = () => {
        setAnalysisProgress(prev => Math.min(prev + 33, 95));
      };

      const [ocrResult, sceneResult, qrResult] = await Promise.allSettled([
        // OCR Analysis
        (async () => {
          try {
            const worker = await createWorker();
            await worker.load();
            await worker.reinitialize('eng');
            const { data: { text } } = await worker.recognize(compressedFile);
            await worker.terminate();
            updateProgress();
            return text.trim();
          } catch (err) {
            console.error('OCR error:', err);
            return null;
          }
        })(),

        // Scene Recognition
        (async () => {
          try {
            const classifier = await pipeline('image-classification');
            const result = await classifier(imageUrl);
            updateProgress();
            return result;
          } catch (err) {
            console.error('Scene recognition error:', err);
            return null;
          }
        })(),

        // QR Code Detection
        (async () => {
          try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Failed to get canvas context');
            
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            updateProgress();
            return result;
          } catch (err) {
            console.error('QR code detection error:', err);
            return null;
          }
        })()
      ]);

      if (ocrResult.status === 'fulfilled' && ocrResult.value) {
        results.push({ 
          id: uuidv4(),
          type: 'text', 
          content: ocrResult.value 
        });
      }

      if (sceneResult.status === 'fulfilled' && sceneResult.value?.[0]) {
        results.push({
          id: uuidv4(),
          type: 'scene',
          content: (sceneResult.value[0] as any).label,
          confidence: (sceneResult.value[0] as any).score
        });
      }

      if (qrResult.status === 'fulfilled' && qrResult.value) {
        results.push({ 
          id: uuidv4(),
          type: 'qr', 
          content: qrResult.value.data 
        });
      }

      setAnalysisProgress(100);

      if (results.length === 0) {
        setError('No features detected in the image. Try a different image.');
      } else {
        setResults(results);
        onAnalysisComplete?.(results);
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      if (err instanceof Error) {
        setError(err.message || 'Error analyzing image. Please try again.');
      } else {
        setError('Error analyzing image. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await analyzeImage(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxFiles: 1,
    disabled: loading,
    noClick: true
  });

  return (
    <>
      <div
        {...getRootProps()}
        className={`relative transition-colors ${
          isDragActive ? 'bg-indigo-500/10 rounded-lg' : ''
        }`}
      >
        <AnimatePresence mode="wait">
          {!previewImage && (
            <motion.div
              key="upload-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={open}
                disabled={loading}
                className="group relative flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-indigo-400 hover:from-indigo-600/30 hover:to-purple-600/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ImagePlus size={20} className="transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium">Add Image</span>
                <motion.div
                  className="absolute inset-0 rounded-lg bg-white/5"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0, 0.1, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </button>
              {isDragActive && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-indigo-400"
                >
                  Drop your image here
                </motion.span>
              )}
            </motion.div>
          )}

          {previewImage && (
            <motion.div
              key="preview-image"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-[250px] rounded-lg overflow-hidden bg-black/30 border border-white/10 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <img
                src={previewImage}
                alt="Preview"
                className="w-full max-h-[150px] object-cover rounded-lg"
                onClick={() => setShowFullImage(true)}
              />
              <div className="absolute top-2 left-2 flex gap-2">
                <button
                  onClick={clearImage}
                  className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setShowFullImage(true)}
                  className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
              {loading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                  <div className="w-32 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${analysisProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-sm text-gray-300 mt-2">Analyzing image...</p>
                </div>
              )}
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 mt-2"
            >
              {error}
            </motion.div>
          )}

          {results.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2 mt-2"
            >
              {results.map((result) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg border ${
                    result.type === 'text'
                      ? 'bg-blue-600/10 border-blue-500/30'
                      : result.type === 'scene'
                      ? 'bg-purple-600/10 border-purple-500/30'
                      : 'bg-green-600/10 border-green-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.type === 'text' && <FileText className="w-4 h-4 text-blue-400" />}
                    {result.type === 'scene' && <Brain className="w-4 h-4 text-purple-400" />}
                    {result.type === 'qr' && <QrCode className="w-4 h-4 text-green-400" />}
                    <span className="text-sm font-medium text-gray-300 capitalize">
                      {result.type} Analysis
                    </span>
                  </div>
                  <p className={`text-sm ${
                    result.type === 'text'
                      ? 'text-blue-300 font-mono'
                      : 'text-white'
                  }`}>
                    {result.content}
                  </p>
                  {result.confidence && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Confidence: {Math.round(result.confidence * 100)}%
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <input {...getInputProps()} />
      </div>

      {/* Full Image Modal */}
      <AnimatePresence>
        {showFullImage && previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowFullImage(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[90vh]"
            >
              <img
                src={previewImage}
                alt="Full size preview"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setShowFullImage(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}