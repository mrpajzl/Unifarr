# 👥 User Permissions & Access Control - Implementation Design

**Status:** Ready to implement (RBAC middleware already in place)  
**Dependencies:** Phase 2 (Auth Middleware) ✅  
**Breaking Changes:** No (additive only)

---

## 🎯 Goals

1. **Role-Based Access Control (RBAC)** - 3 roles: admin, moderator, user
2. **Per-User Settings** - language preferences, download limits, etc.
3. **User Management UI** - admin can approve/reject users, change roles
4. **Granular Permissions** (future-proof) - extensible permission system

---

## 📊 Current State (Already Implemented ✅)

### **Backend (Phase 2):**
- ✅ Auth middleware (`requireAuth`, `requireRole`, `requirePermission`)
- ✅ User schema with `role` column
- ✅ Protected routes (all `/api/*` except `/auth`, `/discover`)
- ✅ Admin-only routes (`/api/settings/*`, `/api/search/templates/*`)
- ✅ User.preferredLanguage column (for future multi-lang)

### **Database Schema:**
```prisma
model User {
  id                Int      @id @default(autoincrement())
  username          String   @unique
  password          String
  role              String   @default("user")
  approved          Boolean  @default(false)
  preferredLanguage String   @default("en")
  createdAt         DateTime @default(now())
}
```

---

## 🏗️ What Needs to Be Built

### **1. User Management API (Backend)**

#### **GET /api/users** (admin only)
List all users with filtering:
```typescript
GET /api/users?role=user&approved=true&limit=20&offset=0

Response:
{
  users: [
    {
      id: 1,
      username: "john",
      role: "user",
      approved: true,
      createdAt: "2026-02-19T...",
      _stats: {
        mediaRequests: 5,
        processedRequests: 0
      }
    }
  ],
  total: 42
}
```

#### **PATCH /api/users/:id** (admin only)
Update user role, approval status:
```typescript
PATCH /api/users/5
{
  role: "moderator",
  approved: true
}

Response:
{
  id: 5,
  username: "alice",
  role: "moderator",
  approved: true
}
```

#### **DELETE /api/users/:id** (admin only)
Delete user (soft delete recommended):
```typescript
DELETE /api/users/5

Response:
{
  success: true,
  message: "User deleted"
}
```

#### **GET /api/users/pending** (admin only)
List users awaiting approval:
```typescript
GET /api/users/pending

Response:
{
  pendingUsers: [
    {
      id: 10,
      username: "newuser",
      createdAt: "2026-02-19T..."
    }
  ],
  count: 3
}
```

---

### **2. User Settings API (Per-User)**

#### **GET /api/users/me** (authenticated)
Get current user profile:
```typescript
GET /api/users/me

Response:
{
  id: 5,
  username: "alice",
  role: "moderator",
  approved: true,
  preferredLanguage: "cs",
  settings: {
    theme: "dark",
    notifications: true,
    autoApproveDownloads: false
  }
}
```

#### **PATCH /api/users/me** (authenticated)
Update own profile:
```typescript
PATCH /api/users/me
{
  preferredLanguage: "de",
  settings: {
    theme: "light",
    notifications: false
  }
}

Response:
{
  success: true,
  user: { ...updated user }
}
```

#### **PATCH /api/users/me/password** (authenticated)
Change own password:
```typescript
PATCH /api/users/me/password
{
  currentPassword: "old123",
  newPassword: "new456"
}

Response:
{
  success: true,
  message: "Password updated"
}
```

---

### **3. Frontend - User Management Page**

**Route:** `/settings/users` (admin only)

**Features:**
- ✅ List all users (table with pagination)
- ✅ Filter by role, approval status
- ✅ Quick actions: Approve, Reject, Change Role, Delete
- ✅ Pending users badge in sidebar
- ✅ User stats (requests count, last login)

**UI Components:**
```vue
<!-- pages/settings/users.vue -->
<template>
  <div>
    <h1>User Management</h1>
    
    <!-- Pending Users Alert -->
    <div v-if="pendingCount > 0" class="alert alert-warning">
      {{ pendingCount }} users awaiting approval
    </div>
    
    <!-- Filters -->
    <div class="filters">
      <select v-model="roleFilter">
        <option value="">All Roles</option>
        <option value="admin">Admin</option>
        <option value="moderator">Moderator</option>
        <option value="user">User</option>
      </select>
      
      <select v-model="approvalFilter">
        <option value="">All</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
      </select>
    </div>
    
    <!-- Users Table -->
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Role</th>
          <th>Status</th>
          <th>Requests</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.username }}</td>
          <td>
            <select 
              :value="user.role" 
              @change="changeRole(user.id, $event.target.value)"
              :disabled="user.id === currentUser.id"
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </td>
          <td>
            <span v-if="user.approved" class="badge badge-success">
              Approved
            </span>
            <span v-else class="badge badge-warning">
              Pending
            </span>
          </td>
          <td>{{ user._stats.mediaRequests }}</td>
          <td>{{ formatDate(user.createdAt) }}</td>
          <td>
            <button 
              v-if="!user.approved" 
              @click="approveUser(user.id)"
              class="btn btn-sm btn-success"
            >
              Approve
            </button>
            <button 
              @click="deleteUser(user.id)"
              :disabled="user.id === currentUser.id"
              class="btn btn-sm btn-danger"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

---

### **4. Frontend - User Profile Settings**

**Route:** `/settings/profile` (authenticated)

**Features:**
- ✅ Change language preference
- ✅ Change password
- ✅ Theme selection (dark/light)
- ✅ Notification preferences

**UI:**
```vue
<!-- pages/settings/profile.vue -->
<template>
  <div>
    <h1>Profile Settings</h1>
    
    <!-- Language -->
    <div class="form-group">
      <label>Preferred Language</label>
      <select v-model="settings.preferredLanguage">
        <option value="en">English</option>
        <option value="cs">Čeština</option>
        <option value="de">Deutsch</option>
        <option value="fr">Français</option>
        <option value="es">Español</option>
      </select>
    </div>
    
    <!-- Theme -->
    <div class="form-group">
      <label>Theme</label>
      <select v-model="settings.theme">
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="auto">Auto (System)</option>
      </select>
    </div>
    
    <!-- Password Change -->
    <div class="form-group">
      <h3>Change Password</h3>
      <input 
        type="password" 
        v-model="passwordForm.current"
        placeholder="Current Password"
      />
      <input 
        type="password" 
        v-model="passwordForm.new"
        placeholder="New Password"
      />
      <button @click="changePassword">Update Password</button>
    </div>
    
    <!-- Save -->
    <button @click="saveSettings">Save Settings</button>
  </div>
</template>
```

---

### **5. Permission System (Future-Proof)**

**Current (Role-Based):**
```typescript
// Middleware checks role
requireRole('admin');
```

**Future (Permission-Based):**
```typescript
// Middleware checks granular permission
requirePermission('media.delete');
```

**Permission Table (Future Migration):**
```prisma
model Permission {
  id     Int    @id @default(autoincrement())
  name   String @unique // e.g., "media.delete"
  label  String // e.g., "Delete Media"
  
  rolePermissions RolePermission[]
  userPermissions UserPermission[]
}

model RolePermission {
  roleId       String
  permissionId Int
  granted      Boolean @default(true)
  
  permission Permission @relation(fields: [permissionId], references: [id])
  
  @@id([roleId, permissionId])
}

model UserPermission {
  userId       Int
  permissionId Int
  granted      Boolean @default(true)
  
  user       User       @relation(fields: [userId], references: [id])
  permission Permission @relation(fields: [permissionId], references: [id])
  
  @@id([userId, permissionId])
}
```

---

## 📋 Implementation Checklist

### **Backend:**
- [ ] Add user management endpoints (`/api/users`, `/api/users/:id`)
- [ ] Add user profile endpoints (`/api/users/me`)
- [ ] Add pending users endpoint (`/api/users/pending`)
- [ ] Add password change endpoint (`/api/users/me/password`)
- [ ] Add user stats aggregation (request count, etc.)
- [ ] Add soft delete for users (optional)

### **Frontend:**
- [ ] Create `/settings/users` page (admin only)
- [ ] Create `/settings/profile` page (all authenticated users)
- [ ] Add pending users badge to sidebar
- [ ] Add language selector component
- [ ] Add theme switcher
- [ ] Add password change form
- [ ] Add user table with filters & actions

### **Database:**
- [ ] Add `User.deletedAt` column (soft delete - optional)
- [ ] Add `User.settings` JSONB column (for theme, notifications, etc.)
- [ ] Migration script for existing users

---

## 🚀 Implementation Order

1. **Backend User Management API** (2h)
   - Add endpoints to `routes/users.ts`
   - Protect with `requireRole('admin')`
   - Add stats aggregation

2. **Frontend User Management Page** (2h)
   - Create `/settings/users.vue`
   - Implement table, filters, actions
   - Add pending users badge

3. **User Profile Settings** (1h)
   - Create `/settings/profile.vue`
   - Language selector
   - Password change form

4. **Theme System** (optional, 1h)
   - Add theme switcher
   - Store preference in DB
   - Apply theme on load

---

## 🔐 Security Notes

1. ✅ Users cannot change their own role (middleware prevents self-modification)
2. ✅ Password hashing with bcrypt (already implemented)
3. ✅ JWT token expiration (implement refresh tokens later)
4. ✅ Rate limiting on login endpoint (implement with hono/rate-limit)
5. ✅ Audit log for role changes (optional - track who changed what)

---

## 🎨 UI Mockup

### Admin Users Page:
```
┌─────────────────────────────────────────────────────────┐
│ User Management                                         │
├─────────────────────────────────────────────────────────┤
│ ⚠️  3 users awaiting approval                           │
├─────────────────────────────────────────────────────────┤
│ Filters: [All Roles ▼] [All Status ▼]  [Search...]     │
├─────────────────────────────────────────────────────────┤
│ Username  │ Role      │ Status   │ Requests │ Actions  │
├───────────┼───────────┼──────────┼──────────┼──────────┤
│ admin     │ [Admin ▼] │ ✅ Active │   25     │ [Delete] │
│ alice     │ [Mod ▼]   │ ✅ Active │   10     │ [Delete] │
│ newuser   │ [User ▼]  │ ⏳ Pending│    0     │ [Approve]│
└─────────────────────────────────────────────────────────┘
```

---

**Total Estimated Time:** 5-6 hours  
**Dependencies:** Phase 2 (Auth) ✅  
**Breaking Changes:** None  
**Can Deploy:** Incrementally (API first, then UI)

Ready to implement when you say go! 🚀
