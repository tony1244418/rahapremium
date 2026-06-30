// User types
export interface User {
  uid: string;
  phoneNumber: string;
  displayName: string;
  username: string;
  profilePhotoURL?: string | null;
  subscription?: UserSubscription | null;
  createdAt: Date;
  lastLoginAt: Date;
  isBlocked: boolean;
  isAdult: boolean;
  subscriptionHistory: UserSubscription[];
  paymentHistory: PaymentRequest[];
  contentAccesses?: string[]; // Array of purchased content IDs
  gameAccesses?: GameAccess[]; // User's game access records
  liveTvSubscription?: UserSubscription | null; // Independent Live TV subscription
  liveTvSubscriptionHistory?: UserSubscription[]; // History of Live TV subscriptions
}

export interface UserSubscription {
  id: string;
  packageType: SubscriptionPackage;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  transactionId: string;
  amount: number;
  isRenewal: boolean;
  isUpgrade: boolean;
  previousPackage?: SubscriptionPackage | null;
  createdAt: Date;
  category?: PackageCategory; // Defaults to 'GENERAL' when absent
}

export type SubscriptionPackage = 'FEDHA' | 'CHUMA' | 'DHAHABU' | 'ALMASI' | 'MALKIA' | 'KITONGA' | 'ZEBRA' | 'SIMBA' | 'SWALA' | 'NDOVU' | 'FARU' | 'TWIGA';

// Package category: 'GENERAL' covers movies/series/stories (existing behavior),
// 'LIVETV' is the separate package set used only for live channels.
export type PackageCategory = 'GENERAL' | 'LIVETV';

export interface SubscriptionPlan {
  id: SubscriptionPackage;
  name: string;
  duration: number; // in days
  price: number; // in TSH
  description: string;
}

// Content types
export interface Movie {
  id: string;
  title: string;
  description: string;
  videoUrl?: string; // Generic video URL (supports any iframe-embeddable URL) - Used for player
  downloadUrl?: string; // Direct download URL (e.g., Bunny CDN direct download link) - Used for downloads
  googleDriveUrl?: string; // Deprecated: kept for backward compatibility, use videoUrl instead
  thumbnailUrl: string;
  duration?: number; // in minutes
  releaseDate?: Date | null;
  genre: string[];
  language: 'en' | 'sw';
  quality: VideoQuality[];
  requiredPackages: SubscriptionPackage[];
  createdAt: Date;
  updatedAt: Date;
  views: number;
  isActive: boolean;
  isAdult: boolean;
  adultCategory?: 'zilizovuja' | 'ngono' | 'movies-ngono' | null; // 'zilizovuja'=leaked clips, 'ngono'=video clips, 'movies-ngono'=full adult movies
  rating: number; // 1-5 stars
  cast: string[];
  director?: string;
  searchKeywords?: string[];
  syncedAt?: Date | null;
  // Per-content purchase fields
  contentPurchaseEnabled?: boolean;  // If true, this content requires a direct purchase (not subscription)
  contentPrice?: number;             // Price in TZS for one-time purchase
  contentPriceDays?: number;         // How many days access is granted after purchase
  contentPurchasePackages?: SubscriptionPackage[]; // Optional: packages that can also access this content
  videoEmbedCode?: string;           // Optional: custom HTML embed code for player
  sortOrder?: number;                // Used for manual sorting in admin panel
}

export interface Series {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  genre: string[];
  language: 'en' | 'sw';
  totalSeasons: number;
  requiredPackages: SubscriptionPackage[];
  createdAt: Date;
  updatedAt: Date;
  views: number;
  isActive: boolean;
  isAdult: boolean;
  adultCategory?: 'zilizovuja' | 'ngono' | 'movies-ngono' | null; // 'zilizovuja'=leaked clips, 'ngono'=video clips, 'movies-ngono'=full adult movies
  rating: number;
  cast: string[];
  seasons: Season[];
  searchKeywords?: string[];
  syncedAt?: Date | null;
  // Per-content purchase fields
  contentPurchaseEnabled?: boolean;
  contentPrice?: number;
  contentPriceDays?: number;
  contentPurchasePackages?: SubscriptionPackage[];
  videoEmbedCode?: string;
}

export interface Season {
  id: string;
  seriesId: string;
  seasonNumber: number;
  title: string;
  description: string;
  videoUrl?: string; // Generic video URL (supports any iframe-embeddable URL) - Used for player
  downloadUrl?: string; // Direct download URL (e.g., Bunny CDN direct download link) - Used for downloads
  googleDriveUrl?: string; // Deprecated: kept for backward compatibility, use videoUrl instead
  thumbnailUrl?: string;
  totalEpisodes: number;
  episodes: Episode[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  description: string;
  videoUrl?: string; // Generic video URL (supports any iframe-embeddable URL) - Used for player
  downloadUrl?: string; // Direct download URL (e.g., Bunny CDN direct download link) - Used for downloads
  googleDriveUrl?: string; // Deprecated: kept for backward compatibility, use videoUrl instead
  thumbnailUrl: string;
  duration: number; // in minutes
  quality: VideoQuality[];
  requiredPackages: SubscriptionPackage[];
  isAdult: boolean;
  createdAt: Date;
  updatedAt: Date;
  views: number;
  // Per-content purchase fields
  contentPurchaseEnabled?: boolean;
  contentPrice?: number;
  contentPriceDays?: number;
  videoEmbedCode?: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  author: string;
  genre: string[];
  language: 'en' | 'sw';
  estimatedReadTime: number; // in minutes
  thumbnailUrl: string;
  requiredPackages: SubscriptionPackage[];
  createdAt: Date;
  updatedAt: Date;
  views: number;
  isActive: boolean;
  isAdult: boolean;
  rating: number;
  searchKeywords?: string[];
  syncedAt?: Date | null;
}

export type VideoQuality = 'SD' | 'HD' | 'FHD' | '4K';

// Game types
export type GameCategory = 'Action' | 'Adventure' | 'Puzzle' | 'Racing' | 'Sports' | 'Strategy' | 'Arcade' | 'Simulation' | 'RPG' | 'Other';
export type GamePlatform = 'PC' | 'Mobile' | 'Both' | 'Windows' | 'Android' | 'iOS';
export type GameMode = 'Mod' | 'Premium' | 'Maleo' | 'Maleo Bus Mod' | 'Maleo Map Mod' | 'ETS2 Bus Mod' | 'Tanzania Game' | 'Original' | 'Other';

export interface Game {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  howToSetVideoLink: string; // Video link for "how to set" tutorial
  downloadLink: string; // External download link
  category: GameCategory; // Game type/category (Arcade, Action, etc.)
  platform: GamePlatform; // Platform: PC, Mobile, or Both
  mode?: GameMode; // Game mode (Mod, Premium, Maleo, Original, Other)
  isFree?: boolean; // Whether the game is free to play
  requiredPackages: SubscriptionPackage[]; // Required subscription packages to access game
  createdAt: Date;
  updatedAt: Date;
  views: number;
  isActive: boolean;
  isAdult?: boolean; // New field for adult content
  language: 'en' | 'sw';
  genre?: string[];
  searchKeywords?: string[];
  // Per-content purchase fields
  contentPurchaseEnabled?: boolean;
  contentPrice?: number;
  contentPriceDays?: number;
  contentPurchasePackages?: SubscriptionPackage[];
  videoEmbedCode?: string;
}

export interface GameAccess {
  id: string;
  userId: string;
  gameId: string;
  paymentId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
}

// Admin types
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  profilePhotoURL?: string | null;
  role: 'admin' | 'moderator';
  permissions: AdminPermission[];
  createdAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
}

export type AdminPermission =
  | 'manage_content'
  | 'manage_users'
  | 'view_analytics'
  | 'manage_subscriptions'
  | 'moderate_content';

// Payment types
export interface PaymentRequest {
  id: string;
  userId: string;
  packageType?: SubscriptionPackage; // Optional for game payments
  gameId?: string; // For game payments
  amount: number;
  phoneNumber: string;
  status: PaymentStatus;
  orderId?: string;
  ussdCode?: string;
  failureReason?: string;
  receiptUrl?: string;
  createdAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  isManuallyCompleted?: boolean;
  completedBy?: string; // admin uid who completed manually
  paymentType?: 'subscription' | 'game' | 'content'; // Type of payment (optional for backward compatibility)
  packageCategory?: PackageCategory; // 'LIVETV' for live TV subscriptions; absent/'GENERAL' otherwise
  contentId?: string; // For single-content purchases
  contentType?: 'movie' | 'series' | 'episode' | 'story' | 'live';
  contentDurationDays?: number;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

// Language support
export type Language = 'en' | 'sw';

export interface LanguageStrings {
  [key: string]: {
    en: string;
    sw: string;
  };
}

// Navigation types
export interface NavigationItem {
  id: string;
  label: LanguageStrings;
  href: string;
  icon: string;
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Context types
export interface AuthContextType {
  user: User | null;
  adminUser: AdminUser | null;
  loading: boolean;
  signInWithPhone: (phoneNumber: string, username?: string, displayName?: string) => Promise<{ isNewUser: boolean; user: User }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  checkPhoneExists: (phoneNumber: string) => Promise<boolean>;
  checkUsernameExists: (username: string) => Promise<boolean>;
  refreshUserData: () => Promise<void>;
  claimDeviceSession: (userId: string) => Promise<void>;
}

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Feedback types
export interface Feedback {
  id: string;
  userId: string;
  userName: string; // Display name (not username - username is confidential)
  userPhotoURL?: string | null;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: string[]; // Array of user IDs who liked
  loves: string[]; // Array of user IDs who loved
  replies: FeedbackReply[];
  isEdited: boolean;
  isDeleted: boolean;
}

export interface FeedbackReply {
  id: string;
  feedbackId: string;
  userId: string;
  userName: string; // Display name (not username)
  userPhotoURL?: string | null;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likes: string[]; // Array of user IDs who liked
  loves: string[]; // Array of user IDs who loved
  isEdited: boolean;
  isDeleted: boolean;
  isAdmin?: boolean; // Whether the reply is from an admin
}

// Adult Groups (Groups za Malaya) - External links to adult groups
export interface AdultGroup {
  id: string;
  label: string; // Display label (e.g., "Video za Wasomali Wakitombana")
  url: string; // External link URL
  description?: string; // Optional description
  icon?: string; // Optional icon name or emoji
  order: number; // Display order
  isActive: boolean;
  requiredPackages: SubscriptionPackage[]; // Required subscription packages to access
  createdAt: Date;
  updatedAt: Date;
  views: number; // Track how many times link was clicked
}

// Live TV Channel types
export type LiveChannelCategory = 'sport' | 'news' | 'africa' | 'tanzania' | 'entertainment' | 'music' | 'kids' | 'documentary' | 'movies' | 'series' | 'other';
export type LiveStreamFormat = 'hls' | 'dash' | 'mp4' | 'webm' | 'youtube' | 'other';

export interface LiveChannel {
  id: string;
  name: string;
  description?: string;
  streamUrl: string; // HLS (.m3u8), DASH (.mpd), or other streaming URL
  streamFormat?: LiveStreamFormat; // Auto-detected format
  thumbnailUrl?: string; // Channel thumbnail - if not provided, uses site logo
  category: LiveChannelCategory[];
  language: 'en' | 'sw';
  requiredPackages: SubscriptionPackage[]; // Required subscription packages to access
  isActive: boolean;
  isMaintenance: boolean; // Put channel under maintenance
  isAdult?: boolean; // New field for adult content
  viewerCount: number; // Current number of viewers
  totalViews: number; // Total views since creation
  order: number; // Display order (for alphabetical sorting)
  createdAt: Date;
  updatedAt: Date;
  searchKeywords?: string[]; // For search functionality
  // ClearKey DRM encryption support for DASH streams
  encryptionType?: 'clearkey' | 'none';
  clearKeys?: Record<string, string>;
  // Per-content purchase fields
  contentPurchaseEnabled?: boolean;
  contentPrice?: number;
  contentPriceDays?: number;
  contentPurchasePackages?: SubscriptionPackage[];
  videoEmbedCode?: string;
  showInSlider?: boolean; // Whether to show this channel in the Live TV slider
}
