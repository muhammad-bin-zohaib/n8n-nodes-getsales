# Changelog

## 0.2.0

- Added `GetSales` action node: Contact (Search/Lookup/Get/Upsert/Update), Company
  (List/Lookup/Get/Create/Update), LinkedIn (List Messages/Send Message), Email (List/Get/Send),
  Flow (List/Get/Start/Stop/Add Contact) — 20 operations total.
- Added `GetSales API` credential (API key, Bearer auth).
- `GetSales Trigger`: upgraded from manual webhook setup to automatic registration/cleanup via
  the GetSales webhooks REST API, tracked per workflow activation mode (test vs. production).
- `GetSales Trigger`: expanded from 5 to 12 confirmed events (added `account_exported`,
  `contact_accepted_linkedin_connection_request`, `sender_profile_sent_linkedin_connection_request`,
  `sender_profile_sent_linkedin_message`, `sender_profile_sent_email`,
  `sender_profile_sent_linkedin_inmail`, `sender_profile_issue`).

## 0.1.0

- Initial release: `GetSales Trigger` node with 5 confirmed webhook events (`contact_exported`,
  `contact_enriched`, `contact_replied_email`, `contact_replied_linkedin_message`,
  `contact_replied_linkedin_inmail`). No credentials required — manual webhook setup in GetSales.
