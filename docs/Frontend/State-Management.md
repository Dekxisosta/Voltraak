# Frontend — State Management

## Inventory Management System (IMS) — WalangBrownout Appliances

**Companion docs:** `Overview.md`, `Routing.md`, `../Backend/API.md`

---

## 1. Current State Architecture

State management uses React Context for global state and local state for component-specific data:

- **Authentication:** `AuthContext` with `useAuth` hook for login, session management, and role-based routing
- **Theming:** `ThemeContext` with `useTheme` hook for light/dark mode management
- **Notifications:** `useNotifications` hook for toast notifications and alerts
- **Server Data:** Fetched per-page via typed `api/*.js` modules with environment toggle support
- **Local Storage:** Minimal persistence for auth tokens and theme preferences only

## 2. AuthContext & Session Management

`shared/contexts/AuthContext.jsx` provides comprehensive authentication and session management:

### Core Features
- **Token Management:** JWT tokens with automatic refresh and expiry handling
- **Session Security:** Automatic expiry warnings (5 min), silent token refresh (45 min intervals)
- **Role-Based Navigation:** Automatic redirects based on user roles after login
- **Session Recovery:** Validates existing tokens on app startup
- **Error Handling:** Graceful session expiry with user notifications

### useAuth Hook
```javascript
const { 
  user,                    // Current user object with role, permissions
  loading,                 // Authentication state loading
  login,                   // login(email, password)
  logout,                  // Clear session and redirect
  extendSession,          // Manual session extension
  sessionExpiryTime      // Current session expiry timestamp
} = useAuth()
```

### Authentication Flow
1. **App Startup:** Check for existing token, validate with backend
2. **Login:** Store token, fetch user data, setup session timers
3. **Session Management:** Automatic refresh, expiry warnings, timeout handling
4. **Logout:** Clear all auth data, redirect to login

## 3. ThemeContext & User Preferences

`shared/contexts/ThemeContext.jsx` manages application theming:

### Features
- **Theme Options:** Light, Dark, System (follows OS preference)
- **System Integration:** Automatically detects and follows system theme changes
- **Persistence:** Stores theme preference (not user data) in localStorage
- **CSS Integration:** Uses `data-theme` attribute for styling

### useTheme Hook
```javascript
const { 
  theme,           // Current resolved theme ('light' | 'dark')
  preference,      // User preference ('light' | 'dark' | 'system')
  setTheme,        // Set theme preference
  toggleTheme,     // Quick dark/light toggle
  isDark          // Boolean for dark mode state
} = useTheme()
```

## 4. Notification System

`shared/hooks/useNotifications.jsx` provides toast notification management:

### Features
- **Multiple Types:** Success, error, warning, info notifications
- **Auto-dismiss:** Configurable duration or persistent notifications
- **Action Support:** Notifications can include action buttons
- **Queue Management:** Multiple notifications with proper ordering

### Usage
```javascript
const { showNotification } = useNotifications()

showNotification({
  type: 'success',
  title: 'Stock Updated',
  message: 'Product inventory has been updated successfully',
  duration: 3000
})
```

## 5. Server State Pattern

### Environment-Aware Data Fetching
The application supports both mock data and real API integration:

```javascript
// Environment determines data source
VITE_DATA_SOURCE=mocks  // Use local mock data
VITE_DATA_SOURCE=api    // Use Laravel backend API
```

### Per-Page Data Management
Each page manages its own server state:
- API calls via typed `shared/api/*.js` modules
- Local `useState`/`useEffect` for data management  
- Individual loading/error state handling
- No shared query cache yet (planned for future if needed)

### API Client Integration
`shared/api/client.js` provides:
- Automatic authentication header injection
- Error handling with user-friendly messages
- Request/response interceptors
- Support for both mock and real API endpoints

## 6. Data Flow Architecture

```
User Action → Page Component → API Module → API Client → Backend/Mock
                ↓
         Local State Update ← Response Processing ← Network Response
                ↓
         UI Update (re-render)
```

## 7. Security Considerations

### Token Management
- JWT tokens stored in localStorage (web security standards)
- Automatic token refresh to prevent session gaps
- Secure token clearing on logout and expiry
- No sensitive user data persisted beyond authentication needs

### Role-Based State
- User role drives UI rendering and available actions
- Server-side validation remains source of truth for permissions
- Client-side role checks for UX optimization only

## 8. Future State Management

### When to Add Global State Management
If the following patterns emerge, consider adding React Query or similar:
- Multiple pages requesting same data simultaneously
- Stale data issues across components
- Complex data synchronization needs
- Real-time data update requirements

### Migration Path
Current architecture supports gradual migration:
1. Continue per-page state for simple data
2. Add React Query for shared/complex data
3. Maintain existing auth and theme contexts
4. Keep localStorage minimal and security-focused
