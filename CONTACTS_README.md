# Contacts Page

## Features

The contacts page (`/contacts`) provides a comprehensive interface for managing contacts in the CRM system.

### Functionality

- **Searchable Table**: Search contacts by name, email, phone, or associated account
- **Pagination**: Navigate through large datasets with pagination controls
- **CRUD Operations**: 
  - View all contacts in a responsive table
  - Add new contacts via modal form
  - Edit existing contacts via modal form
  - Delete contacts with confirmation
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Table refreshes after operations

### Table Columns

- **Name**: First and last name of the contact
- **Email**: Clickable email link (opens email client)
- **Phone**: Clickable phone number (opens phone dialer)
- **Account**: Associated company account name
- **Job Title**: Contact's job title
- **Status**: Active/Inactive status with color coding
- **Actions**: Edit and delete buttons

### Search Functionality

The search bar allows filtering contacts by:
- Contact name (first or last name)
- Email address
- Phone number
- Associated account name

### Form Features

The contact form modal includes:
- Required fields: First Name, Last Name
- Optional fields: Email, Phone, Job Title, Department
- Account association dropdown
- Address fields (Address, City, State, Country, Postal Code)
- Status selection (Active/Inactive)

### API Integration

The page uses the `contactsApi` from `@/lib/db/contacts` for:
- `getAll()` - Fetch all contacts with account associations
- `create()` - Create new contacts
- `update()` - Update existing contacts
- `delete()` - Delete contacts

### Navigation

The page is accessible via the main navigation bar at `/contacts`.

## Usage

1. Navigate to `/contacts`
2. Use the search bar to filter contacts
3. Click "Add Contact" to create a new contact
4. Click the edit button (pencil icon) to modify a contact
5. Click the delete button (trash icon) to remove a contact
6. Use pagination controls to navigate through results

## Technical Details

- Built with Next.js 15 and TypeScript
- Uses Supabase for data storage
- Styled with Tailwind CSS
- Responsive design with mobile support
- Real-time form validation
- Error handling for API operations
