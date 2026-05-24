const fs = require('fs');

const path = 'src/app/feedback/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const newUseEffect = `  // Real-time listener for feedbacks - optimized to avoid constant reloads
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
  }, []);`;

const startIdx = content.indexOf('// Real-time listener for feedbacks');
const endIdxStr = 'return () => {\n      unsubscribe();\n    };\n  }, []);';
const endIdx = content.indexOf(endIdxStr, startIdx) + endIdxStr.length;

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  content = content.substring(0, startIdx) + newUseEffect + content.substring(endIdx);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Replaced useEffect successfully');
} else {
  console.log('Could not find useEffect block to replace');
}
