# Opportunities Page

## Features

The opportunities page (`/opportunities`) provides a comprehensive interface for managing sales opportunities in the CRM system.

### Functionality

- **Dashboard Statistics**: Overview of key metrics including pipeline value, active opportunities, won opportunities, and average probability
- **Searchable Table**: Search opportunities by name, account, contact, or stage
- **Pagination**: Navigate through large datasets with pagination controls
- **CRUD Operations**: 
  - View all opportunities in a responsive table
  - Add new opportunities via modal form
  - Edit existing opportunities via modal form
  - Delete opportunities with confirmation
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Table refreshes after operations

### Table Columns

- **Opportunity Name**: Name and description of the opportunity
- **Contact**: Associated contact person (first and last name)
- **Account**: Associated company account name
- **Stage**: Current stage with color-coded badges
- **Estimated Value**: Dollar amount with currency formatting
- **Probability**: Percentage chance of winning the opportunity
- **Expected Close**: Expected close date with calendar icon
- **Created**: Date when the opportunity was created
- **Actions**: Edit and delete buttons

### Statistics Dashboard

The page includes a statistics section showing:
- **Total Pipeline Value**: Sum of all opportunity amounts
- **Active Opportunities**: Count of non-closed opportunities
- **Won Opportunities**: Count of closed-won opportunities
- **Average Probability**: Average probability across all opportunities

### Search Functionality

The search bar allows filtering opportunities by:
- Opportunity name
- Account name
- Contact name (first or last name)
- Stage (prospecting, qualification, proposal, etc.)

### Form Features

The opportunity form modal includes:
- **Required fields**: Opportunity Name, Stage
- **Optional fields**: Description, Amount, Probability, Expected Close Date
- **Associations**: Account and Contact dropdowns
- **Stage Management**: 6 predefined stages with conditional actual close date
- **Validation**: Form validation and error handling

### Stage Management

The system supports 6 opportunity stages:
1. **Prospecting** - Initial contact and qualification
2. **Qualification** - Determining if opportunity is viable
3. **Proposal** - Creating and presenting proposal
4. **Negotiation** - Finalizing terms and conditions
5. **Closed Won** - Successfully closed opportunity
6. **Closed Lost** - Unsuccessfully closed opportunity

### API Integration

The page uses the `opportunitiesApi` from `@/lib/db/opportunities` for:
- `getAll()` - Fetch all opportunities with account and contact associations
- `create()` - Create new opportunities
- `update()` - Update existing opportunities
- `delete()` - Delete opportunities

### Navigation

The page is accessible via the main navigation bar at `/opportunities`.

## Usage

1. Navigate to `/opportunities`
2. View the statistics dashboard for quick insights
3. Use the search bar to filter opportunities
4. Click "Add Opportunity" to create a new opportunity
5. Click the edit button (pencil icon) to modify an opportunity
6. Click the delete button (trash icon) to remove an opportunity
7. Use pagination controls to navigate through results

## Technical Details

- Built with Next.js 15 and TypeScript
- Uses Supabase for data storage
- Styled with Tailwind CSS
- Responsive design with mobile support
- Real-time form validation
- Error handling for API operations
- Currency formatting for amounts
- Date formatting for timestamps
- Color-coded stage indicators

## Data Relationships

Opportunities are linked to:
- **Accounts**: The company the opportunity is for
- **Contacts**: The primary contact person
- **Events**: Related meetings and activities
- **Invoices**: Generated invoices for won opportunities

## Business Logic

- **Pipeline Value**: Calculated as sum of all opportunity amounts
- **Active Opportunities**: Excludes closed won/lost opportunities
- **Probability**: Used for weighted pipeline calculations
- **Stage Progression**: Opportunities typically move through stages sequentially
- **Close Dates**: Expected close date for planning, actual close date for closed opportunities
