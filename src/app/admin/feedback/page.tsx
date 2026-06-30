'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetch } from '@/lib/api-client';
import { 
  MessageSquare, 
  Edit, 
  Trash2, 
  Search,
  Clock,
  ThumbsUp,
  Heart,
  Reply,
  User,
  X,
  Check,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Feedback, FeedbackReply } from '@/types';
import { Loading } from '@/components/ui/Loading';

export default function AdminFeedbackPage() {
  const { adminUser } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<{ feedbackId: string; replyId: string } | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadFeedbacks(true);
    
    // Set up real-time listener
    const interval = setInterval(() => {
      loadFeedbacks(false);
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadFeedbacks = async (isInitial = false) => {
    try {
      // Only show loading screen on initial load
      if (isInitial) {
        setLoading(true);
      }
      
      const response = await adminFetch('/api/admin/feedback');
      const data = await response.json();
      
      if (data.success) {
        setFeedbacks(data.feedbacks.map((f: any) => ({
          ...f,
          createdAt: new Date(f.createdAt),
          updatedAt: f.updatedAt ? new Date(f.updatedAt) : undefined,
          replies: f.replies.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
          })),
        })));
      }
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  const handleEdit = async (feedbackId: string) => {
    try {
      const response = await adminFetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText }),
      });

      const data = await response.json();
      if (data.success) {
        await loadFeedbacks();
        setEditingId(null);
        setEditText('');
      } else {
        alert(data.error || 'Failed to update feedback');
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      alert('Failed to update feedback');
    }
  };

  const handleDelete = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      console.log('🗑️ Frontend: Attempting to delete feedback:', feedbackId);
      const response = await adminFetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('❌ Frontend: HTTP error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Frontend: Error response:', errorText);
        alert(`Failed to delete feedback (HTTP ${response.status}). Please check the console.`);
        return;
      }

      const data = await response.json();
      console.log('📥 Frontend: Delete response:', data);
      
      if (data.success) {
        console.log('✅ Frontend: Feedback deleted, refreshing list...');
        await loadFeedbacks(false); // Don't show loading screen on refresh
      } else {
        console.error('❌ Frontend: Delete failed:', data.error, data.details);
        alert(data.error || 'Failed to delete feedback');
      }
    } catch (error) {
      console.error('❌ Frontend: Error deleting feedback:', error);
      alert('Failed to delete feedback. Please check the console for details.');
    }
  };

  const handleEditReply = async (feedbackId: string, replyId: string) => {
    try {
      const response = await adminFetch(`/api/admin/feedback/${feedbackId}/reply/${replyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editReplyText }),
      });

      const data = await response.json();
      if (data.success) {
        await loadFeedbacks();
        setEditingReplyId(null);
        setEditReplyText('');
      } else {
        alert(data.error || 'Failed to update reply');
      }
    } catch (error) {
      console.error('Error updating reply:', error);
      alert('Failed to update reply');
    }
  };

  const handleDeleteReply = async (feedbackId: string, replyId: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    try {
      const response = await adminFetch(`/api/admin/feedback/${feedbackId}/reply/${replyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await loadFeedbacks();
      } else {
        alert(data.error || 'Failed to delete reply');
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('Failed to delete reply');
    }
  };

  const handleReply = async (feedbackId: string) => {
    if (!adminUser || !replyText.trim()) return;

    try {
      const response = await adminFetch(`/api/admin/feedback/${feedbackId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: replyText.trim(),
          userId: adminUser.uid 
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadFeedbacks();
        setReplyText('');
        setReplyingTo(null);
      } else {
        alert(data.error || 'Failed to submit reply');
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Failed to submit reply');
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const searchLower = searchQuery.toLowerCase();
    return (
      feedback.content.toLowerCase().includes(searchLower) ||
      feedback.userName.toLowerCase().includes(searchLower) ||
      feedback.replies.some(reply => 
        reply.content.toLowerCase().includes(searchLower) ||
        reply.userName.toLowerCase().includes(searchLower)
      )
    );
  });

  if (loading) {
    return (
      <div className="container-mobile flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="relative">
                {/* Background splash effects */}
                <div className="absolute inset-0 water-ripple"></div>
                <Loading size="lg" text="Loading feedback..." variant="splash" />
              </div>
            </div>
          </div>
    );
  }

  return (
    <div className="container-mobile space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-gradient rounded-full flex items-center justify-center">
                <MessageSquare size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">
                  Community Feedback Management
                </h1>
                <p className="text-sm text-dark-400">
                  {feedbacks.length} total feedback{feedbacks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="glass-effect rounded-lg p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-500" size={20} />
              <input
                type="text"
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-800 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Feedback List */}
          <div className="space-y-4">
            <AnimatePresence>
              {filteredFeedbacks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 glass-effect rounded-lg"
                >
                  <MessageSquare size={48} className="text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400">
                    {searchQuery ? 'No feedbacks match your search' : 'No feedbacks yet'}
                  </p>
                </motion.div>
              ) : (
                filteredFeedbacks.map((feedback) => (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="glass-effect rounded-lg p-4"
                  >
                    {/* Main Feedback */}
                    <div className="flex items-start space-x-3 mb-3">
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
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-dark-100">{feedback.userName}</span>
                            {feedback.isEdited && (
                              <span className="text-xs text-dark-500">(edited)</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-dark-500 flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{formatTimestamp(feedback.createdAt)}</span>
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                setEditingId(feedback.id);
                                setEditText(feedback.content);
                              }}
                              className="p-2 text-dark-400 hover:text-primary-400 transition-colors"
                            >
                              <Edit size={16} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(feedback.id)}
                              className="p-2 text-dark-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          </div>
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
                                <Save size={14} />
                                <span>Save</span>
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
                                Cancel
                              </motion.button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-dark-200 mb-2 whitespace-pre-wrap break-words">
                            {feedback.content}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center space-x-4 text-sm text-dark-500 mb-3">
                          <div className="flex items-center space-x-1">
                            <ThumbsUp size={14} />
                            <span>{feedback.likes.length}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart size={14} />
                            <span>{feedback.loves.length}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Reply size={14} />
                            <span>{feedback.replies.length}</span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setReplyingTo(replyingTo === feedback.id ? null : feedback.id);
                              setReplyText('');
                            }}
                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                          >
                            <Reply size={14} />
                            <span>Reply as Admin</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Admin Reply Input */}
                    {replyingTo === feedback.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 ml-13 pl-4 border-l-2 border-primary-500/50 bg-primary-500/10 rounded-lg p-3"
                      >
                        <div className="flex items-start space-x-2">
                          <div className="w-8 h-8 rounded-full bg-red-gradient flex items-center justify-center flex-shrink-0">
                            {adminUser?.profilePhotoURL ? (
                              <img 
                                src={adminUser.profilePhotoURL} 
                                alt={adminUser.displayName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User size={16} className="text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="mb-2">
                              <span className="text-xs font-semibold text-primary-400">Replying as Admin</span>
                            </div>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your admin reply..."
                              className="w-full bg-dark-800 rounded-lg p-2 text-dark-100 placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                              rows={3}
                            />
                            <div className="flex space-x-2 mt-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleReply(feedback.id)}
                                disabled={!replyText.trim()}
                                className="button-primary px-4 py-1 text-sm flex items-center space-x-1 disabled:opacity-50"
                              >
                                <Reply size={14} />
                                <span>Post Reply</span>
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
                                Cancel
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Replies */}
                    {feedback.replies.length > 0 && (
                      <div className="ml-13 pl-4 border-l-2 border-dark-700 space-y-3 mt-4">
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
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-dark-100 text-sm">{reply.userName}</span>
                                  {reply.isAdmin && (
                                    <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded">
                                      Admin
                                    </span>
                                  )}
                                  {reply.isEdited && (
                                    <span className="text-xs text-dark-500">(edited)</span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-dark-500 flex items-center space-x-1">
                                    <Clock size={10} />
                                    <span>{formatTimestamp(reply.createdAt)}</span>
                                  </span>
                                  {editingReplyId?.replyId === reply.id ? (
                                    <>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleEditReply(feedback.id, reply.id)}
                                        className="p-1 text-green-400 hover:text-green-300"
                                      >
                                        <Check size={14} />
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                          setEditingReplyId(null);
                                          setEditReplyText('');
                                        }}
                                        className="p-1 text-dark-400 hover:text-dark-300"
                                      >
                                        <X size={14} />
                                      </motion.button>
                                    </>
                                  ) : (
                                    <>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                          setEditingReplyId({ feedbackId: feedback.id, replyId: reply.id });
                                          setEditReplyText(reply.content);
                                        }}
                                        className="p-1 text-dark-400 hover:text-primary-400"
                                      >
                                        <Edit size={12} />
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleDeleteReply(feedback.id, reply.id)}
                                        className="p-1 text-dark-400 hover:text-red-400"
                                      >
                                        <Trash2 size={12} />
                                      </motion.button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {editingReplyId?.replyId === reply.id ? (
                                <textarea
                                  value={editReplyText}
                                  onChange={(e) => setEditReplyText(e.target.value)}
                                  className="w-full bg-dark-800 rounded-lg p-2 text-dark-100 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                  rows={2}
                                />
                              ) : (
                                <p className="text-dark-200 text-sm mb-2 whitespace-pre-wrap break-words">
                                  {reply.content}
                                </p>
                              )}

                              <div className="flex items-center space-x-3 text-xs text-dark-500">
                                <div className="flex items-center space-x-1">
                                  <ThumbsUp size={10} />
                                  <span>{reply.likes.length}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Heart size={10} />
                                  <span>{reply.loves.length}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
  );
}

