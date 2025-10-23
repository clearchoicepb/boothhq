# TODO: Form Standardization

Two ContactForm implementations exist:
1. src/components/contact-form.tsx - Full-featured, many-to-many support
2. src/components/forms/ContactForm.tsx - Generic EntityForm wrapper

Contacts page uses #2 (EntityForm wrapper).
Account/Contact forms use #1 (full-featured).

NEXT STEPS:
- Evaluate if we need both
- Consider migrating all to one approach
- Or ensure duplicate email check works in both

This is LOW PRIORITY - both work correctly.
