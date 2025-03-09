import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Brain, QrCode, Loader2, ImagePlus, X, Trash2, Maximize2 } from 'lucide-react';
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

  const preprocessImage = (img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    // Convert to grayscale and apply adaptive thresholding
    for (let i = 0; i < data.length; i += 4) {
      let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      avg = avg > 128 ? 255 : 0; // Apply binary threshold
      data[i] = data[i + 1] = data[i + 2] = avg;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const recognizeText = async (canvas: HTMLCanvasElement) => {
    const worker = await createWorker("eng");
    await worker.reinitialize("eng");

    // Fine-tune Tesseract settings
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-=*/?",
      user_defined_dpi: "300", // Increase DPI for better accuracy
      textord_heavy_nr: "1" // Improves layout analysis
    });

    const { data: { text } } = await worker.recognize(canvas);
    await worker.terminate();
    return text.trim();
  };

  const cleanOCRText = (text: string) => {
    return text
      .replace(/[\u2018\u2019]/g, "'")  // Fix curly quotes
      .replace(/[\u201C\u201D]/g, '"')  // Fix curly double quotes
      .replace(/\s+/g, " ")             // Normalize spaces
      .replace(/\bO\b/g, "0")           // Convert 'O' to '0'
      .replace(/\bl\b/g, "1")           // Convert 'l' to '1'
      .replace(/[^a-zA-Z0-9\s\+\-\=\*\?]/g, "") // Remove unknown symbols
      .replace(/[7]/g, "?")  // Replace misread 7s with ?
      .replace(/\s+/g, " ")   // Normalize spaces
      .replace(/\bS\b/g, "5")           // Convert 'S' to '5'
      .replace(/\bB\b/g, "8")           // Convert 'B' to '8'
      .replace(/[^a-zA-Z0-9\s\+\-\=\*\?]/g, "") // Remove unwanted symbols
      .replace(/\n+/g, " ")  // Replace multiple newlines with space
      .replace(/\s{2,}/g, " ")  // Replace multiple spaces with a single space
      .trim();
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

      const imgCanvas = preprocessImage(img); // Apply advanced preprocessing

      const rawText = await recognizeText(imgCanvas as HTMLCanvasElement); // Extract text with improved OCR
      const cleanText = cleanOCRText(rawText); // Clean and correct OCR output

      results.push({ id: uuidv4(), type: "text", content: cleanText });

      setResults(results);
      onAnalysisComplete?.(results);
    } catch (err) {
      console.error('Image analysis error:', err);
      setError("Image analysis failed. Try another image.");
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
        <AnimatePresence mode="sync">
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