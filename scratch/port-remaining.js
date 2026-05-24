const fs = require('fs');
const path = 'src/app/feedback/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Replace useEffect
const useEffectRegex = /\/\/ Real-time listener for feedbacks[\s\S]*?return \(\) => unsubscribe\(\);\n  }, \[\]\];/;
const newUseEffect = `// Real-time listener for feedbacks - optimized to avoid constant reloads
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
              if (reply.isDeleted) return;
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
          if (data.is_deleted) continue;
          
          const userData = data.user_id && userCacheRef.current.has(data.user_id)
            ? userCacheRef.current.get(data.user_id)
            : { userName: 'Anonymous', userPhotoURL: null, isAdmin: false };

          // Process replies
          const replies = [];
          if (data.replies && Array.isArray(data.replies)) {
            for (const replyData of data.replies) {
              if (replyData.isDeleted) continue;
              
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
          setFeedbacks(prevFeedbacks => {
            if (prevFeedbacks.length !== feedbacksData.length) {
              return feedbacksData;
            }
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
  }, []);`;
content = content.replace(useEffectRegex, newUseEffect);

// 2. Replace handleSubmitComment
const handleSubmitRegex = /const handleSubmitComment = async \(\) => \{[\s\S]*?setIsSubmitting\(false\);\n    \}\n  \};/;
const newHandleSubmit = `const handleSubmitComment = async () => {
    if (!user && !adminUser) {
      toast.error(t('feedback.loginRequired'));
      return;
    }

    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const currentUser = adminUser || user;
      
      if (!currentUser) {
        throw new Error('No user found');
      }

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
      
      toast.success('Maoni yametumwa kikamilifu!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Goshwa kutuma maoni. Tafadhali jaribu tena.');
    } finally {
      setIsSubmitting(false);
    }
  };`;
content = content.replace(handleSubmitRegex, newHandleSubmit);

// 3. Replace handleReply
const handleReplyRegex = /const handleReply = async \(feedbackId: string\) => \{[\s\S]*?toast\.error\('Goshwa kutuma jibu\. Tafadhali jaribu tena\.'\);\n    \}\n  \};/;
const newHandleReply = `const handleReply = async (feedbackId: string) => {
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
  };`;
content = content.replace(handleReplyRegex, newHandleReply);

// 4. Replace handleLike
const handleLikeRegex = /const handleLike = async \(feedbackId: string, type: 'like' \| 'love'\) => \{[\s\S]*?console\.error\('Error updating reaction:', error\);\n    \}\n  \};/;
const newHandleLike = `const handleLike = async (feedbackId: string, type: 'like' | 'love') => {
    const currentUser = adminUser || user;
    
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
  };`;
content = content.replace(handleLikeRegex, newHandleLike);

// 5. Replace handleReplyLike
const handleReplyLikeRegex = /const handleReplyLike = async \(feedbackId: string, replyId: string, type: 'like' \| 'love'\) => \{[\s\S]*?console\.error\('Error updating reply reaction:', error\);\n    \}\n  \};/;
const newHandleReplyLike = `const handleReplyLike = async (feedbackId: string, replyId: string, type: 'like' | 'love') => {
    const currentUser = adminUser || user;
    
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
  };`;
content = content.replace(handleReplyLikeRegex, newHandleReplyLike);

// 6. Replace handleEdit
const handleEditRegex = /const handleEdit = async \(feedbackId: string\) => \{[\s\S]*?toast\.error\('Ilishindwa kusasisha maoni'\);\n    \}\n  \};/;
const newHandleEdit = `const handleEdit = async (feedbackId: string) => {
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
  };`;
content = content.replace(handleEditRegex, newHandleEdit);

// 7. Replace handleEditReply
const handleEditReplyRegex = /const handleEditReply = async \(feedbackId: string, replyId: string\) => \{[\s\S]*?toast\.error\('Ilishindwa kusasisha jibu'\);\n    \}\n  \};/;
const newHandleEditReply = `const handleEditReply = async (feedbackId: string, replyId: string) => {
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
  };`;
content = content.replace(handleEditReplyRegex, newHandleEditReply);

// 8. Replace handleDelete
const handleDeleteRegex = /const handleDelete = async \(feedbackId: string\) => \{[\s\S]*?toast\.error\('Ilishindwa kufuta maoni'\);\n    \}\n  \};/;
const newHandleDelete = `const handleDelete = async (feedbackId: string) => {
    if (!window.confirm('Je, una uhakika unataka kufuta maoni haya?')) return;

    try {
      await supabase
        .from('feedbacks')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackId);
        
      toast.success('Maoni yamefutwa');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Ilishindwa kufuta maoni');
    }
  };`;
content = content.replace(handleDeleteRegex, newHandleDelete);

// 9. Replace handleDeleteReply
const handleDeleteReplyRegex = /const handleDeleteReply = async \(feedbackId: string, replyId: string\) => \{[\s\S]*?toast\.error\('Ilishindwa kufuta jibu'\);\n    \}\n  \};/;
const newHandleDeleteReply = `const handleDeleteReply = async (feedbackId: string, replyId: string) => {
    if (!window.confirm('Je, una uhakika unataka kufuta jibu hili?')) return;

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
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      };

      await supabase
        .from('feedbacks')
        .update({
          replies: replies,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackId);

      toast.success('Jibu limefutwa');
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error('Ilishindwa kufuta jibu');
    }
  };`;
content = content.replace(handleDeleteReplyRegex, newHandleDeleteReply);

fs.writeFileSync(path, content, 'utf8');
console.log('All migrations applied successfully!');
