# n8n-nodes-getsales

This is an n8n community node package for [GetSales](https://getsales.io/), a LinkedIn + email
outbound sales automation platform. It provides two nodes:

- **GetSales Trigger** — starts a workflow when selected GetSales webhook events occur. Webhooks are registered and removed automatically.
- **GetSales** — manage Contacts, Companies, LinkedIn messages, Emails, and Flows via the GetSales REST API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Nodes](#nodes)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Resources](#resources)
[Version history](#version-history)

## Installation

Not published to npm yet. Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation once it is; until then, clone this repo and use `npm run dev` (or `n8n-node dev --external-n8n`) to test against a local or self-hosted n8n instance.

## Nodes

### GetSales Trigger

A webhook-based trigger. Select one or more events; the workflow runs whenever a matching event
arrives, with the complete original GetSales payload as the output JSON (nothing reshaped or
stripped).

**Automatic webhook lifecycle** — no manual setup in GetSales needed:
- Activating the workflow creates one GetSales webhook per selected event (GetSales binds one event per webhook).
- Deactivating the workflow removes them again.
- Using "Listen for test event" registers/cleans up its own webhook against the test URL independently of any production registration.

Supported events:

| Event | `event_name` |
|---|---|
| Contact Exported | `contact_exported` |
| Contact Enriched | `contact_enriched` |
| Contact Replied via Email | `contact_replied_email` |
| Contact Replied via LinkedIn Message | `contact_replied_linkedin_message` |
| Contact Replied via LinkedIn InMail | `contact_replied_linkedin_inmail` |
| Account Exported | `account_exported` |
| Contact Accepted LinkedIn Connection Request | `contact_accepted_linkedin_connection_request` |
| Sender Profile Sent LinkedIn Connection Request | `sender_profile_sent_linkedin_connection_request` |
| Sender Profile Sent LinkedIn Message | `sender_profile_sent_linkedin_message` |
| Sender Profile Sent Email | `sender_profile_sent_email` |
| Sender Profile Sent LinkedIn InMail | `sender_profile_sent_linkedin_inmail` |
| Sender Profile Issue | `sender_profile_issue` |

All 12 were confirmed either from real GetSales test-webhook deliveries or the GetSales OpenAPI
webhook-event enum (see `../notes.md` at the project root for details and any later additions).

### GetSales

A standard Resource/Operation node calling the GetSales REST API directly (`https://amazing.getsales.io`).

| Resource | Operations |
|---|---|
| Contact | Search, Lookup, Get, Create or Update (Upsert), Update |
| Company | List, Lookup, Get, Create, Update |
| LinkedIn | List Messages, Send Message |
| Email | List, Get, Send |
| Flow | List, Get, Start, Stop, Add Contact |

List/search operations support **Return All** (paginates automatically, GetSales page size up to
100, or 500 for Emails) and a **Limit** when not returning everything.

## Credentials

### GetSales Trigger
None. The trigger only *receives* webhooks and calls the GetSales webhook-management API using
whatever credential you attach when webhook auto-registration needs it — see below. GetSales
documents no signature/HMAC scheme for verifying webhook authenticity, so none is implemented.

### GetSales (action node) and webhook auto-registration
Both require the **GetSales API** credential:
- **API Key** — create one in GetSales under **Workspace Settings → API Keys**.
- Sent as `Authorization: Bearer <API Key>`.
- Credential test calls `GET /id/api/users/current`.

## Compatibility

Built and tested against n8n's current programmatic/declarative node APIs (`n8n-workflow` v2.x,
scaffolded with `@n8n/node-cli`). No known version incompatibilities.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [GetSales](https://getsales.io/)
* [GetSales API documentation](https://help.getsales.io)

## Version history

- **0.2.0** — Added the GetSales action node (20 operations across Contact/Company/LinkedIn/Email/Flow) and the `GetSales API` credential. Upgraded GetSales Trigger to automatic webhook registration/cleanup and expanded to 12 confirmed events.
- **0.1.0** — Initial release: GetSales Trigger with 5 confirmed events, manual webhook setup.
