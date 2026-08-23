'use client';

import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  ThumbsUp, 
  Reply, 
  Clock,
  User,
  Edit,
  Trash2,
  X,
  Check,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Feedback, FeedbackReply } from '@/types';
import { Loading } from '@/components/ui/Loading';
import { usePlatformControls } from '@/contexts/PlatformControlContext';

export default function FeedbackPage() {
  const { user, adminUser, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { toggles, loading: togglesLoading } = usePlatformControls();
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Cache for user/admin data to avoid repeated fetches
  const userCacheRef = useRef<Map<string, { userName: string; userPhotoURL: string | null; isAdmin: boolean }>>(new Map());

  // Redirect to home if both feedback icon and section are disabled
  useEffect(() => {
    // Wait for toggles to load before checking
    if (!togglesLoading) {
      // If feedback is disabled AND icon visibility is also disabled, redirect to home
      if (!toggles.feedbackEnabled && !toggles.feedbackIconVisible) {
        router.replace('/');
      }
    }
  }, [toggles.feedbackEnabled, toggles.feedbackIconVisible, togglesLoading, router]);

  // Function to get user data with caching
  const getUserData = async (userId: string, forceRefresh = false): Promise<{ userName: string; userPhotoURL: string | null; isAdmin: boolean }> => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && userCacheRef.current.has(userId)) {
      return userCacheRef.current.get(userId)!;
    }

    let userName = 'Anonymous';
    let userPhotoURL = null;
    let isAdmin = false;

    if (userId) {
      try {
        // Check if admin first
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (adminData && !adminError) {
          const ad = adminData as any;
          // Use 'name' field first, fallback to 'displayName'
          userName = ad.name || ad.displayName || 'Admin';
          userPhotoURL = ad.profilePhotoURL || null;
          isAdmin = true;
        } else {
          // Check regular user
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
          if (userData && !userError) {
            const ud = userData as any;
            // Use 'name' field first, fallback to 'displayName' (username is confidential)
            // displayName is the actual name field in the user document
            // Handle empty strings and null values
            const nameValue = ud.name?.trim() || ud.displayName?.trim() || '';
            userName = nameValue || 'Anonymous';
            userPhotoURL = ud.profilePhotoURL || null;
            
            // Debug logging if name is still missing
            if (!userName || userName === 'Anonymous') {
              console.log('⚠️ User data found but name is missing:', {
                userId,
                hasName: !!ud.name,
                hasDisplayName: !!ud.displayName,
                nameValue: ud.name,
                displayNameValue: ud.displayName,
                trimmedName: ud.name?.trim(),
                trimmedDisplayName: ud.displayName?.trim(),
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data for userId:', userId, error);
      }
    }

    const userData = { userName, userPhotoURL, isAdmin };
    // Cache the result (always update cache even if Anonymous to avoid repeated fetches)
    userCacheRef.current.set(userId, userData);
    return userData;
  };

  // Use a ref to track if it's the first load
  const isFirstLoadRef = useRef(true);

  // Real-time listener for feedbacks - optimized to avoid constant reloads
  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const { data: rawSnapshot, error } = await supabase
          .from('feedbacks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!rawSnapshot) return;
        const snapshot = rawSnapshot as any[];

        // Collect all unique user IDs first (skip deleted feedbacks and replies)
        const userIds = new Set<string>();
        snapshot.forEach((data: any) => {
          // Skip deleted feedbacks
          if (data.is_deleted === true) {
            return;
          }
          if (data.user_id) userIds.add(data.user_id);
          if (data.replies && Array.isArray(data.replies)) {
            data.replies.forEach((reply: any) => {
              // Skip deleted replies
              if (reply.is_deleted === true || reply.isDeleted === true) {
                return;
              }
              if (reply.userId) userIds.add(reply.userId);
            });
          }
        });

        // Batch fetch only uncached user data
        const uncachedUserIds = Array.from(userIds).filter(userId => !userCacheRef.current.has(userId));
        
        // If this is the first load and we have uncached users, fetch them first
        if (uncachedUserIds.length > 0) {
          if (isFirstLoadRef.current) {
            // On first load, wait for user data to be fetched
            await Promise.all(uncachedUserIds.map(userId => getUserData(userId, false)));
            isFirstLoadRef.current = false;
          } else {
            // On subsequent updates, fetch in background and update later
            Promise.all(uncachedUserIds.map(userId => getUserData(userId, false))).then(() => {
              // After fetching, update the feedbacks if we got new user data
              setFeedbacks(prevFeedbacks => {
                const updatedFeedbacks = prevFeedbacks.map(feedback => {
                  const cachedUserData = userCacheRef.current.get(feedback.userId);
                  if (cachedUserData && cachedUserData.userName !== 'Anonymous') {
                    const updatedReplies = feedback.replies.map(reply => {
                      const cachedReplyUserData = userCacheRef.current.get(reply.userId);
                      if (cachedReplyUserData && cachedReplyUserData.userName !== 'Anonymous') {
                        return {
                          ...reply,
                          userName: cachedReplyUserData.userName,
                          userPhotoURL: cachedReplyUserData.userPhotoURL,
                          isAdmin: cachedReplyUserData.isAdmin,
                        };
                      }
                      return reply;
                    });
                    
                    return {
                      ...feedback,
                      userName: cachedUserData.userName,
                      userPhotoURL: cachedUserData.userPhotoURL,
                      replies: updatedReplies,
                    };
                  }
                  
                  // Update replies even if main feedback user is Anonymous
                  const updatedReplies = feedback.replies.map(reply => {
                    const cachedReplyUserData = userCacheRef.current.get(reply.userId);
                    if (cachedReplyUserData && cachedReplyUserData.userName !== 'Anonymous') {
                      return {
                        ...reply,
                        userName: cachedReplyUserData.userName,
                        userPhotoURL: cachedReplyUserData.userPhotoURL,
                        isAdmin: cachedReplyUserData.isAdmin,
                      };
                    }
                    return reply;
                  });
                  
                  return { ...feedback, replies: updatedReplies };
                });
                
                // Only update if something changed
                const hasChanges = updatedFeedbacks.some((newFeedback, index) => {
                  const oldFeedback = prevFeedbacks[index];
                  if (!oldFeedback) return true;
                  return (
                    newFeedback.userName !== oldFeedback.userName ||
                    newFeedback.replies.some((newReply, replyIndex) => 
                      newReply.userName !== oldFeedback.replies[replyIndex]?.userName
                    )
                  );
                });
                
                return hasChanges ? updatedFeedbacks : prevFeedbacks;
              });
            }).catch(err => {
              console.error('Error batch fetching user data:', err);
            });
          }
        } else {
          isFirstLoadRef.current = false;
        }
        
        // Process feedbacks with cached data (synchronous access - no blocking)
        const feedbacksData: Feedback[] = [];
        
        for (const data of snapshot) {
          // Skip deleted feedbacks
          if (data.is_deleted === true) {
            continue;
          }
          
          // Get user data from cache (synchronous - fast)
          const userData = data.user_id && userCacheRef.current.has(data.user_id)
            ? userCacheRef.current.get(data.user_id)!
            : { userName: 'Anonymous', userPhotoURL: null, isAdmin: false };

          // Process replies (filter out deleted replies)
          const replies: FeedbackReply[] = [];
          if (data.replies && Array.isArray(data.replies)) {
            for (const replyData of data.replies) {
              // Skip deleted replies
              if (replyData.isDeleted === true || replyData.is_deleted === true) {
                continue;
              }
              
              const replyUserData = replyData.userId && userCacheRef.current.has(replyData.userId)
                ? userCacheRef.current.get(replyData.userId)!
                : { userName: 'Anonymous', userPhotoURL: null, isAdmin: false };

              replies.push({
                id: replyData.id || `reply_${Date.now()}_${Math.random()}`,
                feedbackId: data.id,
                userId: replyData.userId || '',
                userName: replyUserData.userName,
                userPhotoURL: replyUserData.userPhotoURL,
                content: replyData.content || '',
                createdAt: replyData.createdAt ? new Date(replyData.createdAt) : new Date(),
                updatedAt: replyData.updatedAt ? new Date(replyData.updatedAt) : undefined,
                likes: replyData.likes || [],
                loves: replyData.loves || [],
                isEdited: replyData.isEdited || false,
                isDeleted: replyData.isDeleted || false,
                isAdmin: replyData.isAdmin || replyUserData.isAdmin,
              });
            }
          }

          feedbacksData.push({
            id: data.id,
            userId: data.user_id || '',
            userName: userData.userName,
            userPhotoURL: userData.userPhotoURL,
            content: data.content || '',
            createdAt: data.created_at ? new Date(data.created_at) : new Date(),
            updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
            likes: data.likes || [],
            loves: data.loves || [],
            replies: replies,
            isEdited: data.is_edited || false,
            isDeleted: data.is_deleted || false,
          });
        }

        // Only update state if data actually changed (prevent unnecessary re-renders)
        setFeedbacks(prevFeedbacks => {
          // Quick check if data changed
          if (prevFeedbacks.length !== feedbacksData.length) {
            return feedbacksData;
          }
          
          // Check if any feedback content changed
          const hasChanges = feedbacksData.some((newFeedback, index) => {
            const oldFeedback = prevFeedbacks[index];
            if (!oldFeedback || oldFeedback.id !== newFeedback.id) return true;
            return (
              oldFeedback.content !== newFeedback.content ||
              oldFeedback.likes.length !== newFeedback.likes.length ||
              oldFeedback.loves.length !== newFeedback.loves.length ||
              oldFeedback.replies.length !== newFeedback.replies.length ||
              oldFeedback.isEdited !== newFeedback.isEdited ||
              oldFeedback.isDeleted !== newFeedback.isDeleted
            );
          });

          return hasChanges ? feedbacksData : prevFeedbacks;
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
        setLoading(false);
      }
    };

    fetchFeedbacks();

    const channel = supabase
      .channel('public:feedbacks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => {
        fetchFeedbacks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmitComment = async () => {
    if (!user && !adminUser) {
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!toggles.feedbackEnabled) {
      alert(t('newFeedbackDisabled'));
      return;
    }

    if (!commentText.trim()) return;

    const currentUser = adminUser || user;
    if (!currentUser) return;

    try {
      const { error: insertError } = await supabase.from('feedbacks').insert({
        user_id: currentUser.uid,
        content: commentText.trim(),
        likes: [],
        loves: [],
        replies: [],
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setCommentText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert(t('failedToSubmitComment'));
    }
  };

  const handleReply = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    
    const currentUser = adminUser || user;
    if (!currentUser) return;

    try {
      const { data: feedbackData, error: fetchError } = await supabase
        .from('feedbacks')
        .select('replies')
        .eq('id', feedbackId)
        .single();
        
      if (fetchError || !feedbackData) return;

      const existingReplies = (feedbackData as any).replies || [];

      const newReply = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        feedbackId: feedbackId,
        userId: currentUser.uid,
        content: replyText.trim(),
        likes: [],
        loves: [],
        isEdited: false,
        isDeleted: false,
        isAdmin: !!adminUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase
        .from('feedbacks')
        .update({
          replies: [...existingReplies, newReply],
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackId);

      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding reply:', error);
      alert('Goshwa kutuma jibu. Tafadhali jaribu tena.');
    }
  };

  const handleLike = async (feedbackId: string, type: 'like' | 'love') => {
    const currentUser = adminUser || user;
    
    if (!currentUser) {
      alert('Tafadhali ingia ili kupenda maoni');
      return;
    }

    try {
      const { data: feedbackData, error: fetchError } = await supabase
        .from('feedbacks')
        .select('likes, loves')
        .eq('id', feedbackId)
        .single();
        
      if (fetchError || !feedbackData) return;

      const likes = (feedbackData as any).likes || [];
      const loves = (feedbackData as any).loves || [];

      if (type === 'like') {
        const newLikes = likes.includes(currentUser.uid)
          ? likes.filter((id: string) => id !== currentUser.uid)
          : [...likes, currentUser.uid];
        const newLoves = loves.filter((id: string) => id !== currentUser.uid);

        await supabase
          .from('feedbacks')
          .update({
            likes: newLikes,
            loves: newLoves,
            updated_at: new Date().toISOString(),
          })
          .eq('id', feedbackId);
      } else {
        const newLoves = loves.includes(currentUser.uid)
          ? loves.filter((id: string) => id !== currentUser.uid)
          : [...loves, currentUser.uid];
        const newLikes = likes.filter((id: string) => id !== currentUser.uid);

        await supabase
          .from('feedbacks')
          .update({
            likes: newLikes,
            loves: newLoves,
            updated_at: new Date().toISOString(),
          })
          .eq('id', feedbackId);
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const handleReplyLike = async (feedbackId: string, replyId: string, type: 'like' | 'love') => {
    const currentUser = adminUser || user;
    
    if (!currentUser) {
      alert('Tafadhali ingia ili kupenda jibu');
      return;
    }

    try {
      const { data: feedbackData, error: fetchError } = await supabase
        .from('feedbacks')
        .select('replies')
        .eq('id', feedbackId)
        .single();
        
      if (fetchError || !feedbackData) return;

      const replies = (feedbackData as any).replies || [];
      const replyIndex = replies.findIndex((r: any) => r.id === replyId);
      
      if (replyIndex === -1) return;

      const reply = replies[replyIndex];
      const likes = reply.likes || [];
      const loves = reply.loves || [];

      if (type === 'like') {
        const newLikes = likes.includes(currentUser.uid)
          ? likes.filter((id: string) => id !== currentUser.uid)
          : [...likes, currentUser.uid];
        const newLoves = loves.filter((id: string) => id !== currentUser.uid);

        replies[replyIndex] = {
          ...reply,
          likes: newLikes,
          loves: newLoves,
          updatedAt: new Date().toISOString(),
        };
      } else {
        const newLoves = loves.includes(currentUser.uid)
          ? loves.filter((id: string) => id !== currentUser.uid)
          : [...loves, currentUser.uid];
        const newLikes = likes.filter((id: string) => id !== currentUser.uid);

        replies[replyIndex] = {
          ...reply,
          likes: newLikes,
          loves: newLoves,
          updatedAt: new Date().toISOString(),
        };
      }

      await supabase
        .from('feedbacks')
        .update({
          replies: replies,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackId);
    } catch (error) {
      console.error('Error updating reply reaction:', error);
    }
  };

  const handleEdit = async (feedbackId: string) => {
    if (!editText.trim()) return;

    try {
      await supabase
        .from('feedbacks')
        .update({
          content: editText.trim(),
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackId);

      setEditingId(null);
      setEditText('');
      // success - real-time subscription will update the UI
    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('Ilishindwa kusasisha maoni');
    }
  };

  const handleEditReply = async (feedbackId: string, replyId: string) => {
    if (!editReplyText.trim()) return;

    try {
      const { data: feedbackData, error: fetchError } = await supabase
        .from('feedbacks')
        .select('replies')
        .eq('id', feedbackId)
        .single();
        
      if (fetchError || !feedbackData) return;

      const replies = (feedbackData as any).replies || [];
      const replyIndex = replies.findIndex((r: any) => r.id === replyId);
      
      if (replyIndex === -1) return;

      replies[replyIndex] = {
        ...replies[replyIndex],
        content: editReplyText.trim(),
        isEdited: true,
        updatedAt: new Date().toISOString(),
      };

      await supabase
        .from('feedbacks')
        .update({
          replies: replies,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackId);

      setEditingReplyId(null);
      setEditReplyText('');
      // success - real-time subscription will update the UI
    } catch (error) {
      console.error('Error updating reply:', error);
      alert('Ilishindwa kusasisha jibu');
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return t('justNow');
    if (minutes < 60) return `${minutes}${t('minutesAgo')}`;
    if (hours < 24) return `${hours}${t('hoursAgo')}`;
    if (days < 7) return `${days}${t('daysAgo')}`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullTimestamp = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading while auth or toggles are loading
  if (authLoading || loading || togglesLoading) {
    return (
      <MainLayout>
        <div className="container-mobile flex items-center justify-center min-h-96">
          <Loading size="lg" text={t('loadingFeedback')} variant="splash" />
        </div>
      </MainLayout>
    );
  }

  // If both feedback icon and section are disabled, don't render anything (redirect will happen)
  if (!toggles.feedbackEnabled && !toggles.feedbackIconVisible) {
    return null;
  }

  return (
      <MainLayout>
        <div className="container-mobile pb-20">
        {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-md border-b border-dark-700 py-4 mb-6"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-gradient rounded-full flex items-center justify-center">
                <MessageSquare size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">
                {t('communityFeedback')} ({feedbacks.length})
                </h1>
              <p className="text-sm text-dark-400">{t('shareYourThoughts')}</p>
              </div>
            </div>
          </motion.div>
          
        {/* Comment Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-xl p-4 mb-6"
        >
          {!toggles.feedbackEnabled && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Lock size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-400 mb-1">
                    {t('newFeedbackDisabled')}
                  </p>
                  <p className="text-xs text-dark-400">
                    {t('viewExistingComments')}
            </p>
        </div>
            </div>
            </div>
          )}
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center flex-shrink-0">
              {(adminUser?.profilePhotoURL || user?.profilePhotoURL) ? (
                <img 
                  src={(adminUser || user)?.profilePhotoURL || ''} 
                  alt={(adminUser || user)?.displayName || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={20} className="text-white" />
              )}
            </div>
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onFocus={() => {
                  if (!user && !adminUser) {
                    router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname));
                  }
                }}
                placeholder={(user || adminUser) ? t('writeYourFeedback') : t('loginToComment')}
                className="w-full bg-dark-800 rounded-lg p-3 text-dark-100 placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
                disabled={!user && !adminUser || !toggles.feedbackEnabled}
              />
              <div className="flex justify-end mt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || (!user && !adminUser) || !toggles.feedbackEnabled}
                  className="button-primary px-6 py-2 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  <span>{t('post')}</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feedback List */}
        <div className="space-y-4">
          <AnimatePresence>
            {feedbacks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <MessageSquare size={48} className="text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">{t('noFeedbackYet')}</p>
              </motion.div>
            ) : (
              feedbacks.map((feedback) => (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-effect rounded-xl p-4"
                >
                  {/* Main Comment */}
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center flex-shrink-0">
                      {feedback.userPhotoURL ? (
                        <img 
                          src={feedback.userPhotoURL} 
                          alt={feedback.userName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-dark-100">{feedback.userName}</span>
                        {feedback.isEdited && (
                          <span className="text-xs text-dark-500">{t('edited')}</span>
                        )}
                      </div>
                      
                      {editingId === feedback.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-dark-800 rounded-lg p-2 text-dark-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={3}
                          />
                          <div className="flex space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleEdit(feedback.id)}
                              className="button-primary px-4 py-1 text-sm flex items-center space-x-1"
                            >
                              <Check size={16} />
                              <span>{t('save')}</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setEditingId(null);
                                setEditText('');
                              }}
                              className="px-4 py-1 text-sm bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
                            >
                              {t('cancel')}
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-dark-200 mb-2 whitespace-pre-wrap break-words">
                            {feedback.content}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-dark-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <Clock size={12} />
                              <span title={formatFullTimestamp(feedback.createdAt)}>
                                {formatTimestamp(feedback.createdAt)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Actions */}
                      {editingId !== feedback.id && (
                        <div className="flex items-center space-x-4">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleLike(feedback.id, 'like')}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                              feedback.likes.includes((adminUser || user)?.uid || '')
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                            }`}
                          >
                            <ThumbsUp size={16} />
                            <span>{feedback.likes.length}</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleLike(feedback.id, 'love')}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                              feedback.loves.includes((adminUser || user)?.uid || '')
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                            }`}
                          >
                            <Heart size={16} />
                            <span>{feedback.loves.length}</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setReplyingTo(replyingTo === feedback.id ? null : feedback.id);
                              setReplyText('');
                            }}
                              disabled={!toggles.feedbackEnabled}
                              className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-dark-800 text-dark-400 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Reply size={16} />
                              <span>{t('reply')}</span>
                          </motion.button>
                          {((adminUser || user)?.uid === feedback.userId || adminUser) && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                setEditingId(feedback.id);
                                setEditText(feedback.content);
                              }}
                              className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-dark-800 text-dark-400 hover:bg-dark-700"
                            >
                              <Edit size={16} />
                            </motion.button>
                          )}
                        </div>
                      )}

                      {/* Reply Input */}
                      {replyingTo === feedback.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 ml-4 pl-4 border-l-2 border-primary-500/30"
                        >
                          <div className="flex items-start space-x-2">
                            <div className="w-8 h-8 rounded-full bg-primary-gradient flex items-center justify-center flex-shrink-0">
                              {(adminUser?.profilePhotoURL || user?.profilePhotoURL) ? (
                                <img 
                                  src={(adminUser || user)?.profilePhotoURL || ''} 
                                  alt={(adminUser || user)?.displayName || 'User'}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User size={16} className="text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              {!toggles.feedbackEnabled && (
                                <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                  <p className="text-xs text-yellow-400">
                                    {t('newFeedbackDisabled')}
                                  </p>
                                </div>
                              )}
                              <textarea
                                ref={replyTextareaRef}
                                value={replyText}
                                onChange={(e) => {
                                  setReplyText(e.target.value);
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                placeholder={t('writeReply')}
                                className="w-full bg-dark-800 rounded-lg p-2 text-dark-100 placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[60px] disabled:opacity-50 disabled:cursor-not-allowed"
                                rows={2}
                                disabled={!toggles.feedbackEnabled}
                              />
                              <div className="flex space-x-2 mt-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleReply(feedback.id)}
                                  disabled={!replyText.trim() || !toggles.feedbackEnabled}
                                  className="button-primary px-4 py-1 text-sm flex items-center space-x-1 disabled:opacity-50"
                                >
                                  <Send size={14} />
                                  <span>{t('reply')}</span>
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText('');
                                  }}
                                  className="px-4 py-1 text-sm bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
                                >
                                  {t('cancel')}
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Replies */}
                      {feedback.replies.length > 0 && (
                        <div className="mt-4 ml-4 pl-4 border-l-2 border-dark-700 space-y-3">
                          {feedback.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start space-x-2">
                              <div className="w-8 h-8 rounded-full bg-primary-gradient flex items-center justify-center flex-shrink-0">
                                {reply.userPhotoURL ? (
                                  <img 
                                    src={reply.userPhotoURL} 
                                    alt={reply.userName}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <User size={16} className="text-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-semibold text-dark-100 text-sm">{reply.userName}</span>
                                  {reply.isAdmin && (
                                    <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded">
                                      {t('admin')}
                                    </span>
                                  )}
                                  {reply.isEdited && (
                                    <span className="text-xs text-dark-500">{t('edited')}</span>
                                  )}
                                </div>
                                
                                {editingReplyId === reply.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editReplyText}
                                      onChange={(e) => setEditReplyText(e.target.value)}
                                      className="w-full bg-dark-800 rounded-lg p-2 text-dark-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                      rows={2}
                                    />
                                    <div className="flex space-x-2">
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleEditReply(feedback.id, reply.id)}
                                        className="button-primary px-3 py-1 text-xs flex items-center space-x-1"
                                      >
                                        <Check size={14} />
                                        <span>{t('save')}</span>
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                          setEditingReplyId(null);
                                          setEditReplyText('');
                                        }}
                                        className="px-3 py-1 text-xs bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
                                      >
                                        {t('cancel')}
                                      </motion.button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-dark-200 text-sm mb-2 whitespace-pre-wrap break-words">
                                      {reply.content}
                                    </p>
                                    <div className="flex items-center space-x-3">
                                      <div className="flex items-center space-x-1 text-xs text-dark-500">
                                        <Clock size={10} />
                                        <span title={formatFullTimestamp(reply.createdAt)}>
                                          {formatTimestamp(reply.createdAt)}
                                        </span>
                                      </div>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleReplyLike(feedback.id, reply.id, 'like')}
                                        className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs ${
                                          reply.likes.includes((adminUser || user)?.uid || '')
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'text-dark-500 hover:text-dark-400'
                                        }`}
                                      >
                                        <ThumbsUp size={12} />
                                        <span>{reply.likes.length}</span>
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleReplyLike(feedback.id, reply.id, 'love')}
                                        className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs ${
                                          reply.loves.includes((adminUser || user)?.uid || '')
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'text-dark-500 hover:text-dark-400'
                                        }`}
                                      >
                                        <Heart size={12} />
                                        <span>{reply.loves.length}</span>
                                      </motion.button>
                                      {((adminUser || user)?.uid === reply.userId || adminUser) && (
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => {
                                            setEditingReplyId(reply.id);
                                            setEditReplyText(reply.content);
                                          }}
                                          className="text-xs text-dark-500 hover:text-dark-400"
                                        >
                                          <Edit size={12} />
                                        </motion.button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}

