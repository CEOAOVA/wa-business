# Database Migration Troubleshooting Guide

## Issue Description
The backend is failing to start with TypeScript errors because the database schema hasn't been migrated to include the new Contact management fields and models.

## Error Summary
The code is trying to use:
- New Contact fields: `displayName`, `phone`, `email`, `notes`, `isFavorite`, `lastSeenAt`
- New models: `Tag`, `ContactTag`
- New relationships: `tags`, `conversations`

But these don't exist in the current database because the migration hasn't been run.

## Solutions (try in order)

### Solution 1: Run the Migration Scripts
1. **Option A - Batch Script (Windows)**:
   ```cmd
   cd backend
   run-migration.bat
   ```

2. **Option B - PowerShell Script**:
   ```powershell
   cd backend
   .\run-migration.ps1
   ```

### Solution 2: Manual Commands
If the scripts don't work, run these commands manually in the backend directory:

1. **Generate Prisma Client**:
   ```cmd
   npx prisma generate
   ```

2. **Create Migration**:
   ```cmd
   npx prisma migrate dev --name add-contact-management
   ```

3. **Check Status**:
   ```cmd
   npx prisma migrate status
   ```

### Solution 3: Reset Database (if above fails)
⚠️ **Warning**: This will delete all existing data!

1. **Reset database**:
   ```cmd
   npx prisma migrate reset
   ```

2. **Run migrations**:
   ```cmd
   npx prisma migrate dev
   ```

### Solution 4: Manual Database Reset
1. **Delete database file**:
   ```cmd
   del prisma\whatsapp.db
   ```

2. **Delete migrations**:
   ```cmd
   rmdir /s prisma\migrations
   ```

3. **Create new migration**:
   ```cmd
   npx prisma migrate dev --name init
   ```

## Verification Steps
After running the migration, verify it worked:

1. **Check generated files**:
   - `src/generated/prisma/` should exist
   - Should contain updated type definitions

2. **Check database**:
   ```cmd
   npx prisma studio
   ```
   Should show the new fields and tables.

3. **Restart backend**:
   ```cmd
   npm run dev
   ```
   Should start without TypeScript errors.

## Common Issues

### Issue: "command not found"
- Make sure you're in the `backend` directory
- Make sure Node.js and npm are installed

### Issue: "Permission denied"
- Run PowerShell as Administrator
- Or try: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Issue: Migration fails
- Check if the database file is locked (close any database browsers)
- Try Solution 3 or 4 above

## Expected Results
After successful migration:
- No TypeScript errors in the backend
- Backend starts successfully with `npm run dev`
- All Contact management features will work
- Database contains all new fields and relationships

## Contact Management Features Available After Migration
- Extended contact information (display name, phone, email, notes)
- Contact tagging system with colors
- Favorite contacts
- Advanced search and filtering
- Contact management API endpoints
- Frontend contact management page 