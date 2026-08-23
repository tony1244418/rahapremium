import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminRequest } from '@/lib/adminAuth';

// Helper: convert any date-like value to ISO string
function toISOSafe(val: any): string | null {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate().toISOString();
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string') return val;
    return null;
}

// Normalize phone for consistent matching
function normalizePhone(phone: string): string {
    if (!phone) return phone;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('255')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+255${cleaned.substring(1)}`;
    if (!phone.startsWith('+')) return `+${cleaned}`;
    return phone;
}

export async function GET(request: NextRequest) {
    try {
        const authError = await verifyAdminRequest(request);
        if (authError) return authError;

        // Fetch payments and users in parallel — no N+1 queries
        const [paymentsResult, usersResult] = await Promise.all([
            supabase
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false }),
            supabase
                .from('rahapremium_users')
                .select('id, phone_number, display_name, username, subscription')
        ]);

        if (paymentsResult.error) {
            console.error('Failed to fetch payments:', paymentsResult.error);
            return NextResponse.json({ success: false, error: 'Failed to fetch payments' }, { status: 500 });
        }

        const payments = (paymentsResult.data as any[]) || [];
        const users = (usersResult.data as any[]) || [];

        // Build lookup maps for O(1) joins
        const userById = new Map<string, any>();
        const usersByPhone = new Map<string, any[]>();

        for (const u of users) {
            userById.set(u.id, u);
            const normalized = normalizePhone(u.phone_number || '');
            if (normalized) {
                if (!usersByPhone.has(normalized)) usersByPhone.set(normalized, []);
                usersByPhone.get(normalized)!.push(u);
            }
            // Also index by raw phone
            if (u.phone_number && u.phone_number !== normalized) {
                if (!usersByPhone.has(u.phone_number)) usersByPhone.set(u.phone_number, []);
                usersByPhone.get(u.phone_number)!.push(u);
            }
        }

        const paymentsWithUserInfo = payments.map((payment: any) => {
            // Find user by id first, then by phone
            let user = userById.get(payment.user_id) || null;
            if (!user) {
                const normalizedPaymentPhone = normalizePhone(payment.phone_number || '');
                const candidates = usersByPhone.get(normalizedPaymentPhone) || usersByPhone.get(payment.phone_number) || [];
                user = candidates[0] || null;
            }

            const userName = user?.display_name || user?.username || 'Unknown User';
            const userPhone = user?.phone_number || payment.phone_number || '';

            // Find the user with an active subscription for this phone
            // (handles duplicate accounts where subscription is on a different UID)
            let activePlanUser = user;
            if (!user?.subscription?.isActive) {
                const normalizedPhone = normalizePhone(payment.phone_number || '');
                const phoneCandidates = [
                    ...(usersByPhone.get(normalizedPhone) || []),
                    ...(usersByPhone.get(payment.phone_number) || [])
                ];
                const activeCandidate = phoneCandidates.find(u => u.subscription?.isActive);
                if (activeCandidate) activePlanUser = activeCandidate;
            }

            const rawSub = activePlanUser?.subscription ?? null;
            const isActive = rawSub?.isActive ?? false;
            const endDate = toISOSafe(rawSub?.endDate);
            const isExpired = isActive && endDate && new Date(endDate) <= new Date();

            const activePlan = rawSub ? {
                packageType: rawSub.packageType ?? null,
                isActive: isActive && !isExpired,
                endDate: endDate,
            } : null;

            return {
                id: payment.id,
                userId: payment.user_id,
                userName,
                userPhone,
                packageType: payment.package_type || payment.payment_type || '',
                paymentType: payment.payment_type || 'subscription',
                amount: payment.amount,
                status: (payment.status || 'pending').toLowerCase(),
                phoneNumber: payment.phone_number,
                transactionId: payment.order_id,
                createdAt: toISOSafe(payment.created_at) ?? new Date().toISOString(),
                completedAt: toISOSafe(payment.completed_at),
                failureReason: payment.failure_reason || null,
                isManuallyCompleted: payment.is_manually_completed || false,
                completedBy: payment.completed_by || null,
                gameId: payment.game_id || null,
                contentId: payment.content_id || null,
                activePlan,
            };
        });

        const res = NextResponse.json({
            success: true,
            payments: paymentsWithUserInfo
        });
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.headers.set('Pragma', 'no-cache');
        return res;

    } catch (error) {
        console.error('Error fetching payments:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch payments'
        }, { status: 500 });
    }
}

