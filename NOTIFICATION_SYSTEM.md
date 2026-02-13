# Real-Time Notification System - Implementation Guide

## Overview
The notification system provides real-time updates to users via sidebar badges, auto-refresh, and desktop notifications. It uses a lightweight polling approach (no WebSocket required).

## Architecture

### Backend
- **Endpoint**: `GET /api/v1/core/module-counts/`
- **Location**: `apps/core/api_views.py` → `api_module_notification_counts()`
- **Response Format**:
```json
{
  "consultations": {
    "waiting": 3,
    "active": 1
  },
  "laboratory": {
    "pending": 5,
    "in_progress": 2,
    "results_ready": 1
  },
  "pharmacy": {
    "pending": 4
  },
  "reception": {
    "waiting": 2
  },
  "timestamp": "2026-02-08T10:30:00Z"
}
```

- **Performance**: Uses only `COUNT()` queries, filtered by organization
- **Security**: Requires authentication (`@permission_classes([IsAuthenticated])`)

### Frontend

#### 1. NotificationContext Provider
**File**: `frontend/src/contexts/NotificationContext.jsx`

- Polls the endpoint every 20 seconds
- Detects count increases by comparing with previous values
- Dispatches `module-data-changed` CustomEvent when counts increase
- Sends desktop notifications (with user permission)
- Provides hooks: `getModuleCount(moduleId)`, `hasNewItems(moduleId)`

#### 2. Auto-Refresh Hook
**File**: `frontend/src/hooks/useAutoRefresh.js`

```javascript
useAutoRefresh('laboratory', fetchData);
```

Listens for `module-data-changed` events and triggers the callback when the specified module has new data.

#### 3. Sidebar Badges
**File**: `frontend/src/layouts/MainLayout.jsx`

- Shows red badge with count (max "9+") on sidebar menu items
- Only appears when `getModuleCount(moduleId) > 0`
- Works for: consultations, laboratory, pharmacy, reception

#### 4. Desktop Notifications
Automatically triggered when counts increase:
- "Nouveau patient en salle d'attente" (consultations.waiting)
- "Nouveau prelevement en attente au laboratoire" (laboratory.pending)
- "Nouvelle dispensation en attente" (pharmacy.pending)
- "Nouveau patient a la reception" (reception.waiting)

## Integration Points

### Already Integrated
✓ `frontend/src/App.jsx` - Wrapped with `<NotificationProvider>`
✓ `frontend/src/pages/healthcare/consultations/ConsultationList.jsx` - Auto-refresh enabled
✓ `frontend/src/pages/healthcare/laboratory/LabQueueDashboard.jsx` - Auto-refresh enabled

### To Integrate in New Pages
1. Import the hook: `import useAutoRefresh from '../../../hooks/useAutoRefresh';`
2. Call it with your module ID and fetch function:
   ```javascript
   useAutoRefresh('pharmacy', fetchDispensings);
   ```

## Module IDs
- `consultations` → Waiting room & active consultations
- `laboratory` → Lab orders (pending, in progress, results ready)
- `pharmacy` → Dispensations
- `reception` → Patient visits

## Testing

### Backend Test
```bash
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/v1/core/module-counts/
```

### Frontend Test
1. Open app in 2 browser tabs
2. In tab 1: Create a new consultation or lab order
3. In tab 2 (within 20 seconds):
   - Badge appears on sidebar
   - Desktop notification fires (if permission granted)
   - Dashboard auto-refreshes

### Verification
```python
# Django shell
from django.contrib.auth import get_user_model
from apps.consultations.models import Consultation
from django.utils import timezone

User = get_user_model()
user = User.objects.filter(organization__isnull=False).first()
today = timezone.now().date()

# Check counts
Consultation.objects.filter(
    organization=user.organization,
    consultation_date__date=today,
    status__in=['waiting', 'vitals_pending', 'ready_for_doctor']
).count()
```

## Performance Considerations
- Polling interval: 20 seconds (configurable in `NotificationContext.jsx`)
- Each request makes 4 COUNT queries (consultations, lab, pharmacy, reception)
- Desktop notifications only sent on count increases (not on every poll)
- Auto-refresh only triggered when counts increase (not on every poll)

## Browser Compatibility
- Desktop notifications require user permission (requested on mount)
- Works in: Chrome, Firefox, Edge, Safari
- Falls back gracefully if notifications blocked

## Customization

### Change Poll Interval
Edit `frontend/src/contexts/NotificationContext.jsx`:
```javascript
const POLL_INTERVAL = 30000; // Change to 30 seconds
```

### Add New Module
1. Add count query to `apps/core/api_views.py` → `api_module_notification_counts()`
2. Add notification message to `MODULE_MESSAGES` in `NotificationContext.jsx`
3. Add module ID to sidebar badge logic in `MainLayout.jsx`
4. Add `useAutoRefresh('new_module', fetchFunction)` to the dashboard page

## Troubleshooting

### Badges Not Showing
- Check browser console for API errors
- Verify user has auth token (`localStorage.getItem('authToken')`)
- Confirm endpoint returns data: `/api/v1/core/module-counts/`

### Auto-Refresh Not Working
- Check that `useAutoRefresh` is called with correct module ID
- Verify `module-data-changed` event is dispatched (browser DevTools → Console)
- Ensure fetch function is wrapped in `useCallback` if it has dependencies

### Desktop Notifications Not Working
- Check notification permission: `Notification.permission` in console
- Grant permission when prompted on first load
- Verify browser supports Notification API
- Check that counts are actually increasing (not just changing)

## Future Enhancements (Phase 4)
- WebSocket support for instant updates (no polling delay)
- Sound alerts for urgent items (STAT priority, etc.)
- Customizable notification preferences per user
- Push notifications for mobile PWA
