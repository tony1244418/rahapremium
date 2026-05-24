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
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  Timestamp,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
        const adminDoc = await getDoc(doc(db, 'admins', userId));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          // Use 'name' field first, fallback to 'displayName'
          userName = adminData.name || adminData.displayName || 'Admin';
          userPhotoURL = adminData.profilePhotoURL || null;
          isAdmin = true;
        } else {
          // Check regular user
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Use 'name' field first, fallback to 'displayName' (username is confidential)
            // displayName is the actual name field in the user document
            // Handle empty strings and null values
            const nameValue = userData.name?.trim() || userData.displayName?.trim() || '';
            userName = nameValue || 'Anonymous';
            userPhotoURL = userData.profilePhotoURL || null;
            
            // Debug logging if name is still missing
            if (!userName || userName === 'Anonymous') {
              console.log('⚠️ User data found but name is missing:', {
                userId,
                hasName: !!userData.name,
                hasDisplayName: !!userData.displayName,
                nameValue: userData.name,
                displayNameValue: userData.displayName,
                trimmedName: userData.name?.trim(),
                trimmedDisplayName: userData.displayName?.trim(),
                allFields: Object.keys(userData),
                userData: userData // Full user data for debugging
              });
            } else {
              console.log('✅ User name found:', { userId, userName });
            }
          } else {
            console.warn('❌ User document not found for userId:', userId);
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

  // Real-time listener for feedbacks - optimized to avoid constant reloads
  useEffect(() => {
    const q = query(
      collection(db, 'feedbacks'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Collect all unique user IDs first (skip deleted feedbacks and replies)
      const userIds = new Set<string>();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        // Skip deleted feedbacks
        if (data.isDeleted === true) {
          return;
        }
        if (data.userId) userIds.add(data.userId);
        if (data.replies && Array.isArray(data.replies)) {
          data.replies.forEach((reply: any) => {
            // Skip deleted replies
            if (reply.isDeleted === true) {
              return;
            }
            if (reply.userId) userIds.add(reply.userId);
          });
        }
      });

      // Batch fetch only uncached user data
      const uncachedUserIds = Array.from(userIds).filter(userId => !userCacheRef.current.has(userId));
      
      // If this is the first load and we have uncached users, fetch them first
      const isFirstLoad = loading;
      if (uncachedUserIds.length > 0) {
        if (isFirstLoad) {
          // On first load, wait for user data to be fetched
          await Promise.all(uncachedUserIds.map(userId => getUserData(userId, false)));
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
      }
      
      // Process feedbacks with cached data (synchronous access - no blocking)
      const feedbacksData: Feedback[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Skip deleted feedbacks
        if (data.isDeleted === true) {
          continue;
        }
        
        // Get user data from cache (synchronous - fast)
        const userData = data.userId && userCacheRef.current.has(data.userId)
          ? userCacheRef.current.get(data.userId)!
          : { userName: 'Anonymous', userPhotoURL: null, isAdmin: false };

        // Process replies (filter out deleted replies)
        const replies: FeedbackReply[] = [];
        if (data.replies && Array.isArray(data.replies)) {
          for (const replyData of data.replies) {
            // Skip deleted replies
            if (replyData.isDeleted === true) {
              continue;
            }
            
            const replyUserData = replyData.userId && userCacheRef.current.has(replyData.userId)
              ? userCacheRef.current.get(replyData.userId)!
              : { userName: 'Anonymous', userPhotoURL: null, isAdmin: false };

            replies.push({
              id: replyData.id || `reply_${Date.now()}_${Math.random()}`,
              feedbackId: docSnap.id,
              userId: replyData.userId || '',
              userName: replyUserData.userName,
              userPhotoURL: replyUserData.userPhotoURL,
              content: replyData.content || '',
              createdAt: replyData.createdAt?.toDate ? replyData.createdAt.toDate() : new Date(),
              updatedAt: replyData.updatedAt?.toDate ? replyData.updatedAt.toDate() : undefined,
              likes: replyData.likes || [],
              loves: replyData.loves || [],
              isEdited: replyData.isEdited || false,
              isDeleted: replyData.isDeleted || false,
              isAdmin: replyData.isAdmin || replyUserData.isAdmin,
            });
          }
        }

        feedbacksData.push({
          id: docSnap.id,
          userId: data.userId || '',
          userName: userData.userName,
          userPhotoURL: userData.userPhotoURL,
          content: data.content || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
          likes: data.likes || [],
          loves: data.loves || [],
          replies: replies,
          isEdited: data.isEdited || false,
          isDeleted: data.isDeleted || false,
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
    }, (error) => {
      console.error('Error listening to feedbacks:', error);
      setLoading(false);
    });

    return () => unsubscribe();
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
      await addDoc(collection(db, 'feedbacks'), {
        userId: currentUser.uid,
        content: commentText.trim(),
        likes: [],
        loves: [],
        replies: [],
        isEdited: false,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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
    if (!user && !adminUser) {
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!toggles.feedbackEnabled) {
      alert(t('newFeedbackDisabled'));
      return;
    }

    if (!replyText.trim()) return;

    try {
      const feedbackRef = doc(db, 'feedbacks', feedbackId);
      const feedbackDoc = await getDoc(feedbackRef);
      
      if (!feedbackDoc.exists()) return;

      const feedbackData = feedbackDoc.data();
      const existingReplies = feedbackData.replies || [];

      const currentUser = adminUser || user;
      if (!currentUser) return;

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
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(feedbackRef, {
        replies: [...existingReplies, newReply],
        updatedAt: serverTimestamp(),
      });

      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert(t('failedToSubmitReply'));
    }
  };

  const handleLike = async (feedbackId: string, type: 'like' | 'love') => {
    if (!user && !adminUser) {
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    const currentUser = adminUser || user;
    if (!currentUser) return;

    try {
      const feedbackRef = doc(db, 'feedbacks', feedbackId);
      const feedbackDoc = await getDoc(feedbackRef);
      
      if (!feedbackDoc.exists()) return;

      const feedbackData = feedbackDoc.data();
      const likes = feedbackData.likes || [];
      const loves = feedbackData.loves || [];

      if (type === 'like') {
        const newLikes = likes.includes(currentUser.uid)
          ? likes.filter((id: string) => id !== currentUser.uid)
          : [...likes, currentUser.uid];
        
        // Remove from loves if present
        const newLoves = loves.filter((id: string) => id !== currentUser.uid);

        await updateDoc(feedbackRef, {
          likes: newLikes,
          loves: newLoves,
          updatedAt: serverTimestamp(),
        });
      } else {
        const newLoves = loves.includes(currentUser.uid)
          ? loves.filter((id: string) => id !== currentUser.uid)
          : [...loves, currentUser.uid];
        
        // Remove from likes if present
        const newLikes = likes.filter((id: string) => id !== currentUser.uid);

        await updateDoc(feedbackRef, {
          likes: newLikes,
          loves: newLoves,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error updating like/love:', error);
    }
  };

  const handleReplyLike = async (feedbackId: string, replyId: string, type: 'like' | 'love') => {
    if (!user && !adminUser) {
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    const currentUser = adminUser || user;
    if (!currentUser) return;

    try {
      const feedbackRef = doc(db, 'feedbacks', feedbackId);
      const feedbackDoc = await getDoc(feedbackRef);
      
      if (!feedbackDoc.exists()) return;

      const feedbackData = feedbackDoc.data();
      const replies = feedbackData.replies || [];
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
          updatedAt: Timestamp.now(),
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
          updatedAt: Timestamp.now(),
        };
      }

      await updateDoc(feedbackRef, {
        replies: replies,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating reply like/love:', error);
    }
  };

  const handleEdit = async (feedbackId: string) => {
    if (!user && !adminUser) return;

    try {
      const feedbackRef = doc(db, 'feedbacks', feedbackId);
      await updateDoc(feedbackRef, {
        content: editText.trim(),
        isEdited: true,
        updatedAt: serverTimestamp(),
      });

      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing feedback:', error);
      alert(t('failedToEditComment'));
    }
  };

  const handleEditReply = async (feedbackId: string, replyId: string) => {
    if (!user && !adminUser) return;

    try {
      const feedbackRef = doc(db, 'feedbacks', feedbackId);
      const feedbackDoc = await getDoc(feedbackRef);
      
      if (!feedbackDoc.exists()) return;

      const feedbackData = feedbackDoc.data();
      const replies = feedbackData.replies || [];
      const replyIndex = replies.findIndex((r: any) => r.id === replyId);
      
      if (replyIndex === -1) return;

      replies[replyIndex] = {
        ...replies[replyIndex],
        content: editReplyText.trim(),
        isEdited: true,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(feedbackRef, {
        replies: replies,
        updatedAt: serverTimestamp(),
      });

      setEditingReplyId(null);
      setEditReplyText('');
    } catch (error) {
      console.error('Error editing reply:', error);
      alert(t('failedToEditReply'));
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

