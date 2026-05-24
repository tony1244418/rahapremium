import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { getAdminToggleSettings } from '@/lib/admin-settings';
import {
  getContentSyncStatus,
  synchronizeContentLibrary,
  ContentSyncStatus,
  ContentSyncSummary
} from '@/lib/content-sync';

const serializeSyncStatus = (status: ContentSyncStatus) => ({
  ...status,
  runningSince: status.runningSince ? status.runningSince.toISOString() : null,
  lastRunAt: status.lastRunAt ? status.lastRunAt.toISOString() : null
});

const serializeSummary = (summary: ContentSyncSummary | null) => summary;

export async function GET(request: NextRequest) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const status = await getContentSyncStatus();
    return NextResponse.json({
      success: true,
      status: serializeSyncStatus(status)
    });
  } catch (error: any) {
    console.error('Failed to fetch content sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch content sync status'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await verifyAdminRequest(request);
  if (authError) return authError;

  const payload = await request.json().catch(() => ({}));
  const source = payload?.source === 'auto' ? 'auto' : 'manual';
  const requestedBy = typeof payload?.requestedBy === 'string' ? payload.requestedBy : null;

  if (source === 'auto') {
    const toggleSettings = await getAdminToggleSettings();
    if (!toggleSettings.values.autoContentSync) {
      return NextResponse.json(
        {
          success: false,
          error: 'Auto content sync is disabled in system settings'
        },
        { status: 403 }
      );
    }
  }

  try {
    const { summary, status } = await synchronizeContentLibrary({ source, requestedBy });
    return NextResponse.json({
      success: true,
      summary: serializeSummary(summary),
      status: serializeSyncStatus(status)
    });
  } catch (error: any) {
    const status = await getContentSyncStatus();

    if (error instanceof Error && error.message === 'SYNC_ALREADY_RUNNING') {
      return NextResponse.json(
        {
          success: false,
          error: 'Content sync is already running',
          status: serializeSyncStatus(status)
        },
        { status: 409 }
      );
    }

    console.error('Content sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to synchronise content',
        status: serializeSyncStatus(status)
      },
      { status: 500 }
    );
  }
}


