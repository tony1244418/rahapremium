import React, { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  placeholder = 'https://...',
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('https://api.imgbb.com/1/upload?key=a02885adfe42eeadbd4b388596a1849a', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        onChange(data.data.url);
      } else {
        alert('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  return (
    <div className="flex items-center space-x-2 w-full">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 ${className}`}
        disabled={isUploading}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center justify-center px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-primary-400 hover:bg-dark-700 hover:text-primary-300 focus:ring-2 focus:ring-primary-500 transition-all duration-200 shrink-0"
        title="Upload Image"
      >
        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};
