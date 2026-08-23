import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { data: snapshot, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const feedbacks = [];

    // Optimize user data fetching by batching it or caching in memory for this request
    const userCache = new Map<string, { userName: string, userPhotoURL: string | null, isAdmin: boolean }>();

    const getUserData = async (userId: string) => {
      if (userCache.has(userId)) return userCache.get(userId)!;

      let userName = 'Unknown';
      let userPhotoURL = null;
      let isAdmin = false;

      if (userId) {
        try {
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('id', userId)
            .single();

          if (adminData && !adminError) {
            const ad = adminData as any;
            userName = ad.name || ad.displayName || 'Admin';
            userPhotoURL = ad.profilePhotoURL || null;
            isAdmin = true;
          } else {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();

            if (userData && !userError) {
              const ud = userData as any;
              const nameValue = ud.name?.trim() || ud.displayName?.trim() || '';
              userName = nameValue || 'Unknown';
              userPhotoURL = ud.profilePhotoURL || null;
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      }

      const userData = { userName, userPhotoURL, isAdmin };
      userCache.set(userId, userData);
      return userData;
    };

    for (const data of ((snapshot as any[]) || [])) {
      // Skip deleted feedbacks
      if (data.is_deleted === true) {
        continue;
      }

      // Get user data
      const userData = await getUserData(data.user_id);

      // Process replies
      const replies = [];
      if (data.replies && Array.isArray(data.replies)) {
        for (const replyData of data.replies) {
          // Skip deleted replies
          if (replyData.isDeleted === true || replyData.is_deleted === true) {
            continue;
          }

          const replyUserData = await getUserData(replyData.userId);

          replies.push({
            id: replyData.id,
            userId: replyData.userId,
            userName: replyUserData.userName,
            content: replyData.content,
            createdAt: replyData.createdAt ? new Date(replyData.createdAt).toISOString() : new Date().toISOString(),
            likes: replyData.likes || [],
            loves: replyData.loves || [],
            isEdited: replyData.isEdited || false,
            isDeleted: replyData.isDeleted || false,
          });
        }
      }

      feedbacks.push({
        id: data.id,
        userId: data.user_id,
        userName: userData.userName,
        content: data.content,
        createdAt: data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString(),
        updatedAt: data.updated_at ? new Date(data.updated_at).toISOString() : undefined,
        likes: data.likes || [],
        loves: data.loves || [],
        replies: replies,
        isEdited: data.is_edited || false,
        isDeleted: data.is_deleted || false,
      });
    }

    return NextResponse.json({
      success: true,
      feedbacks: feedbacks
    });

  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedbacks' },
      { status: 500 }
    );
  }
}
