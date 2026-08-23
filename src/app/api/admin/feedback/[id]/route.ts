import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    const { data: feedbackDoc, error: fetchError } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !feedbackDoc) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from('feedbacks')
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback updated successfully'
    });

  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { id } = await params;
    console.log('🗑️ Attempting to delete feedback:', id);

    const { data: feedbackDoc, error: fetchError } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !feedbackDoc) {
      console.error('❌ Feedback not found:', id);
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Soft delete by marking as deleted
    const { error: updateError } = await supabase
      .from('feedbacks')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Feedback soft-deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
