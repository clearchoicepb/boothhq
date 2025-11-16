-- SEED SYSTEM SECTIONS FOR TEMPLATE BUILDER
-- These sections are available to all tenants and serve as building blocks for agreements

-- REQUIRED SECTIONS
INSERT INTO template_sections (tenant_id, name, category, content, description, is_system, is_required, merge_fields, sort_order) VALUES

-- 1. Agreement Header
(NULL, 'Agreement Header', 'header',
'**{{agreement_type}} Agreement**

This agreement is entered into on {{current_date}} between:',
'Standard agreement title and opening',
true, true,
ARRAY['{{agreement_type}}', '{{current_date}}'], 1),

-- 2. Provider Information
(NULL, 'Provider Information', 'party-info',
'**Provider Information**

Clear Choice Photo Company
29299 Clemens Rd 1E
Cleveland, OH, 44113',
'Your company information',
true, true,
ARRAY['{{company_name}}', '{{company_address}}', '{{company_city}}', '{{company_state}}', '{{company_zip}}'], 2),

-- 3. Client Information - Corporate
(NULL, 'Client Information - Corporate', 'party-info',
'**Client Information**

{{company_name}}
Attn: {{contact_name}}
{{address}}
{{city}}, {{state}} {{zip}}',
'Client details for corporate events',
true, false,
ARRAY['{{company_name}}', '{{contact_name}}', '{{address}}', '{{city}}', '{{state}}', '{{zip}}'], 3),

-- 4. Client Information - Private
(NULL, 'Client Information - Private', 'party-info',
'**Client Information**

Name: {{contact_name}}
Address: {{address}}
Contact Number: {{phone}}',
'Client details for private events',
true, false,
ARRAY['{{contact_name}}', '{{address}}', '{{phone}}'], 4),

-- EVENT DETAILS
-- 5. Event Information - Corporate
(NULL, 'Event Information - Corporate', 'event-details',
'**Event Information**

**Event Setup Date**: {{setup_date}} | **Event Setup Time**: {{setup_time}}
**Rental Date(s):** {{event_start_date}} & {{event_end_date}}
**Rental Time(s):** {{event_start_time}} - {{event_end_time}}

**Event Location:**
{{location_name}}
{{location_address}}
{{location_city}}, {{location_state}}, {{location_zip}}',
'Detailed event information for corporate clients',
true, false,
ARRAY['{{setup_date}}', '{{setup_time}}', '{{event_start_date}}', '{{event_end_date}}', '{{event_start_time}}', '{{event_end_time}}', '{{location_name}}', '{{location_address}}', '{{location_city}}', '{{location_state}}', '{{location_zip}}'], 5),

-- 6. Event Information - Private
(NULL, 'Event Information - Private', 'event-details',
'**Event Information**

**Total Fee:** ${{total_amount}}

**Event is taking place at:**
{{location_name}} - {{location_address}}

**Rental Dates:** {{event_date}}
**Setup Times:** {{setup_time}}
**Rental Times:** {{event_start_time}} - {{event_end_time}}',
'Simplified event information for private events',
true, false,
ARRAY['{{total_amount}}', '{{location_name}}', '{{location_address}}', '{{event_date}}', '{{setup_time}}', '{{event_start_time}}', '{{event_end_time}}'], 6),

-- 7. Package & Pricing Table
(NULL, 'Package & Pricing Table', 'event-details',
'**Package and Pricing Details**

| Item/Service | Details | Price |
|--------------|---------|-------|
| {{package_name}} | {{package_description}} | ${{package_price}} |
| {{line_item_1}} | {{description_1}} | ${{price_1}} |
| {{line_item_2}} | {{description_2}} | ${{price_2}} |
| ***Discount*** | | ***-${{discount_amount}}*** |
| ***Total Price*** | | ***${{total_price}}*** |',
'Itemized pricing table',
true, false,
ARRAY['{{package_name}}', '{{package_description}}', '{{package_price}}', '{{line_item_1}}', '{{line_item_2}}', '{{discount_amount}}', '{{total_price}}'], 7),

-- PAYMENT SECTIONS
-- 8. Payment Terms - Corporate
(NULL, 'Payment Terms - Corporate', 'payment',
'**PAYMENT TERMS**

* Deposit: ${{deposit_amount}} due upon initial approval
* Remaining Balance: Due by {{balance_due_date}}',
'Simple payment terms for corporate clients',
true, false,
ARRAY['{{deposit_amount}}', '{{balance_due_date}}'], 8),

-- 9. Payment Terms - Private
(NULL, 'Payment Terms - Private', 'payment',
'**PAYMENT TERMS**

A non-refundable retainer in the minimum amount of ${{deposit_amount}} is due upon signing of this contract. Event Date will not be reserved until this deposit is received. The remaining amount is due 30 days prior to your event. If payment is not received prior to this date, client forfeits deposit and this agreement could be voided at the providers discretion.

We accept checks, cash, Visa, MasterCard, American Express and Discover. Client agrees that in addition to any and all other legal rights and remedies Provider may have, Client will pay a $35.00 fee for any and all returned checks.

Clients who choose to pay in full at the time of booking receive a 10% discount on their total package price. This discount is applied in exchange for full upfront payment and is non-refundable. This discount is listed within the package description above but is only valid IF full payment is processed at the time the reservation is placed.

If the rental time period exceeds the service period agreed to in this agreement, the overage in rental time will be billed to the operator at the hourly rate of $295 per hour, billed in half-hour increments. Payment for any overage in time must be paid before additional hours are provided.',
'Detailed payment terms for private events',
true, false,
ARRAY['{{deposit_amount}}'], 9),

-- OPERATIONS SECTIONS
-- 10. Access, Space & Power - Corporate
(NULL, 'Access, Space & Power - Corporate', 'operations',
'**ACCESS, SPACE, & POWER FOR PHOTO BOOTH**

Client is responsible for securing and covering all required credentials and associated costs necessary to execute the event. This includes, but is not limited to: parking permits, venue or event access passes, union labor fees mandated by the venue, and any charges related to power, internet, or other venue-specific requirements.

**Recommended space per setup:**
- Photo Mosaic Wall – 12ft x 12ft
- Photo Spot Pro – 4ft x 4ft (no backdrop) or 8ft x 8ft (with backdrop)
- Social Photographer & Virtual Booth – N/A
- Power – One 110V, 5 amp, 3-prong outlet per setup

If the event is outdoors protective cover is required if there is any risk of inclement weather. Client is responsible for any and all passes and must also arrange for any venue access passes, parking permits, and credentials needed by CCPB staff.',
'Detailed access and power requirements for corporate events',
true, false,
ARRAY[], 10),

-- 11. Access, Space & Power - Private
(NULL, 'Access, Space & Power - Private', 'operations',
'**ACCESS, SPACE, & POWER FOR PHOTO BOOTH**

Client will arrange for an appropriate space for the Photo Station at event''s venue. All Outdoor Events require a tent or similar cover to protect against inclement weather. Client is responsible for providing extension cords if need be for booth locations outside 25 ft of electrical outlet, including outdoor events. Standard outlet required. (110V, 5 amps, 3 prong outlet). Client will provide all necessary passes for provider and their employee''s to setup, load In, remain on site and park their vehicles for this event. Any expenses are the sole responsibility of the CLIENT and must be paid for in advance of event.',
'Simplified access and power requirements for private events',
true, false,
ARRAY[], 11),

-- 12. Internet Access - Corporate
(NULL, 'Internet Access - Corporate', 'operations',
'**INTERNET ACCESS**

CCPB uses T-Mobile 5G internet devices to operate equipment. However, CCPB recommends that client provide a local high-speed internet connection via a private wifi network or hardline when possible to ensure optimal performance. If service is interrupted, photos will be queued and delivered later when the internet becomes available.',
'Internet policy for corporate events',
true, false,
ARRAY[], 12),

-- 13. Internet Access - Private
(NULL, 'Internet Access - Private', 'operations',
'**INTERNET ACCESS**

Instant SMS and email sharing are included at no additional cost with every package. However, these features **require an active internet connection** to send photos to guests. While connectivity issues are rare, we cannot guarantee signal strength at every venue, as it depends on the service area of our wireless provider.

If the internet connection is unstable, guests can still enter their phone number or email to send their photos, but delivery may be delayed. In such cases, images will be sent automatically once our internet service is restored—typically within **15 to 20 minutes** after our attendant leaves your location.',
'Internet policy for private events with delivery details',
true, false,
ARRAY[], 13),

-- 14. Prints Per Person Policy
(NULL, 'Prints Per Person Policy', 'operations',
'**PRINTS PER PERSON POLICY**

Each guest in a photo is entitled to one printout per session. For example, if a photo includes five guests, up to five printouts will be available immediately. If a guest forgets to print their photo during their session, they may request a reprint from the Photo Booth Operator at any time during the event. Additional copies beyond the number of guests in a photo are not included.

Printer malfunctions are rare, but in the event of any onsite printing issues, the Provider will print one copy of all affected images and mail them at no cost to the client, allowing for distribution to the impacted guest(s).',
'Printing policy for events with physical prints',
true, false,
ARRAY[], 14),

-- LEGAL SECTIONS
-- 15. Cancellations - Corporate
(NULL, 'Cancellations - Corporate', 'legal',
'**CANCELLATIONS**

Client understands and agrees that, due to the nature of the rental industry, date changes and cancellations are not allowed. Upon executing this Agreement, all fees become due and payable by the dates listed and are nonrefundable.',
'Cancellation policy for corporate events',
true, false,
ARRAY[], 15),

-- 16. Date Changes & Cancellations - Private
(NULL, 'Date Changes & Cancellations - Private', 'legal',
'**DATE CHANGES & CANCELLATIONS**

Client understands that due to the nature of the rental industry date changes and cancellations are not allowed. Upon executing this agreement all amounts will become due as written in the terms listed and are non refundable.',
'Cancellation policy for private events',
true, false,
ARRAY[], 16),

-- 17. Indemnity/Hold Harmless
(NULL, 'Indemnity/Hold Harmless', 'legal',
'**INDEMNITY/HOLD HARMLESS**

TO THE FULLEST EXTENT PERMITTED BY LAW, CLIENT AGREES TO INDEMNIFY, DEFEND AND HOLD CCPB AND ANY OF ITS RESPECTIVE OFFICERS, AGENTS, SERVANTS, OR EMPLOYEES, AFFILIATES, PARENTS, SUBSIDIARIES AND ANY OTHER PERSONS TO WHICH CCPB MAY BE RESPONSIBLE, HARMLESS FROM ANY AND ALL LIABILITY, CLAIMS, DAMAGES, COSTS, INCLUDING LEGAL FEES, AND EXPENSES ARISING FROM CLIENT''S USE, MISUSE AND/OR POSSESSION OF CCPB EQUIPMENT, BUSINESS INTERRUPTION RELATED TO THE MALFUNCTIONING OF CCPB EQUIPMENT AND/OR ANY ACTION OR CLAIM THAT ARISES OUT OF OR IS IN CONNECTION WITH THE MISAPPROPRIATION, INFRINGEMENT, AND/OR INVALID LICENSING OF A COPYRIGHTED WORK BY CLIENT OR A GUEST OF CLIENT''S.',
'Legal protection clause for indemnification',
true, false,
ARRAY[], 17),

-- 18. Force Majeure
(NULL, 'Force Majeure', 'legal',
'**FORCE MAJEURE**

If for any reason of a Force Majeure Event, it is impossible or illegal for either party to perform its obligations hereunder, such non-performance shall be excused and the parties shall negotiate in good faith to reschedule the Services. In the event that substitute assets cannot be reasonably rescheduled after such good-faith negotiation during the Term, Client or Provider may cancel this Agreement. In the event of such Force Majeure Event cancellation, Provider shall not be required to return any monies already paid by Client and any remaining monies that are owed would become due immediately.

"Force Majeure Event" means any event or circumstance beyond the reasonable control of either party, which delays or causes the relocation or cancellation of the Event and/or prevents either party from performing any material obligation arising under this Agreement, including, without limitation, acts of God, flooding, lightning, landslide, earthquake, fire, drought, explosion, epidemic, quarantine, storm, hurricane, tornado, volcano, other natural disaster or unusual or extreme adverse weather-related events, security risk, war, riot or similar civil disturbance, acts of the public enemy (including acts or threats of terrorism), sabotage, blockade, insurrection, revolution, strikes, work stoppage or labor disputes or material change, amendment or enactment in applicable law, rule or regulation, which, in each case, would make it impossible, inadvisable or illegal for either party to perform the Services (or any portion thereof) or to perform any obligation hereunder.',
'Force majeure clause for unforeseen circumstances',
true, false,
ARRAY[], 18),

-- 19. Miscellaneous Terms - Corporate
(NULL, 'Miscellaneous Terms - Corporate', 'legal',
'**MISCELLANEOUS TERMS**

This Agreement represents the entire agreement between Client and CCPB with respect to the subject matter herein. There are no oral or other representations or agreements not included herein and this Agreement shall not be modified except in writing, signed by both parties. If any provision of this Agreement shall be unlawful, void, or for any reason unenforceable under contract law, then that provision or portion thereof shall be deemed separate from the rest of this contract and shall not affect the validity and enforceability of any remaining provisions or portions thereof. In the event of a conflict between CCPB and Client, Client agrees to resolve said conflict via arbitration. In the event CCPB is unable to supply a working photo booth for at least 95% of the Rental times specified in this Agreement, Client shall be refunded a prorated amount based on the amount of time the photo booth was not operational. If the printer fails to print photos on site, Client agrees that CCPB will be allowed to provide Client with a web site that Client''s guests can access and order prints, free of charge (including shipping), as well as the ability to download the digital files for their own use.',
'Standard legal terms for corporate agreements',
true, false,
ARRAY[], 19),

-- 20. Miscellaneous Terms - Private
(NULL, 'Miscellaneous Terms - Private', 'legal',
'**MISCELLANEOUS TERMS**

If any provision of these terms shall be unlawful, void, or for any reason unenforceable under Contract Law, then that provision, or portion thereof, shall be deemed separate from the rest of this contract and shall not affect the validity and enforceability of any remaining provisions, or portions thereof. This is the entire agreement between Provider and Client relating to the subject matter herein and shall not be modified except in writing, signed by both parties. In the event of a conflict between parties, Client agrees to solve any disagreements via arbitration. In the event Provider is unable to supply a working photo booth for at least 95% of the Service Period, Client shall be refunded a prorated amount based on the amount of service received. If the printer fails to print out photos onsite the Provider will be allowed to give a web site to the client where there guests can log onto and order prints free of charge with free shipping as well as the ability to download the digital files for their own use.',
'Standard legal terms for private agreements',
true, false,
ARRAY[], 20),

-- SIGNATURE SECTIONS
-- 21. Authority to Sign - Corporate
(NULL, 'Authority to Sign - Corporate', 'signature',
'**AUTHORITY TO SIGN**

By signing below, I/Client represent and warrant that I am of legal age, that I have the authority and power to sign this Event Agreement on behalf of Client, and that I agree and acknowledge that I have read, understand, accept full responsibility for and are bound by the terms and conditions contained in this Agreement.

**Client Signature: _________________________________ Date: ______________**',
'Formal signature block with authority clause',
true, true,
ARRAY[], 21),

-- 22. Signature Block - Simple
(NULL, 'Signature Block - Simple', 'signature',
'**Client Signature: _________________________________ Date: ______________**',
'Simple signature line',
true, true,
ARRAY[], 22);
