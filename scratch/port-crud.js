const fs = require('fs');

const path = 'src/app/feedback/page.tsx';
let content = fs.readFileSync(path, 'utf8');

function replaceBlock(startMarker, endMarker, newContent) {
    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) {
        console.error(`Start marker not found: ${startMarker}`);
        return;
    }
    const endIdx = content.indexOf(endMarker, startIdx);
    if (endIdx === -1) {
        console.error(`End marker not found: ${endMarker}`);
        return;
    }
    content = content.substring(0, startIdx) + newContent + content.substring(endIdx + endMarker.length);
}

replaceBlock(
    '// Real-time listener for feedbacks',
    'return () => {\n      unsubscribe();\n    };\n  }, []);',
    `// Real-time listener for feedbacks - optimized to avoid constant reloads
  useEffect(() => {
    let isMounted = true;

    const fetchFeedbacks = async () => {
      try {
        const { data: docs, error } = await supabase
          .from('feedbacks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching feedbacks:', error);
          if (isMounted) setLoading(false);
          return;
        }

        if (!docs) return;

        // Collect all unique user IDs to fetch their data
        const userIds = new Set<string>();
        
        docs.forEach(data => {
          if (data.is_deleted) return;
          
          if (data.user_id) userIds.add(data.user_id);
          
          if (data.replies && Array.isArray(data.replies)) {
            data.replies.forEach((reply) => {
              if (reply.isDeleted) return; // Skip getting user data for deleted replies
              if (reply.userId) userIds.add(reply.userId);
            });
          }
        });

        // Fetch uncached user data in parallel
        const uncachedUserIds = Array.from(userIds).filter(userId => !userCacheRef.current.has(userId));
        
        if (uncachedUserIds.length > 0) {
          await Promise.all(uncachedUserIds.map(userId => getUserData(userId, false)));
        }

        // Process docs after all necessary user data is cached
        const feedbacksData = [];
        
        for (const data of docs) {
          if (data.is_deleted) continue; // Skip completely deleted feedback
          
          const userData = data.user_id && userCacheRef.current.has(data.user_id)
            ? userCacheRef.current.get(data.user_id)
            : { userName: 'Anonymous', userPhotoURL: null, isAdmin: false };

          // Process replies
          const replies = [];
          if (data.replies && Array.isArray(data.replies)) {
            for (const replyData of data.replies) {
              if (replyData.isDeleted) continue; // Skip completely deleted replies
              
              const replyUserData = replyData.userId && userCacheRef.current.has(replyData.userId)
                ? userCacheRef.current.get(replyData.userId)
                : { userName: 'Anonymous', userPhotoURL: null, isAdmin: false };

              replies.push({
                id: replyData.id || \`reply_\${Date.now()}_\${Math.random()}\`,
                feedbackId: data.id,
                userId: replyData.userId || '',
                userName: replyUserData.userName,
                userPhotoURL: replyUserData.userPhotoURL,
                content: replyData.content || '',
                createdAt: new Date(replyData.createdAt || new Date()),
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
            createdAt: new Date(data.created_at || new Date()),
            updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
            likes: data.likes || [],
            loves: data.loves || [],
            replies: replies,
            isEdited: data.is_edited || false,
            isDeleted: data.is_deleted || false,
          });
        }

        if (isMounted) {
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
        }
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
        if (isMounted) setLoading(false);
      }
    };

    fetchFeedbacks();

    // Set up Supabase Realtime subscription
    const channel = supabase
      .channel('public:feedbacks')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'feedbacks' }, 
        () => {
          fetchFeedbacks();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);`
);

replaceBlock(
    'const handleSubmitComment = async (e: React.FormEvent) => {',
    '  };\n\n  const handleReply =',
    `const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      await supabase.from('feedbacks').insert({
        user_id: currentUser.uid,
        content: commentText.trim(),
        likes: [],
        loves: [],
        replies: [],
        is_edited: false,
        is_deleted: false,
      });

      setCommentText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Goshwa kutuma maoni. Tafadhali jaribu tena.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply =`
);

replaceBlock(
    'const handleReply = async (feedbackId: string) => {',
    '  };\n\n  const handleLike =',
    `const handleReply = async (feedbackId: string) => {
    if (!replyText.trim() || !currentUser) return;

    try {
      const { data: feedbackData, error: fetchError } = await supabase
        .from('feedbacks')
        .select('replies')
        .eq('id', feedbackId)
        .single();
        
      if (fetchError || !feedbackData) return;

      const existingReplies = feedbackData.replies || [];

      const newReply = {
        id: \`reply_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
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
      toast.error('Goshwa kutuma jibu. Tafadhali jaribu tena.');
    }
  };

  const handleLike =`
);

replaceBlock(
    'const handleLike = async (feedbackId: string, type: \'like\' | \'love\') => {',
    '  };\n\n  const handleReplyLike =',
    `const handleLike = async (feedbackId: string, type: 'like' | 'love') => {
    if (!currentUser) {
      toast.error('Tafadhali ingia ili kupenda maoni');
      return;
    }

    try {
      const { data: feedbackData, error: fetchError } = await supabase
        .from('feedbacks')
        .select('likes, loves')
        .eq('id', feedbackId)
        .single();
        
      if (fetchError || !feedbackData) return;

      const likes = feedbackData.likes || [];
      const loves = feedbackData.loves || [];

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

  const handleReplyLike =`
);

replaceBlock(
    'const handleReplyLike = async (feedbackId: string, replyId: string, type: \'like\' | \'love\') => {',
    '  };\n\n  const handleEdit =',
    `const handleReplyLike = async (feedbackId: string, replyId: string, type: 'like' | 'love') => {
    if (!currentUser) {
      toast.error('Tafadhali ingia ili kupenda jibu');
      return;
    }

    try {
      const { data: feedbackData, error: fetchError } = await supabase
        .from('feedbacks')
        .select('replies')
        .eq('id', feedbackId)
        .single();
        
      if (fetchError || !feedbackData) return;

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

  const handleEdit =`
);

replaceBlock(
    'const handleEdit = async (feedbackId: string) => {',
    '  };\n\n  const handleEditReply =',
    `const handleEdit = async (feedbackId: string) => {
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
      toast.success('Maoni yamesasishwa');
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Ilishindwa kusasisha maoni');
    }
  };

  const handleEditReply =`
);

replaceBlock(
    'const handleEditReply = async (feedbackId: string, replyId: string) => {',
    '  };\n\n  const handleDelete =',
    `const handleEditReply = async (feedbackId: string, replyId: string) => {
    if (!editReplyText.trim()) return;

    try {
      const { data: feedbackData, error: fetchError } = await supabase
        .from('feedbacks')
        .select('replies')
        .eq('id', feedbackId)
        .single();
        
      if (fetchError || !feedbackData) return;

      const replies = feedbackData.replies || [];
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
      toast.success('Jibu limesasishwa');
    } catch (error) {
      console.error('Error updating reply:', error);
      toast.error('Ilishindwa kusasisha jibu');
    }
  };

  const handleDelete =`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Modifications applied successfully');
