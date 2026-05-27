import { useState, useRef } from 'react';
import { ImageUploads } from '../imports/ImageUploads/ImageUploads';

interface CompressedImage {
  original: {
    url: string;
    size: number;
    width: number;
    height: number;
  };
  compressed: {
    url: string;
    size: number;
    width: number;
    height: number;
  };
  compressionRatio: number;
}

export default function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<CompressedImage | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [quality, setQuality] = useState(0.8);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [imageFormat, setImageFormat] = useState<string>('image/jpeg');

  const calculateEstimatedSize = (imageDataUrl: string, compressionQuality: number, format: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      // For GIF, we don't use quality parameter
      if (format === 'image/gif') {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setEstimatedSize(blob.size);
            }
          },
          format
        );
      } else {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              setEstimatedSize(blob.size);
            }
          },
          format,
          compressionQuality
        );
      }
    };
    img.src = imageDataUrl;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setOriginalFileSize(file.size);

      // Determine format - keep GIF as GIF, others as JPEG
      const format = file.type === 'image/gif' ? 'image/gif' : 'image/jpeg';
      setImageFormat(format);

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploadedImage(dataUrl);
        setCompressedImage(null);
        calculateEstimatedSize(dataUrl, quality, format);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQualityChange = (newQuality: number) => {
    setQuality(newQuality);
    if (uploadedImage) {
      calculateEstimatedSize(uploadedImage, newQuality, imageFormat);
    }
  };

  const compressImage = async () => {
    if (!uploadedImage) return;

    setIsCompressing(true);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsCompressing(false);
        return;
      }

      ctx.drawImage(img, 0, 0);

      // For GIF, we don't use quality parameter
      const blobCallback = (blob: Blob | null) => {
        if (blob) {
          const compressedUrl = URL.createObjectURL(blob);

          // Get original image size
          fetch(uploadedImage)
            .then(res => res.blob())
            .then(originalBlob => {
              setCompressedImage({
                original: {
                  url: uploadedImage,
                  size: originalBlob.size,
                  width: img.width,
                  height: img.height,
                },
                compressed: {
                  url: compressedUrl,
                  size: blob.size,
                  width: img.width,
                  height: img.height,
                },
                compressionRatio: ((1 - blob.size / originalBlob.size) * 100),
              });
              setIsCompressing(false);
            });
        } else {
          setIsCompressing(false);
        }
      };

      if (imageFormat === 'image/gif') {
        canvas.toBlob(blobCallback, imageFormat);
      } else {
        canvas.toBlob(blobCallback, imageFormat, quality);
      }
    };

    img.src = uploadedImage;
  };

  const downloadCompressed = () => {
    if (!compressedImage) return;

    const extension = imageFormat === 'image/gif' ? 'gif' : 'jpg';
    const link = document.createElement('a');
    link.href = compressedImage.compressed.url;
    link.download = `compressed-image-${Date.now()}.${extension}`;
    link.click();
  };

  const resetApp = () => {
    setUploadedImage(null);
    setCompressedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="size-full flex items-center justify-center bg-gradient-to-br from-[#f0f4ff] to-[#e8f0ff] p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[24px] font-['IBM_Plex_Sans:SemiBold',sans-serif] text-[#0b40a0]">
              Image Compressor
            </h1>
            {uploadedImage && (
              <button
                onClick={resetApp}
                className="px-4 py-2 bg-[#b8e8ff] text-[#0b40a0] rounded-lg font-['IBM_Plex_Sans:Medium',sans-serif] hover:bg-[#a0d8ef] transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {/* Upload Area */}
          {!uploadedImage && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="fileInput"
              />
              <label
                htmlFor="fileInput"
                className="cursor-pointer block bg-[#f6f9ff] border-2 border-dashed border-[rgba(192,208,233,0.5)] rounded-[10px] p-12 text-center hover:border-[#0b40a0] transition-colors"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative shrink-0 size-[48px]">
                    <svg className="w-full h-full" fill="none" viewBox="0 0 48 48">
                      <path
                        d="M38 20C38 14.5 33.5 10 28 10C25.5 10 23.3 11 21.7 12.6C20.2 8.9 16.6 6.5 12.5 6.5C6.7 6.5 2 11.2 2 17C2 22.8 6.7 27.5 12.5 27.5H37C41.1 27.5 44.5 24.1 44.5 20C44.5 15.9 41.1 12.5 37 12.5C37.3 12.5 37.7 12.5 38 12.5V20Z"
                        fill="#0B40A0"
                      />
                      <path
                        d="M24 32.5V41.5M24 32.5L20 36.5M24 32.5L28 36.5"
                        stroke="#0B40A0"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-['IBM_Plex_Sans:Medium',sans-serif] text-[16px] text-[#0b40a0]">
                      Drag or Upload Image
                    </p>
                    <p className="font-['IBM_Plex_Sans:Regular',sans-serif] text-[14px] text-[#8e98a8]">
                      Click to browse or drag and drop your image here
                    </p>
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Image Preview & Compression Controls */}
          {uploadedImage && !compressedImage && (
            <div className="space-y-6">
              {/* File Size Display */}
              <div className="flex justify-end gap-2">
                <div className="bg-[#0b40a0] text-white px-4 py-2 rounded-lg">
                  <p className="font-['IBM_Plex_Sans:Medium',sans-serif] text-[14px]">
                    Original: {formatFileSize(originalFileSize)}
                  </p>
                </div>
                <div className="bg-[#3d4d6f] text-white px-4 py-2 rounded-lg">
                  <p className="font-['IBM_Plex_Sans:Medium',sans-serif] text-[14px]">
                    Estimated: {estimatedSize > 0 ? formatFileSize(estimatedSize) : 'Calculating...'}
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="max-w-full max-h-[400px] rounded-lg shadow-md"
                />
              </div>

              <div className="space-y-4">
                {imageFormat !== 'image/gif' && (
                  <div>
                    <label className="block font-['IBM_Plex_Sans:Medium',sans-serif] text-[14px] text-[#3d4d6f] mb-2">
                      Compression Quality: {Math.round(quality * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={quality}
                      onChange={(e) => handleQualityChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#e8f0ff] rounded-lg appearance-none cursor-pointer accent-[#0b40a0]"
                    />
                    <div className="flex justify-between text-[12px] text-[#8e98a8] mt-1">
                      <span>Lower quality (smaller file)</span>
                      <span>Higher quality (larger file)</span>
                    </div>
                  </div>
                )}
                {imageFormat === 'image/gif' && (
                  <div className="bg-[#fff9e6] border border-[#ffd666] rounded-lg p-4">
                    <p className="font-['IBM_Plex_Sans:Regular',sans-serif] text-[13px] text-[#8e5c00]">
                      Note: GIF format doesn't support quality adjustment. The image will be optimized automatically.
                    </p>
                  </div>
                )}

                <button
                  onClick={compressImage}
                  disabled={isCompressing}
                  className="w-full py-3 bg-[#0b40a0] text-white rounded-lg font-['IBM_Plex_Sans:Medium',sans-serif] text-[16px] hover:bg-[#0a3680] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCompressing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Compressing...
                    </>
                  ) : (
                    'Compress Image'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Compressed Result */}
          {compressedImage && (
            <div className="space-y-6">
              {/* File Size Display */}
              <div className="flex justify-end">
                <div className="bg-[#0b40a0] text-white px-4 py-2 rounded-lg">
                  <p className="font-['IBM_Plex_Sans:Medium',sans-serif] text-[14px]">
                    {formatFileSize(compressedImage.compressed.size)}
                  </p>
                </div>
              </div>

              {/* Compressed Image */}
              <div className="flex justify-center">
                <img
                  src={compressedImage.compressed.url}
                  alt="Compressed"
                  className="max-w-full max-h-[500px] rounded-lg shadow-md"
                />
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Stats */}
                <div className="bg-[#f6f9ff] p-4 rounded-lg space-y-2">
                  <h3 className="font-['IBM_Plex_Sans:SemiBold',sans-serif] text-[16px] text-[#3d4d6f] mb-2">
                    Original Image
                  </h3>
                  <p className="font-['IBM_Plex_Sans:Regular',sans-serif] text-[13px] text-[#3d4d6f]">
                    Size: <span className="font-['IBM_Plex_Sans:Medium',sans-serif]">{formatFileSize(compressedImage.original.size)}</span>
                  </p>
                  <p className="font-['IBM_Plex_Sans:Regular',sans-serif] text-[13px] text-[#3d4d6f]">
                    Dimensions: <span className="font-['IBM_Plex_Sans:Medium',sans-serif]">
                      {compressedImage.original.width} × {compressedImage.original.height}
                    </span>
                  </p>
                </div>

                {/* Compressed Stats */}
                <div className="bg-[#e8f9e8] p-4 rounded-lg space-y-2">
                  <h3 className="font-['IBM_Plex_Sans:SemiBold',sans-serif] text-[16px] text-[#3d4d6f] mb-2">
                    Compressed Image
                  </h3>
                  <p className="font-['IBM_Plex_Sans:Regular',sans-serif] text-[13px] text-[#3d4d6f]">
                    Size: <span className="font-['IBM_Plex_Sans:Medium',sans-serif]">{formatFileSize(compressedImage.compressed.size)}</span>
                  </p>
                  <p className="font-['IBM_Plex_Sans:Regular',sans-serif] text-[13px] text-[#3d4d6f]">
                    Dimensions: <span className="font-['IBM_Plex_Sans:Medium',sans-serif]">
                      {compressedImage.compressed.width} × {compressedImage.compressed.height}
                    </span>
                  </p>
                  <p className="font-['IBM_Plex_Sans:SemiBold',sans-serif] text-[15px] text-[#0b40a0]">
                    Space Saved: {compressedImage.compressionRatio.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={downloadCompressed}
                  className="flex-1 py-3 bg-[#0b40a0] text-white rounded-lg font-['IBM_Plex_Sans:Medium',sans-serif] text-[16px] hover:bg-[#0a3680] transition-colors"
                >
                  Download Compressed Image
                </button>
                <button
                  onClick={() => setCompressedImage(null)}
                  className="px-6 py-3 bg-[#b8e8ff] text-[#0b40a0] rounded-lg font-['IBM_Plex_Sans:Medium',sans-serif] text-[16px] hover:bg-[#a0d8ef] transition-colors"
                >
                  Adjust Quality
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
