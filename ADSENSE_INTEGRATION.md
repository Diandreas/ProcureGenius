# Google AdSense Integration Guide

This guide explains how to use Google AdSense in ProcureGenius to display ads for FREE plan users.

## Configuration

**AdSense Client ID**: `ca-pub-9356267035201048`

The AdSense script is automatically loaded when the application starts (in `App.jsx`).

## Components

### 1. AdSenseScript
Loads the Google AdSense script once globally. Already integrated in `App.jsx`.

### 2. AdBanner
Basic ad banner component. Use this when you want full control.

```jsx
import { AdBanner } from '../components/AdSense';

<AdBanner
  format="rectangle"  // or 'leaderboard', 'banner', 'responsive', etc.
  slot="1234567890"   // Your ad slot ID from AdSense dashboard
/>
```

### 3. ConditionalAdBanner ⭐ (RECOMMENDED)
Smart component that only shows ads for FREE plan users and includes an upgrade prompt.

```jsx
import { ConditionalAdBanner } from '../components/AdSense';

<ConditionalAdBanner
  format="rectangle"
  slot="1234567890"
/>
```

## Ad Formats

| Format | Size | Best For |
|--------|------|----------|
| `leaderboard` | 728x90 | Top of page, below header |
| `banner` | 468x60 | Inline content |
| `rectangle` | 300x250 | Sidebar, between content |
| `large-rectangle` | 336x280 | Sidebar |
| `skyscraper` | 120x600 | Fixed sidebar |
| `wide-skyscraper` | 160x600 | Fixed sidebar |
| `responsive` | Auto | Mobile-friendly, adapts to container |

## Usage Examples

### Example 1: Dashboard with Ads

```jsx
// In CustomizableDashboard.jsx
import { ConditionalAdBanner } from '../components/AdSense';

function CustomizableDashboard() {
  return (
    <Container>
      {/* Ad at the top */}
      <ConditionalAdBanner format="leaderboard" />

      {/* Dashboard content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* Main content */}
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Sidebar */}
          <ConditionalAdBanner format="rectangle" />
        </Grid>
      </Grid>
    </Container>
  );
}
```

### Example 2: Invoice List with Ads

```jsx
// In Invoices.jsx
import { ConditionalAdBanner } from '../components/AdSense';

function Invoices() {
  return (
    <Box>
      <Typography variant="h4">Factures</Typography>

      {/* Ad before the list */}
      <ConditionalAdBanner format="banner" />

      {/* Invoice list */}
      <DataGrid ... />

      {/* Ad after the list */}
      <ConditionalAdBanner format="rectangle" />
    </Box>
  );
}
```

### Example 3: Responsive Ad for Mobile

```jsx
// Responsive ad that adapts to screen size
<ConditionalAdBanner format="responsive" />
```

### Example 4: Multiple Ads on Same Page

```jsx
// Make sure each ad has a unique slot ID
<ConditionalAdBanner format="leaderboard" slot="1234567890" />
<ConditionalAdBanner format="rectangle" slot="0987654321" />
```

## Getting Ad Slot IDs

1. Go to [Google AdSense Dashboard](https://www.google.com/adsense)
2. Click "Ads" > "By ad unit"
3. Click "Display ads"
4. Create a new ad unit for each format you want to use
5. Copy the `data-ad-slot` value from the generated code
6. Use it as the `slot` prop

Example:
```html
<!-- From AdSense: -->
<ins class="adsbygoogle"
     data-ad-slot="1234567890"></ins>
```

```jsx
// In React:
<ConditionalAdBanner slot="1234567890" />
```

## Recommended Ad Placements

### Dashboard
- **Top**: Leaderboard (728x90) below header
- **Sidebar**: Rectangle (300x250)
- **Bottom**: Banner (468x60)

### List Pages (Invoices, Products, Clients, etc.)
- **Above list**: Banner (468x60)
- **Sidebar**: Rectangle (300x250) or Large Rectangle (336x280)
- **Between items**: Banner (468x60) every 10-15 items

### Detail Pages (Invoice Detail, Product Detail, etc.)
- **Sidebar**: Rectangle (300x250)
- **Bottom**: Banner (468x60)

### Mobile
- **Use responsive format** for all ads
- Place ads between content sections
- Don't overload - max 2-3 ads per page

## Best Practices

### DO ✅
- Use `ConditionalAdBanner` to automatically hide ads for paid users
- Place ads in natural breaks in content
- Use responsive format for mobile
- Test ad placement on different screen sizes
- Limit to 2-3 ads per page

### DON'T ❌
- Don't show ads for Standard/Premium users (already handled by `ConditionalAdBanner`)
- Don't place ads in the middle of forms or important actions
- Don't use more than 3 ads per page (Google policy)
- Don't place ads too close together
- Don't block important content with ads

## Hook: useSubscription

Use this hook to check subscription status anywhere:

```jsx
import useSubscription from '../hooks/useSubscription';

function MyComponent() {
  const { shouldShowAds, isFreePlan, hasFeature } = useSubscription();

  if (shouldShowAds()) {
    return <ConditionalAdBanner format="rectangle" />;
  }

  return null;
}
```

## Checking Ad Display Manually

```jsx
import useSubscription from '../hooks/useSubscription';

function MyComponent() {
  const { shouldShowAds, getPlanName } = useSubscription();

  return (
    <div>
      {shouldShowAds() && (
        <Alert severity="info">
          Plan {getPlanName()} - Publicités actives
          <AdBanner format="rectangle" />
        </Alert>
      )}
    </div>
  );
}
```

## Integration Checklist

- [x] AdSense script loaded in App.jsx
- [x] AdSense client ID configured: ca-pub-9356267035201048
- [ ] Create ad units in AdSense dashboard for each format
- [ ] Get slot IDs for each ad unit
- [ ] Add ads to Dashboard
- [ ] Add ads to Invoice list
- [ ] Add ads to Product list
- [ ] Add ads to Client list
- [ ] Test on mobile devices
- [ ] Verify ads hide for paid users

## Testing

1. **Test with FREE plan user:**
   - Create a test account with FREE plan
   - Ads should be visible
   - Upgrade prompt should appear

2. **Test with paid plan user:**
   - Subscribe to Standard or Premium
   - Ads should be hidden
   - No upgrade prompt

3. **Test ad formats:**
   - Try different formats on different pages
   - Check responsiveness on mobile

## Troubleshooting

### Ads not showing?
1. Check browser console for errors
2. Verify AdSense client ID is correct
3. Make sure ad blocker is disabled
4. Wait 10-20 seconds for ads to load
5. Check if you're on FREE plan (use `shouldShowAds()`)

### Blank ad spaces?
- New ad units may take 24-48 hours to activate
- Use slot="auto" for testing initially
- Check AdSense dashboard for approval status

### Too many ads?
- Google allows max 3 ads per page
- Remove some ads if you have more than 3

## Support

- [Google AdSense Help](https://support.google.com/adsense)
- [AdSense Policies](https://support.google.com/adsense/answer/48182)
