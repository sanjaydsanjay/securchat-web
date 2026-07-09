# PostgreSQL RLS Testing with pgTAP

This directory contains the automated Row Level Security (RLS) test suite for the SecureChat AI database.
The tests are written using **pgTAP**, a robust testing framework native to PostgreSQL.

## File Structure
- `database/rls.test.sql`: The primary test suite containing all policy checks for Users, Chats, Messages, Storage, and Audit Logs.

## Prerequisites
You must have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and Docker running on your machine.

## How to Run Tests Locally

1. **Start the local Supabase stack** (if not already running):
   ```bash
   supabase start
   ```

2. **Execute the pgTAP tests:**
   ```bash
   supabase test db
   ```
   *Note: This command spins up a temporary database clone, applies all migrations, executes the `.test.sql` files inside the `supabase/tests/database/` folder in alphabetical order, evaluates the assertions, and safely tears down the environment.*

## Writing New Tests
- All test files must end with the `.test.sql` extension.
- Always wrap your test files in a `BEGIN;` and `ROLLBACK;` transaction.
- Define the number of tests at the top of the file using `SELECT plan(X);`.
- Finish the file with `SELECT * FROM finish();`.

### Helper Functions
The suite includes two reusable helpers to simulate authentication contexts:
- `SELECT tests_set_auth_user('auth_uuid');` (Mocks the `request.jwt.claims` for a specific user)
- `SELECT tests_clear_auth();` (Resets the context to anonymous / service role)
