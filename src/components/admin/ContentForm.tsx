'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Calendar, Clock, Star, Tag, Globe, Shield, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';
import { Movie, Series, Story, SubscriptionPackage } from '@/types';

interface ContentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  type: 'movie' | 'series' | 'story';
  editData?: Movie | Series | Story | null;
  loading?: boolean;
}

const SUBSCRIPTION_PACKAGES: SubscriptionPackage[] = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller', 'Sci-Fi', 'Fantasy',
  'Mystery', 'Adventure', 'Crime', 'Family', 'Documentary', 'Biography', 'History',
  'Musical', 'Sport', 'War', 'Western', 'Animation'
];

const VIDEO_QUALITIES = ['SD', 'HD', 'FHD', '4K'];

export default function ContentForm({ isOpen, onClose, onSubmit, type, editData, loading = false }: ContentFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      // Initialize form with default values
      setFormData({
        title: '',
        description: '',
        thumbnailUrl: '',
        genre: [],
        language: 'en',
        requiredPackages: [],
        isActive: true,
        isAdult: false,
        contentPurchaseEnabled: false,
        contentPrice: 0,
        contentPriceDays: 30,
        contentPurchasePackages: [],
        rating: 0,
        ...(type === 'movie' && {
          videoUrl: '',
          downloadUrl: '', // Direct download URL (e.g., Bunny CDN)
          googleDriveUrl: '', // Keep for backward compatibility
          duration: '',
          releaseDate: '',
          quality: ['HD'],
          cast: [],
          director: ''
        }),
        ...(type === 'series' && {
          totalSeasons: 1,
          cast: []
        }),
        ...(type === 'story' && {
          content: '',
          author: '',
          estimatedReadTime: 0,
          thumbnailUrl: ''
        })
      });
    }
    setErrors({});
  }, [editData, type, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.thumbnailUrl?.trim()) {
      newErrors.thumbnailUrl = 'Thumbnail URL is required';
    }

    if (!formData.genre?.length) {
      newErrors.genre = 'At least one genre is required';
    }

    // No package validation needed — leaving packages empty means content is free for everyone

    if (type === 'movie') {
      if (!formData.videoUrl?.trim() && !formData.googleDriveUrl?.trim()) {
        newErrors.videoUrl = 'Video URL is required';
      }
    }

    if (type === 'story') {
      if (!formData.content?.trim()) {
        newErrors.content = 'Story content is required';
      }
      if (!formData.author?.trim()) {
        newErrors.author = 'Author is required';
      }
      if (!formData.estimatedReadTime || formData.estimatedReadTime <= 0) {
        newErrors.estimatedReadTime = 'Read time must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [field]: '' }));
    }
  };

  const handleArrayChange = (field: string, value: string, action: 'add' | 'remove') => {
    const currentArray = formData[field] || [];
    let newArray;
    
    if (action === 'add') {
      newArray = [...currentArray, value];
    } else {
      newArray = currentArray.filter((item: string) => item !== value);
    }
    
    handleInputChange(field, newArray);
  };

  const handleGenreToggle = (genre: string) => {
    const currentGenres = formData.genre || [];
    if (currentGenres.includes(genre)) {
      handleArrayChange('genre', genre, 'remove');
    } else {
      handleArrayChange('genre', genre, 'add');
    }
  };

  const handlePackageToggle = (pkg: SubscriptionPackage) => {
    const currentPackages = formData.requiredPackages || [];
    if (currentPackages.includes(pkg)) {
      handleArrayChange('requiredPackages', pkg, 'remove');
    } else {
      handleArrayChange('requiredPackages', pkg, 'add');
    }
  };

  const handleCastChange = (value: string) => {
    const cast = value.split(',').map(name => name.trim()).filter(name => name);
    handleInputChange('cast', cast);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-dark-900 py-4">
            <h3 className="text-xl font-bold text-dark-100">
              {editData ? 'Edit' : 'Add'} {type === 'movie' ? 'Movie' : type === 'series' ? 'TV Series' : 'Story'}
            </h3>
            <button
              onClick={onClose}
              className="text-dark-400 hover:text-dark-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                <Tag size={20} />
                <span>Basic Information</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`form-input ${errors.title ? 'border-red-500' : ''}`}
                    placeholder="Enter title"
                  />
                  {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="form-label">Language</label>
                  <select
                    value={formData.language || 'en'}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="form-input"
                  >
                    <option value="en">English</option>
                    <option value="sw">Swahili</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Description *</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`form-input min-h-[100px] ${errors.description ? 'border-red-500' : ''}`}
                  placeholder="Enter description"
                />
                {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="form-label">Thumbnail URL *</label>
                <ImageUploadInput
                  value={formData.thumbnailUrl || ''}
                  onChange={(url) => handleInputChange('thumbnailUrl', url)}
                  className={`form-input ${errors.thumbnailUrl ? 'border-red-500' : ''}`}
                  placeholder="https://example.com/thumbnail.jpg"
                />
                {errors.thumbnailUrl && <p className="text-red-400 text-sm mt-1">{errors.thumbnailUrl}</p>}
                
                {/* Help Text */}
                <div className="mt-2 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <p className="text-xs text-blue-300 mb-1">
                    <strong>How it works:</strong>
                  </p>
                  <ul className="text-xs text-blue-200/80 space-y-1 ml-4 list-disc">
                    <li>The system will automatically use your <strong>video URL</strong> to create an auto-playing video thumbnail preview</li>
                    <li>This thumbnail image URL is used as a <strong>fallback</strong> if the video preview fails to load</li>
                    <li>It's also used for faster initial page loads and better SEO</li>
                    <li>Upload a static image (JPG/PNG) to image hosting services below</li>
                  </ul>
                </div>
                
                {/* Image Hosting Suggestions */}
                <div className="mt-2">
                  <p className="text-xs text-dark-400 mb-2">Recommended image hosting:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('thumbnailUrl', 'https://i.imgur.com/')}
                      className="text-xs bg-dark-700 text-dark-300 px-2 py-1 rounded hover:bg-dark-600 transition-colors"
                    >
                      Imgur
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('thumbnailUrl', 'https://ibb.co/')}
                      className="text-xs bg-dark-700 text-dark-300 px-2 py-1 rounded hover:bg-dark-600 transition-colors"
                    >
                      ImgBB
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('thumbnailUrl', 'https://drive.google.com/')}
                      className="text-xs bg-dark-700 text-dark-300 px-2 py-1 rounded hover:bg-dark-600 transition-colors"
                    >
                      Google Drive
                    </button>
                  </div>
                </div>
                
                {/* Thumbnail Preview */}
                {formData.thumbnailUrl && (
                  <div className="mt-3">
                    <label className="form-label text-sm">Preview:</label>
                    <div className="relative w-32 h-20 bg-dark-700 rounded-lg overflow-hidden">
                      {/* Check if it's a video URL (M3U8, MP4, etc.) */}
                      {formData.thumbnailUrl.includes('.m3u8') || 
                       formData.thumbnailUrl.includes('.mp4') || 
                       formData.thumbnailUrl.includes('video') ? (
                        <video
                          src={formData.thumbnailUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          autoPlay
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        >
                          {formData.thumbnailUrl.includes('.m3u8') && (
                            <source src={formData.thumbnailUrl} type="application/x-mpegURL" />
                          )}
                        </video>
                      ) : (
                        <img
                          src={formData.thumbnailUrl}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      )}
                      <div className="w-full h-full flex items-center justify-center hidden">
                        <ImageIcon size={24} className="text-dark-500" />
                      </div>
                    </div>
                    <p className="text-xs text-dark-400 mt-1">
                      {formData.thumbnailUrl.includes('.m3u8') || formData.thumbnailUrl.includes('.mp4') 
                        ? 'Video preview (auto-playing)' 
                        : 'Thumbnail preview'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Genre Selection */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                <Tag size={20} />
                <span>Genres *</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreToggle(genre)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      formData.genre?.includes(genre)
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              {errors.genre && <p className="text-red-400 text-sm">{errors.genre}</p>}
            </div>

            {/* Subscription Packages */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                <Shield size={20} />
                <span>Required Subscription Packages <span className="text-xs font-normal text-dark-400">(leave empty = free for everyone)</span></span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SUBSCRIPTION_PACKAGES.map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => handlePackageToggle(pkg)}
                    className={`p-3 rounded-lg text-sm transition-colors ${
                      formData.requiredPackages?.includes(pkg)
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    {pkg}
                  </button>
                ))}
              </div>
              {errors.requiredPackages && <p className="text-red-400 text-sm">{errors.requiredPackages}</p>}
            </div>

            {/* Per-Content Purchase */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                  <DollarSign size={20} />
                  <span>Per-Content Purchase</span>
                </h4>
                <button
                  type="button"
                  onClick={() => handleInputChange('contentPurchaseEnabled', !formData.contentPurchaseEnabled)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    formData.contentPurchaseEnabled
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-dark-700 text-dark-400 border border-dark-600'
                  }`}
                >
                  {formData.contentPurchaseEnabled
                    ? <><ToggleRight size={18} /> <span>Enabled</span></>
                    : <><ToggleLeft size={18} /> <span>Disabled</span></>}
                </button>
              </div>

              {formData.contentPurchaseEnabled && (
                <div className="bg-dark-800/60 border border-dark-600 rounded-xl p-4 space-y-4">
                  <p className="text-xs text-dark-400">
                    Turn ON to control access per content item:<br />
                    • <strong className="text-green-400">Price = 0 + No packages</strong> → <strong>FREE</strong> for everyone<br />
                    • <strong className="text-yellow-400">Price &gt; 0 + No packages</strong> → Anyone can purchase directly<br />
                    • <strong className="text-primary-400">Packages selected</strong> → Only those subscribers can access/purchase
                  </p>

                  {/* Price & Days */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Content Price (TZS)</label>
                      <div className="flex items-center bg-dark-700 border border-dark-500 rounded-lg overflow-hidden focus-within:border-primary-500 transition-colors">
                        <span className="px-3 py-3 bg-dark-600 text-yellow-400 text-sm font-bold border-r border-dark-500 whitespace-nowrap">TZS</span>
                        <input
                          type="number"
                          value={formData.contentPrice === 0 ? '' : formData.contentPrice}
                          onChange={(e) => handleInputChange('contentPrice', parseInt(e.target.value) || 0)}
                          className="flex-1 px-4 py-3 bg-transparent text-white text-base font-medium placeholder-dark-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-dark-500 mt-1">Price the user pays to unlock this content (0 = free)</p>
                    </div>

                    <div>
                      <label className="form-label">Access Duration (days)</label>
                      <div className="flex items-center bg-dark-700 border border-dark-500 rounded-lg overflow-hidden focus-within:border-primary-500 transition-colors">
                        <input
                          type="number"
                          value={formData.contentPriceDays === 0 ? '' : formData.contentPriceDays}
                          onChange={(e) => handleInputChange('contentPriceDays', parseInt(e.target.value) || 1)}
                          className="flex-1 px-4 py-3 bg-transparent text-white text-base font-medium placeholder-dark-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="30"
                          min="1"
                        />
                        <span className="px-3 py-3 bg-dark-600 text-blue-400 text-sm font-bold border-l border-dark-500">days</span>
                      </div>
                      <p className="text-xs text-dark-500 mt-1">How many days the user can access this content after purchase</p>
                    </div>
                  </div>

                  {/* Which packages can buy */}
                  <div>
                    <label className="form-label">Eligible Packages (must be subscribed to one of these to purchase)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {SUBSCRIPTION_PACKAGES.map((pkg) => (
                        <button
                          key={pkg}
                          type="button"
                          onClick={() => {
                            const current = formData.contentPurchasePackages || [];
                            handleInputChange(
                              'contentPurchasePackages',
                              current.includes(pkg)
                                ? current.filter((p: string) => p !== pkg)
                                : [...current, pkg]
                            );
                          }}
                          className={`p-3 rounded-lg text-sm transition-colors ${
                            formData.contentPurchasePackages?.includes(pkg)
                              ? 'bg-green-600 text-white'
                              : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                          }`}
                        >
                          {pkg}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-dark-500 mt-2">
                      <strong className="text-green-400">Leave empty</strong> = anyone can purchase without a subscription. Select packages to restrict purchase to subscribers only.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Type-specific fields */}
            {type === 'movie' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                  <Clock size={20} />
                  <span>Movie Details</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Video URL (Player) *</label>
                    <input
                      type="url"
                      value={formData.videoUrl || formData.googleDriveUrl || ''}
                      onChange={(e) => {
                        handleInputChange('videoUrl', e.target.value);
                        // Also update googleDriveUrl for backward compatibility if it was previously set
                        if (formData.googleDriveUrl && !e.target.value) {
                          handleInputChange('googleDriveUrl', '');
                        }
                      }}
                      className={`form-input ${errors.videoUrl ? 'border-red-500' : ''}`}
                      placeholder="https://iframe.mediadelivery.net/play/552231/00dfddf1-9155-4a66-a192-fef3ea3202ff"
                    />
                    {errors.videoUrl && <p className="text-red-400 text-sm mt-1">{errors.videoUrl}</p>}
                    
                    {/* Help Text */}
                    <div className="mt-2 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                      <p className="text-xs text-blue-300 mb-2">
                        <strong>Supported Video URL Formats:</strong>
                      </p>
                      <ul className="text-xs text-blue-200/80 space-y-1 ml-4 list-disc">
                        <li><strong>Bunny.net (MediaDelivery):</strong> <code className="bg-dark-800 px-1 rounded">https://iframe.mediadelivery.net/play/LIBRARY_ID/VIDEO_ID</code></li>
                        <li><strong>Google Drive:</strong> <code className="bg-dark-800 px-1 rounded">https://drive.google.com/file/d/FILE_ID/view</code></li>
                        <li><strong>YouTube:</strong> <code className="bg-dark-800 px-1 rounded">https://youtube.com/watch?v=VIDEO_ID</code></li>
                        <li><strong>Vimeo:</strong> <code className="bg-dark-800 px-1 rounded">https://vimeo.com/VIDEO_ID</code></li>
                        <li><strong>Direct MP4:</strong> <code className="bg-dark-800 px-1 rounded">https://example.com/video.mp4</code></li>
                      </ul>
                      <p className="text-xs text-blue-200/80 mt-2">
                        <strong>Recommended:</strong> Use Bunny.net (MediaDelivery) iframe URLs for best performance and quality.
                      </p>
                    </div>

                    {/* HTML Player Code */}
                    <div className="mt-3">
                      <label className="form-label">HTML Player Code (Optional)</label>
                      <textarea
                        value={formData.videoEmbedCode || ''}
                        onChange={(e) => handleInputChange('videoEmbedCode', e.target.value)}
                        className="form-input font-mono text-xs"
                        rows={4}
                        placeholder={`Paste custom HTML player code here, e.g.:\n<iframe src="https://..." allowfullscreen></iframe>`}
                      />
                      <p className="text-xs text-amber-400/80 mt-1">
                        If filled, this HTML code will be used as the player instead of the Video URL above. Leave empty to use the URL.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Download URL (Optional)</label>
                    <input
                      type="url"
                      value={formData.downloadUrl || ''}
                      onChange={(e) => handleInputChange('downloadUrl', e.target.value)}
                      className="form-input"
                      placeholder="https://vz-efe8986b-460.b-cdn.net/00dfddf1-9155-4a66-a192-fef3ea3202ff/original"
                    />
                    <p className="text-xs text-dark-400 mt-1">
                      <strong>Bunny CDN:</strong> Use the direct download URL from Bunny.net. This enables direct downloads without CDN blocking.
                    </p>
                    <p className="text-xs text-dark-400 mt-1">
                      Example: <code className="bg-dark-800 px-1 rounded text-xs">https://vz-XXXXX.b-cdn.net/VIDEO_ID/original</code>
                    </p>
                  </div>

                  <div>
                    <label className="form-label">Duration (minutes) <span className="text-xs font-normal text-dark-400">(optional)</span></label>
                    <input
                      type="number"
                      value={formData.duration || ''}
                      onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                      className="form-input"
                      placeholder="120"
                    />
                  </div>

                  <div>
                    <label className="form-label">Director <span className="text-xs font-normal text-dark-400">(optional)</span></label>
                    <input
                      type="text"
                      value={formData.director || ''}
                      onChange={(e) => handleInputChange('director', e.target.value)}
                      className="form-input"
                      placeholder="Director name"
                    />
                  </div>

                  <div>
                    <label className="form-label">Release Date <span className="text-xs font-normal text-dark-400">(optional)</span></label>
                    <input
                      type="date"
                      value={formData.releaseDate instanceof Date ? formData.releaseDate.toISOString().split('T')[0] : formData.releaseDate || ''}
                      onChange={(e) => handleInputChange('releaseDate', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Cast (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.cast?.join(', ') || ''}
                    onChange={(e) => handleCastChange(e.target.value)}
                    className="form-input"
                    placeholder="Actor 1, Actor 2, Actor 3"
                  />
                </div>

                <div>
                  <label className="form-label">Video Quality</label>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_QUALITIES.map((quality) => (
                      <button
                        key={quality}
                        type="button"
                        onClick={() => {
                          const currentQuality = formData.quality || [];
                          if (currentQuality.includes(quality)) {
                            handleArrayChange('quality', quality, 'remove');
                          } else {
                            handleArrayChange('quality', quality, 'add');
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          formData.quality?.includes(quality)
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                        }`}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {type === 'series' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                  <Clock size={20} />
                  <span>Series Details</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Total Seasons</label>
                    <input
                      type="number"
                      value={formData.totalSeasons || 1}
                      onChange={(e) => handleInputChange('totalSeasons', parseInt(e.target.value) || 1)}
                      className="form-input"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="form-label">Cast (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.cast?.join(', ') || ''}
                      onChange={(e) => handleCastChange(e.target.value)}
                      className="form-input"
                      placeholder="Actor 1, Actor 2, Actor 3"
                    />
                  </div>
                </div>
              </div>
            )}

            {type === 'story' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                  <Clock size={20} />
                  <span>Story Details</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Author *</label>
                    <input
                      type="text"
                      value={formData.author || ''}
                      onChange={(e) => handleInputChange('author', e.target.value)}
                      className={`form-input ${errors.author ? 'border-red-500' : ''}`}
                      placeholder="Author name"
                    />
                    {errors.author && <p className="text-red-400 text-sm mt-1">{errors.author}</p>}
                  </div>

                  <div>
                    <label className="form-label">Estimated Read Time (minutes) *</label>
                    <input
                      type="number"
                      value={formData.estimatedReadTime || ''}
                      onChange={(e) => handleInputChange('estimatedReadTime', parseInt(e.target.value) || 0)}
                      className={`form-input ${errors.estimatedReadTime ? 'border-red-500' : ''}`}
                      placeholder="15"
                    />
                    {errors.estimatedReadTime && <p className="text-red-400 text-sm mt-1">{errors.estimatedReadTime}</p>}
                  </div>
                </div>

                <div>
                  <label className="form-label">Story Content *</label>
                  <textarea
                    value={formData.content || ''}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    className={`form-input min-h-[200px] ${errors.content ? 'border-red-500' : ''}`}
                    placeholder="Enter the story content..."
                  />
                  {errors.content && <p className="text-red-400 text-sm mt-1">{errors.content}</p>}
                </div>
              </div>
            )}

            {/* Additional Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-dark-100 flex items-center space-x-2">
                <Shield size={20} />
                <span>Settings</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive || false}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-dark-300">Active</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isAdult"
                    checked={formData.isAdult || false}
                    onChange={(e) => handleInputChange('isAdult', e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isAdult" className="text-dark-300">Adult Content</label>
                </div>

                <div>
                  <label className="form-label">Rating (1-5)</label>
                  <input
                    type="number"
                    value={formData.rating || 0}
                    onChange={(e) => handleInputChange('rating', Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)))}
                    className="form-input"
                    min="0"
                    max="5"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="form-label">Sort Order (Number)</label>
                  <input
                    type="number"
                    value={formData.sortOrder === undefined ? 0 : formData.sortOrder}
                    onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
                    className="form-input"
                  />
                  <p className="text-[10px] text-dark-400 mt-1 leading-tight">
                    Lower numbers appear first (e.g. 1 comes before 10).
                  </p>
                </div>
              </div>

              {/* Adult Category - Only show if isAdult is true */}
              {formData.isAdult && (
                <div className="mt-4">
                  <label className="form-label">Adult Category</label>
                  <select
                    value={formData.adultCategory || ''}
                    onChange={(e) => handleInputChange('adultCategory', e.target.value || null)}
                    className="form-input"
                  >
                    <option value="">None (Regular Adult)</option>
                    <option value="zilizovuja">Zilizovuja Tanzania (Trending Leaked)</option>
                    <option value="ngono">Videos za Ngono (Regular Adult)</option>
                  </select>
                  <p className="text-xs text-dark-400 mt-1">
                    Zilizovuja: Trending leaked adult videos | Ngono: Regular adult videos
                  </p>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-6 border-t border-dark-700">
              <button
                type="button"
                onClick={onClose}
                className="button-secondary flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button-primary flex-1"
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? 'Saving...' : editData ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
