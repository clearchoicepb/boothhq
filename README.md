# Supabase CRM App

A full-stack CRM application built with Next.js, TypeScript, and Supabase.

<!-- Trigger deployment: 2025-01-21 -->

## Features

- **Accounts Management**: Create, read, update, and delete company accounts
- **Contacts Management**: Manage contacts with account associations
- **Opportunities Tracking**: Track sales opportunities with stages and probabilities
- **Events Management**: Schedule and manage events/meetings
- **Invoice Management**: Create and manage invoices with line items
- **Payment Tracking**: Track payments against invoices
- **Audit Logging**: Automatic audit trail for all data changes
- **TypeScript Support**: Full type safety with generated types

## Database Schema

The application includes the following tables:

- `accounts` - Company accounts
- `contacts` - Contact persons with account associations
- `opportunities` - Sales opportunities with stages
- `events` - Scheduled events and meetings
- `invoices` - Invoice management
- `invoice_line_items` - Individual line items for invoices
- `payments` - Payment tracking
- `audit_log` - Automatic audit trail

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Copy the environment variables:

```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_supabase_database_url
```

### 4. Database Setup

1. Install Supabase CLI (optional but recommended):
   ```bash
   npm install -g supabase
   ```

2. Run the database migrations:
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or manually run the SQL in supabase/migrations/001_initial_schema.sql
   # in your Supabase SQL editor
   ```

### 5. Run the Application

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   └── ui/             # Reusable UI components
├── lib/                 # Utility libraries
│   ├── db/             # Database API functions
│   └── supabase-client.ts  # Supabase client configuration
└── types/              # TypeScript type definitions
    └── database.ts     # Generated database types

supabase/
└── migrations/         # Database migration files
```

## API Functions

The application includes typed API functions for each table:

- `accountsApi` - Account management
- `contactsApi` - Contact management  
- `opportunitiesApi` - Opportunity management
- `eventsApi` - Event management
- `invoicesApi` - Invoice management
- `paymentsApi` - Payment management

## TypeScript Types

All database tables have corresponding TypeScript types:

- `Account`, `AccountInsert`, `AccountUpdate`
- `Contact`, `ContactInsert`, `ContactUpdate`
- `Opportunity`, `OpportunityInsert`, `OpportunityUpdate`
- `Event`, `EventInsert`, `EventUpdate`
- `Invoice`, `InvoiceInsert`, `InvoiceUpdate`
- `Payment`, `PaymentInsert`, `PaymentUpdate`

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC
