# @trtc/uikit-live-state

React Native state management module for TUIRoom Live, providing native API integration through HybridBridge.

## Installation

```bash
npm install @trtc/uikit-live-state
# or
yarn add @trtc/uikit-live-state
```

## Prerequisites

This package requires:
- React Native >= 0.70.0
- React >= 18.0.0
- HybridBridge native module configured in your React Native project

## Usage

### Basic Import

```typescript
import { login, getLiveList, createLiveRoom } from '@trtc/uikit-live-state';
```

### Login State

#### Login

```typescript
import { login } from '@trtc/uikit-live-state';

const result = await login({
  userID: 'user123',
  sdkAppID: 123456,
  userSig: 'your-user-sig',
});

if (result.success) {
  console.log('Login successful:', result.data);
} else {
  console.error('Login failed:', result.error);
}
```

#### Logout

```typescript
import { logout } from '@trtc/uikit-live-state';

const result = await logout();
if (result.success) {
  console.log('Logout successful');
}
```

#### Get Current User

```typescript
import { getCurrentUser } from '@trtc/uikit-live-state';

const result = await getCurrentUser();
if (result.success) {
  console.log('Current user:', result.data);
}
```

#### Check Login Status

```typescript
import { checkLoginStatus } from '@trtc/uikit-live-state';

const result = await checkLoginStatus();
if (result.success && result.data?.isLoggedIn) {
  console.log('User is logged in');
}
```

### LiveList State

#### Get Live List

```typescript
import { getLiveList } from '@trtc/uikit-live-state';

const result = await getLiveList({
  page: 1,
  pageSize: 20,
  keyword: 'search term',
});

if (result.success) {
  console.log('Live rooms:', result.data?.list);
  console.log('Total:', result.data?.total);
}
```

#### Create Live Room

```typescript
import { createLiveRoom } from '@trtc/uikit-live-state';

const result = await createLiveRoom({
  roomName: 'My Live Room',
  roomType: 'live',
  coverURL: 'https://example.com/cover.jpg',
});

if (result.success) {
  console.log('Room created:', result.data?.roomID);
}
```

#### Join Live Room

```typescript
import { joinLiveRoom } from '@trtc/uikit-live-state';

const result = await joinLiveRoom({
  roomID: 'room123',
  role: 'audience', // or 'anchor'
});

if (result.success) {
  console.log('Joined room:', result.data);
}
```

#### Leave Live Room

```typescript
import { leaveLiveRoom } from '@trtc/uikit-live-state';

const result = await leaveLiveRoom({ roomID: 'room123' });
if (result.success) {
  console.log('Left room successfully');
}
```

#### Get Room Info

```typescript
import { getLiveRoomInfo } from '@trtc/uikit-live-state';

const result = await getLiveRoomInfo({ roomID: 'room123' });
if (result.success) {
  console.log('Room info:', result.data);
}
```

### Advanced Options

All API methods support optional configuration:

```typescript
const result = await login(
  {
    userID: 'user123',
    sdkAppID: 123456,
    userSig: 'your-user-sig',
  },
  {
    timeout: 30000,    // Request timeout in ms (default: 30000)
    retry: 3,          // Number of retries (default: 0)
    retryDelay: 1000,  // Delay between retries in ms (default: 1000)
  }
);
```

## API Reference

### Types

#### StateResult<T>

```typescript
interface StateResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}
```

#### StateOptions

```typescript
interface StateOptions {
  timeout?: number;    // Request timeout in ms
  retry?: number;      // Number of retries
  retryDelay?: number;  // Delay between retries in ms
}
```

### Login Types

```typescript
interface LoginParams {
  userID: string;
  sdkAppID: number;
  userSig: string;
}

interface LoginData {
  userID: string;
  sdkAppID?: number;
  [key: string]: unknown;
}
```

### LiveList Types

```typescript
interface LiveRoomInfo {
  roomID: string;
  roomName?: string;
  ownerID?: string;
  ownerName?: string;
  coverURL?: string;
  audienceCount?: number;
  status?: 'live' | 'ended' | 'preparing';
  startTime?: number;
  [key: string]: unknown;
}

interface GetLiveListParams {
  page?: number;
  pageSize?: number;
  roomType?: string;
  keyword?: string;
  [key: string]: unknown;
}

interface LiveListData {
  list: LiveRoomInfo[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}
```

## Error Handling

All methods return a `StateResult` object with a `success` flag. Always check the `success` property before accessing `data`:

```typescript
const result = await login(params);

if (result.success) {
  // Handle success
  console.log(result.data);
} else {
  // Handle error
  console.error(result.error);
  console.error(result.code);
}
```

## License

MIT

