import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { id, replyId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
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

    const replies = feedbackData.replies || [];
    const replyIndex = replies.findIndex((r: any) => r.id === replyId);

    if (replyIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Reply not found' },
        { status: 404 }
      );
    }

    replies[replyIndex] = {
      ...replies[replyIndex],
      content: content.trim(),
      isEdited: true,
      updatedAt: new Date().toISOString(),
    };

    await supabaseServer.from('feedbacks').update({
      replies: replies,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Reply updated successfully'
    });

  } catch (error) {
    console.error('Error updating reply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update reply' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { id, replyId } = await params;

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

    const replies = feedbackData.replies || [];
    const replyIndex = replies.findIndex((r: any) => r.id === replyId);

    if (replyIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Reply not found' },
        { status: 404 }
      );
    }

    // Soft delete
    replies[replyIndex] = {
      ...replies[replyIndex],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    await supabaseServer.from('feedbacks').update({
      replies: replies,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Reply deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting reply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete reply' },
      { status: 500 }
    );
  }
}
