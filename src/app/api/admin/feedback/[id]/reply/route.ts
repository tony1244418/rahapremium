import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { content, userId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { data: feedbackData, error: feedbackError } = await supabaseServer
      .from('feedbacks')
      .select('*')
      .eq('id', id)
      .single();

    if (feedbackError || !feedbackData) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    const existingReplies = feedbackData.replies || [];

    // Check if user is admin
    const { data: adminData } = await supabaseServer
      .from('admins')
      .select('id')
      .eq('id', userId)
      .single();
    
    const isAdmin = !!adminData;

    const newReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      feedbackId: id,
      userId: userId,
      content: content.trim(),
      likes: [],
      loves: [],
      isEdited: false,
      isDeleted: false,
      isAdmin: isAdmin,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await supabaseServer.from('feedbacks').update({
      replies: [...existingReplies, newReply],
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Reply posted successfully',
      reply: newReply
    });

  } catch (error) {
    console.error('Error posting reply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to post reply' },
      { status: 500 }
    );
  }
}
