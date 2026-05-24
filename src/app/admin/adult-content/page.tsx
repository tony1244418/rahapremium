'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Tv,
  AlertTriangle,
  TrendingUp,
  Video,
  Grid,
  List,
  Eye,
  Lock,
  X,
  Save,
  DollarSign,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  subscribeToAdultMovies,
  subscribeToAdultSeries,
  addMovie,
  addSeries,
  updateMovie,
  updateSeries,
  deleteMovie,
  deleteSeries
} from '@/lib/content-management';
import { Movie, Series, SubscriptionPackage } from '@/types';
import { Loading } from '@/components/ui/Loading';
import SeasonsManager from '@/components/admin/SeasonsManager';
import { ImageUploadInput } from '@/components/ui/ImageUploadInput';

const SUBSCRIPTION_PACKAGES: SubscriptionPackage[] = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];

type AdultContentType = 'zilizovuja' | 'ngono' | 'movies-ngono';
type SubFormType = 'clip' | 'movie';
type ContentType = 'movie' | 'series';

export default function AdminAdultContentPage() {
  const { t } = useLanguage();
  const { adminUser } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<AdultContentType | 'all'>('all');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Movie | Series | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formContentType, setFormContentType] = useState<ContentType>('movie');
  const [formCategory, setFormCategory] = useState<AdultContentType>('zilizovuja');
  const [formSubType, setFormSubType] = useState<SubFormType>('clip'); // 'clip' or 'movie'
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [showSeasonsManager, setShowSeasonsManager] = useState(false);

  useEffect(() => {
    const unsubscribeMovies = subscribeToAdultMovies((data) => {
      setMovies(data); // already filtered to isAdult && isActive
      setLoading(false);
    });

    const unsubscribeSeries = subscribeToAdultSeries((data) => {
      setSeries(data); // already filtered to isAdult && isActive
    });

    return () => {
      unsubscribeMovies();
      unsubscribeSeries();
    };
  }, []);

  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    thumbnailUrl: '',
    videoUrl: '',
    downloadUrl: '',
    genre: [],
    language: 'sw',
    requiredPackages: [],
    isActive: true,
    isAdult: true,
    adultCategory: 'zilizovuja',
    rating: 0,
    cast: [],
    director: '',
    duration: 0,
    quality: ['HD'],
    releaseDate: new Date().toISOString().split('T')[0],
    searchKeywords: [],
    contentPurchaseEnabled: false,
    contentPrice: 0,
    contentPriceDays: 30,
    contentPurchasePackages: []
  });

  const handleOpenForm = (item?: Movie | Series, contentType: ContentType = 'movie', category: AdultContentType = 'zilizovuja', subType: SubFormType = 'clip') => {
    if (item) {
      setEditingItem(item);
      const isMovie = 'duration' in item;
      setFormContentType(isMovie ? 'movie' : 'series');
      setFormCategory((item.adultCategory as AdultContentType) || 'ngono');
      const itemAsMovie = item as Movie;
      setFormSubType(itemAsMovie.director && itemAsMovie.director.trim() !== '' ? 'movie' : 'clip');
      const baseData: any = { ...item };
      // Only add releaseDate if it's a movie
      if (isMovie && 'releaseDate' in item && item.releaseDate) {
        baseData.releaseDate = item.releaseDate instanceof Date 
          ? item.releaseDate.toISOString().split('T')[0] 
          : new Date(item.releaseDate).toISOString().split('T')[0];
      } else {
        baseData.releaseDate = new Date().toISOString().split('T')[0];
      }
      setFormData(baseData);
    } else {
      setEditingItem(null);
      setFormContentType(contentType);
      setFormCategory(category);
      setFormSubType(subType);
      setFormData({
        title: '',
        description: '',
        thumbnailUrl: '',
        videoUrl: '',
        downloadUrl: '',
        genre: [],
        language: 'sw',
        requiredPackages: [],
        isActive: true,
        isAdult: true,
        adultCategory: category,
        rating: 0,
        cast: [],
        director: '',
        duration: 0,
        quality: ['HD'],
        releaseDate: new Date().toISOString().split('T')[0],
        searchKeywords: [],
        contentPurchaseEnabled: false,
        contentPrice: 0,
        contentPriceDays: 30,
        contentPurchasePackages: [],
        ...(contentType === 'series' && { totalSeasons: 1, cast: [] })
      });
    }
    setShowForm(true);
    setError(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setError(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handlePackageToggle = (pkg: SubscriptionPackage) => {
    setFormData((prev: any) => ({
      ...prev,
      requiredPackages: prev.requiredPackages.includes(pkg)
        ? prev.requiredPackages.filter((p: SubscriptionPackage) => p !== pkg)
        : [...prev.requiredPackages, pkg]
    }));
  };

  const handleGenreToggle = (genre: string) => {
    setFormData((prev: any) => ({
      ...prev,
      genre: prev.genre.includes(genre)
        ? prev.genre.filter((g: string) => g !== genre)
        : [...prev.genre, genre]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields for adult content (especially zilizovuja)
    if (!formData.videoUrl?.trim()) {
      newErrors.videoUrl = 'Video URL is required';
    }

    if (!formData.downloadUrl?.trim()) {
      newErrors.downloadUrl = 'Download URL is required';
    }

    // No package validation needed — leaving packages empty means content is free for everyone

    // Optional but recommended fields
    if (!formData.title?.trim()) {
      // Title is optional but we'll use a default if empty
      formData.title = formData.title || `Adult ${formContentType === 'movie' ? 'Video' : 'Series'} ${Date.now()}`;
    }

    setError(Object.keys(newErrors).length > 0 ? Object.values(newErrors)[0] : null);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setFormLoading(true);
    setError(null);

    try {
      // Prepare data - set defaults for optional fields
      const submitData = {
        ...formData,
        title: formData.title || `Adult ${formContentType === 'movie' ? 'Video' : 'Series'} ${Date.now()}`,
        description: formData.description || '',
        thumbnailUrl: formData.thumbnailUrl || formData.videoUrl || '', // Use video URL as fallback thumbnail
        genre: formData.genre || [],
        cast: formData.cast || [],
        director: formData.director || '',
        duration: formData.duration || 0,
        quality: formData.quality || ['HD'],
        rating: formData.rating || 0,
        searchKeywords: formData.searchKeywords || [],
        isAdult: true,
        adultCategory: formCategory,
        language: formData.language || 'sw',
        ...(formContentType === 'movie' && {
          releaseDate: formData.releaseDate ? new Date(formData.releaseDate) : new Date()
        }),
        ...(formContentType === 'series' && {
          totalSeasons: formData.totalSeasons || 1
        })
      };

      let result;
      if (formContentType === 'movie') {
        if (editingItem) {
          result = await updateMovie(editingItem.id, submitData);
        } else {
          result = await addMovie(submitData);
        }
      } else {
        if (editingItem) {
          result = await updateSeries(editingItem.id, submitData);
        } else {
          result = await addSeries(submitData);
        }
      }

      if (result.success) {
        handleCloseForm();
      } else {
        setError(result.error || 'Failed to save adult content');
      }
    } catch (err) {
      console.error('Error saving adult content:', err);
      setError('Failed to save adult content');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (item: Movie | Series) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    setActionLoading(item.id);
    try {
      const result = 'duration' in item 
        ? await deleteMovie(item.id)
        : await deleteSeries(item.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete content');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete content');
    } finally {
      setActionLoading(null);
    }
  };

  const getFilteredContent = () => {
    let content: (Movie | Series)[] = [];
    
    if (filterType === 'movie' || filterType === 'all') {
      content = [...content, ...movies];
    }
    if (filterType === 'series' || filterType === 'all') {
      content = [...content, ...series];
    }

    // Filter by category
    if (filterCategory !== 'all') {
      content = content.filter(item => item.adultCategory === filterCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      content = content.filter(item =>
        item.title.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) || false)
      );
    }

    return content;
  };

  const filteredContent = getFilteredContent();
  const zilizovujaCount = [...movies, ...series].filter(c => c.adultCategory === 'zilizovuja').length;
  const ngonoCount = [...movies, ...series].filter(c => c.adultCategory === 'ngono' || (c.isAdult && !c.adultCategory)).length;
  const moviesNgonoCount = movies.filter(c => c.adultCategory === 'movies-ngono').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
            <Loading size="lg" />
          </div>
    );
  }

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-dark-100 flex items-center space-x-2">
                <AlertTriangle className="text-red-500" size={32} />
                <span>Adult Content Management</span>
              </h1>
              <p className="text-dark-400 mt-1">Manage Zilizovuja and Videos za Ngono</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleOpenForm(undefined, 'movie', 'zilizovuja', 'clip')}
                className="button-primary flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Zilizovuja</span>
              </button>
              <button
                onClick={() => handleOpenForm(undefined, 'movie', 'ngono', 'clip')}
                className="button-secondary flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Ngono Clip</span>
              </button>
              <button
                onClick={() => handleOpenForm(undefined, 'movie', 'ngono', 'movie')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <Play size={20} />
                <span>Add Adult Movie</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-800 rounded-lg p-4 border border-red-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Zilizovuja</p>
                  <p className="text-2xl font-bold text-red-400">{zilizovujaCount}</p>
                </div>
                <TrendingUp size={24} className="text-red-400" />
              </div>
            </div>
            <div className="bg-dark-800 rounded-lg p-4 border border-pink-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Ngono Clips</p>
                  <p className="text-2xl font-bold text-pink-400">{ngonoCount}</p>
                </div>
                <Video size={24} className="text-pink-400" />
              </div>
            </div>
            <div className="bg-dark-800 rounded-lg p-4 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Adult Movies</p>
                  <p className="text-2xl font-bold text-purple-400">{moviesNgonoCount}</p>
                </div>
                <Play size={24} className="text-purple-400" />
              </div>
            </div>
            <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">Total</p>
                  <p className="text-2xl font-bold text-dark-100">{filteredContent.length}</p>
                </div>
                <Play size={24} className="text-dark-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterCategory === 'all'
                    ? 'bg-red-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                All Categories
              </button>
              <button
                onClick={() => setFilterCategory('zilizovuja')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  filterCategory === 'zilizovuja'
                    ? 'bg-red-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                <TrendingUp size={16} />
                <span>Zilizovuja</span>
              </button>
              <button
                onClick={() => setFilterCategory('ngono')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  filterCategory === 'ngono'
                    ? 'bg-pink-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                <Video size={16} />
                <span>Video za Ngono</span>
              </button>
              <button
                onClick={() => setFilterCategory('movies-ngono' as AdultContentType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  filterCategory === 'movies-ngono'
                    ? 'bg-purple-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                <Play size={16} />
                <span>Movies za Ngono</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="text"
                  placeholder="Search adult content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filterType === 'all' ? 'bg-red-500 text-white' : 'bg-dark-800 text-dark-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('movie')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    filterType === 'movie' ? 'bg-red-500 text-white' : 'bg-dark-800 text-dark-300'
                  }`}
                >
                  <Play size={16} />
                  <span>Movies</span>
                </button>
                <button
                  onClick={() => setFilterType('series')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    filterType === 'series' ? 'bg-red-500 text-white' : 'bg-dark-800 text-dark-300'
                  }`}
                >
                  <Tv size={16} />
                  <span>Series</span>
                </button>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-red-500 text-white' : 'bg-dark-800 text-dark-300'}`}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-red-500 text-white' : 'bg-dark-800 text-dark-300'}`}
                >
                  <List size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className={`${
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-4'
          }`}>
            {filteredContent.map((item) => {
              const isMovie = 'duration' in item;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-dark-800 rounded-lg overflow-hidden border border-dark-700 hover:border-red-500/50 transition-all ${
                    viewMode === 'list' ? 'flex space-x-4' : ''
                  }`}
                >
                  <div className={`relative ${viewMode === 'list' ? 'w-32 h-20 flex-shrink-0' : 'aspect-video'}`}>
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
                        {isMovie ? <Play size={24} className="text-red-400" /> : <Tv size={24} className="text-red-400" />}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">
                      18+
                    </div>
                    {item.adultCategory === 'zilizovuja' && (
                      <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs px-2 py-1 rounded font-bold flex items-center space-x-1">
                        <TrendingUp size={10} />
                        <span>Trending</span>
                      </div>
                    )}
                  </div>
                  <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <h3 className="font-bold text-dark-100 mb-1 line-clamp-2">{item.title || 'Untitled'}</h3>
                    <p className="text-dark-400 text-sm mb-2 line-clamp-2">{item.description || 'No description'}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-dark-500">
                        {item.adultCategory === 'zilizovuja' ? '🔥 Zilizovuja' : item.adultCategory === 'movies-ngono' ? '🎬 Movie' : '🎥 Ngono'}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-dark-400">
                        <Eye size={12} />
                        <span>{item.views.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenForm(item, isMovie ? 'movie' : 'series', item.adultCategory || 'zilizovuja')}
                        className="flex-1 button-secondary text-sm py-2 flex items-center justify-center space-x-1"
                      >
                        <Edit size={14} />
                        <span>Edit</span>
                      </button>
                      {!isMovie && (
                        <button
                          onClick={() => {
                            setSelectedSeries(item as Series);
                            setShowSeasonsManager(true);
                          }}
                          className="flex-1 button-primary text-sm py-2 flex items-center justify-center space-x-1"
                        >
                          <Tv size={14} />
                          <span>Seasons</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={actionLoading === item.id}
                        className="flex-1 button-danger text-sm py-2 flex items-center justify-center space-x-1"
                      >
                        {actionLoading === item.id ? (
                          <Loading size="sm" />
                        ) : (
                          <>
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* No Content */}
          {filteredContent.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle size={48} className="text-dark-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-200 mb-2">No adult content found</h3>
              <p className="text-dark-400 mb-4">
                {searchQuery || filterCategory !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first adult content'}
              </p>
              {!searchQuery && filterCategory === 'all' && filterType === 'all' && (
                <button
                  onClick={() => handleOpenForm(undefined, 'movie', 'zilizovuja')}
                  className="button-primary"
                >
                  Add Content
                </button>
              )}
            </div>
          )}

          {/* Form Modal */}
          <AnimatePresence>
            {showForm && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-dark-900 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-dark-100">
                      {editingItem ? 'Edit' : 'Add'}{' '}
                      {formSubType === 'movie' ? '🎬 Adult Movie' : formCategory === 'zilizovuja' ? 'Zilizovuja Video' : 'Ngono Clip'}
                    </h2>
                    <button onClick={handleCloseForm} className="text-dark-400 hover:text-white">
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded">
                        {error}
                      </div>
                    )}

                    {/* Category and Type Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Category *</label>
                        <select
                          value={formCategory}
                          onChange={(e) => {
                            setFormCategory(e.target.value as AdultContentType);
                            handleInputChange('adultCategory', e.target.value);
                          }}
                          className="form-input"
                        >
                          <option value="zilizovuja">🔥 Zilizovuja Tanzania</option>
                          <option value="ngono">🎥 Video za Ngono (Clips)</option>
                          <option value="movies-ngono">🎬 Movies za Ngono (Filamu Kamili)</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Content Type *</label>
                        <select
                          value={formContentType}
                          onChange={(e) => setFormContentType(e.target.value as ContentType)}
                          className="form-input"
                          disabled={!!editingItem}
                        >
                          <option value="movie">Movie/Video</option>
                          <option value="series">Series</option>
                        </select>
                      </div>
                    </div>

                    {/* Required Fields */}
                    <div className="border-t border-dark-700 pt-4">
                      <h3 className="text-lg font-semibold text-red-400 mb-4">Required Fields *</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="form-label">Video URL *</label>
                          <input
                            type="url"
                            value={formData.videoUrl || ''}
                            onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                            placeholder="https://example.com/video.mp4"
                            className="form-input"
                            required
                          />
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
                              ⚠️ If filled, this HTML code will be used as the player instead of the Video URL above. Leave empty to use the URL.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="form-label">Download URL *</label>
                          <input
                            type="url"
                            value={formData.downloadUrl || ''}
                            onChange={(e) => handleInputChange('downloadUrl', e.target.value)}
                            placeholder="https://example.com/download.mp4"
                            className="form-input"
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label">Required Subscription Packages *</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {SUBSCRIPTION_PACKAGES.map((pkg) => (
                              <label
                                key={pkg}
                                className="flex items-center space-x-2 p-3 bg-dark-800 rounded-lg cursor-pointer hover:bg-dark-700 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.requiredPackages?.includes(pkg) || false}
                                  onChange={() => handlePackageToggle(pkg)}
                                  className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded"
                                />
                                <span className="text-dark-300">{pkg}</span>
                              </label>
                            ))}
                          </div>
                          <p className="text-xs text-dark-500 mt-1">Leave empty to make content free for all users (no login required).</p>
                        </div>
                      </div>
                    </div>

                    {/* Per-Content Purchase */}
                    <div className="border-t border-dark-700 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-dark-200 flex items-center gap-2">
                          <DollarSign size={18} />
                          Per-Content Purchase
                        </span>
                        <button
                          type="button"
                          onClick={() => handleInputChange('contentPurchaseEnabled', !formData.contentPurchaseEnabled)}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            formData.contentPurchaseEnabled
                              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                              : 'bg-dark-700 text-dark-400 border border-dark-600'
                          }`}
                        >
                          {formData.contentPurchaseEnabled
                            ? <><ToggleRight size={16} /> <span>Enabled</span></>
                            : <><ToggleLeft size={16} /> <span>Disabled</span></>}
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
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="form-label">Bei (TZS)</label>
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
                            </div>
                            <div>
                              <label className="form-label">Muda wa Ufikiaji</label>
                              <div className="flex items-center bg-dark-700 border border-dark-500 rounded-lg overflow-hidden focus-within:border-primary-500 transition-colors">
                                <input
                                  type="number"
                                  value={formData.contentPriceDays === 0 ? '' : formData.contentPriceDays}
                                  onChange={(e) => handleInputChange('contentPriceDays', parseInt(e.target.value) || 1)}
                                  className="flex-1 px-4 py-3 bg-transparent text-white text-base font-medium placeholder-dark-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="30"
                                  min="1"
                                />
                                <span className="px-3 py-3 bg-dark-600 text-blue-400 text-sm font-bold border-l border-dark-500">siku</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="form-label">Eligible Packages</label>
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
                            <p className="text-xs text-dark-500 mt-2"><strong className="text-green-400">Leave empty</strong> = anyone can purchase without a subscription. Select packages to restrict to subscribers only.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Optional Fields */}
                    <div className="border-t border-dark-700 pt-4">
                      <h3 className="text-lg font-semibold text-dark-300 mb-4">
                        Optional Fields
                        <span className="text-sm text-dark-500 font-normal ml-2">(Leave empty if not needed)</span>
                      </h3>

                      <div className="space-y-4">
                        {/* Title */}
                        <div>
                          <label className="form-label">Video Title (Optional)</label>
                          <input
                            type="text"
                            value={formData.title || ''}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="Video title (auto-generated if empty)"
                            className="form-input"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <label className="form-label">Description (Optional)</label>
                          <textarea
                            value={formData.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Video description"
                            className="form-input"
                            rows={3}
                          />
                        </div>

                        {/* Thumbnail - URL + Upload */}
                        <div>
                          <label className="form-label">Thumbnail Image (Optional)</label>
                          <ImageUploadInput
                            value={formData.thumbnailUrl || ''}
                            onChange={(url) => handleInputChange('thumbnailUrl', url)}
                            placeholder="https://... (itatumia URL ya video ikiwa wazi)"
                            className="form-input"
                          />
                          {formData.thumbnailUrl && (
                            <div className="mt-2">
                              <img
                                src={formData.thumbnailUrl}
                                alt="Thumbnail preview"
                                className="h-24 rounded-lg object-cover border border-dark-600"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Director — makes content appear in Movies tab */}
                        {formContentType === 'movie' && (
                          <div>
                            <label className="form-label">
                              Director
                              {formSubType === 'movie' && <span className="text-red-400 ml-1">*</span>}
                              <span className="text-xs text-purple-400 ml-2">
                                (Kuweka director + duration kunafanya ionekane kwenye Movies tab)
                              </span>
                            </label>
                            <input
                              type="text"
                              value={formData.director || ''}
                              onChange={(e) => handleInputChange('director', e.target.value)}
                              placeholder="Jina la mkurugenzi"
                              className="form-input"
                              required={formSubType === 'movie'}
                            />
                          </div>
                        )}

                        {/* Duration (movies only) */}
                        {formContentType === 'movie' && (
                          <div>
                            <label className="form-label">
                              Duration (minutes)
                              {formSubType === 'movie' && <span className="text-red-400 ml-1">*</span>}
                            </label>
                            <input
                              type="number"
                              value={formData.duration || ''}
                              onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="form-input"
                              min="0"
                              required={formSubType === 'movie'}
                            />
                            {formSubType === 'movie' && (
                              <p className="text-xs text-purple-400 mt-1">
                                ✅ Director + Duration &gt; 0 → Itaonekana kwenye &quot;Movies&quot; tab ya Adult Content
                              </p>
                            )}
                          </div>
                        )}

                        {/* Genre */}
                        <div>
                          <label className="form-label">Genre (Optional)</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {['Action', 'Romance', 'Drama', 'Comedy', 'Thriller', 'Adult', 'Leaked', 'Amateur', 'Professional'].map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => handleGenreToggle(g)}
                                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                  formData.genre?.includes(g)
                                    ? 'bg-red-500 text-white'
                                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Total Seasons (series only) */}
                        {formContentType === 'series' && (
                          <div>
                            <label className="form-label">Total Seasons — Optional</label>
                            <input
                              type="number"
                              value={formData.totalSeasons || ''}
                              onChange={(e) => handleInputChange('totalSeasons', parseInt(e.target.value) || 1)}
                              placeholder="1"
                              className="form-input"
                              min="1"
                            />
                          </div>
                        )}

                        {/* Active toggle */}
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive !== false}
                            onChange={(e) => handleInputChange('isActive', e.target.checked)}
                            className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded"
                          />
                          <label htmlFor="isActive" className="text-dark-300">Active</label>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-dark-700">
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        className="button-secondary flex-1"
                        disabled={formLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="button-primary flex-1 flex items-center justify-center space-x-2"
                        disabled={formLoading || !formData.videoUrl || !formData.downloadUrl || (!formData.contentPurchaseEnabled && !formData.requiredPackages?.length)}
                      >
                        {formLoading ? (
                          <Loading size="sm" />
                        ) : (
                          <>
                            <Save size={16} />
                            <span>{editingItem ? 'Update' : 'Create'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Seasons Manager */}
          {selectedSeries && (
            <SeasonsManager
              isOpen={showSeasonsManager}
              onClose={() => {
                setShowSeasonsManager(false);
                setSelectedSeries(null);
              }}
              series={selectedSeries}
            />
          )}
        </div>
  );
}

