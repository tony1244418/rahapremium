# Requirements Document

## Introduction

Today RahaPremium uses a **single subscription per user**. One package (FEDHA, CHUMA, DHAHABU, ALMASI, MALKIA) unlocks **all** content — movies, series, live channels and stories — through each content item's `requiredPackages` field plus a tier hierarchy.

This feature carves **Live TV (live channels)** out into its **own separate package set**. Everything else stays exactly as it is today:

- **General / Movie packages** — the existing packages, unchanged. They continue to gate movies, series, stories, and all current non-live content.
- **Live TV packages** — a NEW, separate package set used only for live channels.

The Live TV set starts as an **exact copy** of the current packages (same names, prices, durations, and descriptions). After launch, an admin can edit the Live TV set without affecting the general/movie packages, and vice versa ("when I change it, it changes only the channel").

### Key Decision (assumption — confirm during review)

- The existing subscription continues to work exactly as today for movies and all current content.
- Live channels now require their **own** Live TV subscription, purchased separately from the general/movie subscription.
- Editing one package set never affects the other.

> If you instead want the Live TV package to be purely an admin-side price/label change (no separate user purchase), flag it now and we will revise before design.

## Glossary

- **General / Movie packages**: The existing package set (FEDHA, CHUMA, DHAHABU, ALMASI, MALKIA), unchanged. Gates movies, series, stories, and current non-live content.
- **Live TV packages**: The new, separate package set used only for live channels.
- **Live TV subscription**: A user's active subscription within the Live TV set.
- **Package config**: The editable price, duration (days), display name, and description for a single package.

## Requirements

### Requirement 1: Live TV gets its own package set

**User Story:** As an admin, I want live channels to have their own package set separate from the existing packages, so that Live TV can be priced and managed on its own.

#### Acceptance Criteria

1. WHEN the system initializes package configuration THEN it SHALL provide a separate Live TV package set in addition to the existing general/movie package set.
2. WHEN no admin overrides exist for the Live TV set THEN it SHALL default to identical values (same package names, prices, durations, and descriptions) as the current packages.
3. The Live TV set and the general/movie set SHALL be stored such that updating one does not read from or write to the other.
4. WHEN game packages are considered THEN they SHALL remain unchanged and separate from both sets.
5. WHEN the general/movie package set is considered THEN its current behavior, names, prices, and durations SHALL remain unchanged by this feature.

### Requirement 2: Independent admin editing

**User Story:** As an admin, I want to edit a Live TV package without changing the existing packages, so that the two can diverge over time.

#### Acceptance Criteria

1. WHEN an admin opens the package management screen THEN the system SHALL display the general/movie packages and the Live TV packages in clearly separated sections.
2. WHEN an admin edits and saves a Live TV package's price, duration, name, or description THEN the system SHALL persist that change to the Live TV set only.
3. WHEN an admin edits and saves a general/movie package THEN the system SHALL persist that change to the general/movie set only.
4. WHEN an admin saves a change in one set THEN the equivalent package in the other set SHALL remain unchanged.

### Requirement 3: Live TV subscription purchased separately

**User Story:** As a user, I want to subscribe to Live TV separately, so that live channels are unlocked by their own package.

#### Acceptance Criteria

1. WHEN a user views the subscriptions screen THEN the system SHALL present Live TV packages as separate, independently purchasable options alongside the existing packages.
2. WHEN a user completes payment for a Live TV package THEN the system SHALL activate a Live TV subscription without affecting any existing general/movie subscription.
3. WHEN a user completes payment for a general/movie package THEN it SHALL behave exactly as today and SHALL NOT affect any Live TV subscription.
4. WHEN a user has an active Live TV subscription and subscribes again to Live TV THEN existing renewal/upgrade behavior (carry-over of remaining time) SHALL apply within the Live TV set only.
5. WHEN the subscriptions screen is shown THEN the system SHALL display active status, days remaining, and expiry for the Live TV subscription separately from the general/movie subscription.

### Requirement 4: Content access gating

**User Story:** As a user, I want my Live TV subscription to unlock live channels and my existing subscription to keep unlocking movies, so access matches what I paid for.

#### Acceptance Criteria

1. WHEN access to a live channel is evaluated THEN the system SHALL grant access based on the user's Live TV subscription only.
2. WHEN access to a movie, series, story, or other current content is evaluated THEN the system SHALL grant access based on the existing/general subscription exactly as today.
3. WHEN a content item has no required packages OR is marked free OR an "all free" toggle is enabled THEN the system SHALL grant access as it does today.
4. WHEN per-content one-time purchase applies to an item THEN existing purchase-based access SHALL continue to work unchanged.

### Requirement 5: Backward compatibility and migration

**User Story:** As an existing user with an active subscription, I want my current access to keep working after the change, so that I am not locked out of content I already paid for.

#### Acceptance Criteria

1. WHEN the feature is deployed THEN existing active subscriptions SHALL retain their current expiry dates and continue to unlock movies/series/stories as before.
2. WHEN an existing user without a Live TV subscription opens Live TV THEN the system SHALL apply a clearly defined transition rule (e.g., grant Live TV for the remaining time of their current subscription, or require a new Live TV purchase) — to be confirmed during design.
3. WHEN live channel content still references legacy package names THEN Live TV access checks SHALL continue to resolve correctly under the new Live TV set.

### Requirement 6: Consistent labeling

**User Story:** As a user, I want clear labels showing which subscription applies to Live TV, so that I understand what each purchase covers.

#### Acceptance Criteria

1. WHEN a Live TV package is displayed (admin or user) THEN it SHALL be labeled as Live TV.
2. WHEN the existing packages are displayed THEN their labeling SHALL remain as today.
3. WHEN a payment confirmation is shown for a Live TV package THEN it SHALL state that the user is paying for Live TV.

## Open Questions

1. **Separate user purchase** — This spec assumes Live TV requires its own separate subscription purchase. Confirm, or is the Live TV "package" only an admin-side price/label that the existing subscription still unlocks?
2. **Migration for existing users** — When the split goes live, do current subscribers get Live TV for free for their remaining days, or must they buy a Live TV package to keep watching channels?
3. **Package names** — Should the Live TV set reuse the same names (FEDHA, CHUMA, ...) or get distinct Live-TV-specific names?
