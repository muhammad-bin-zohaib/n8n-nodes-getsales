# n8n-nodes-getsales

This is an n8n community node package for [GetSales](https://getsales.io/), a LinkedIn + email
outbound sales automation platform. It currently provides one node:

**GetSales Trigger** — starts a workflow when selected GetSales webhook events occur.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Nodes](#nodes)
[Credentials](#credentials)
[Webhook setup in GetSales](#webhook-setup-in-getsales)
[Compatibility](#compatibility)
[Resources](#resources)
[Version history](#version-history)

## Installation

Not published yet — local development/testing only (see repository root for dev instructions).
Once published, follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Nodes

### GetSales Trigger

A webhook-based trigger node. Select one or more events; the workflow runs whenever a matching
event arrives, with the complete original GetSales payload as the output JSON.

Supported events (V1):

| Event | `event_name` |
|---|---|
| Contact Exported | `contact_exported` |
| Contact Enriched | `contact_enriched` |
| Contact Replied via Email | `contact_replied_email` |
| Contact Replied via LinkedIn Message | `contact_replied_linkedin_message` |
| Contact Replied via LinkedIn InMail | `contact_replied_linkedin_inmail` |

These were confirmed from real GetSales test-webhook deliveries. GetSales' webhook settings UI
documents a different (larger, partially mismatched) list — see `../notes.md` at the project
root for the full discrepancy and why this V1 only covers these 5.

## Credentials

None. This node only *receives* webhooks from GetSales — it never calls the GetSales API, so
there's nothing to authenticate. GetSales' public API doesn't document a signature/HMAC scheme
for verifying webhook authenticity either, so none is implemented.

## Webhook setup in GetSales

GetSales' public API doesn't document endpoints for creating or deleting webhooks
programmatically, so this must be done manually, once per event:

1. Add the **GetSales Trigger** node to a workflow, select the event(s) you want.
2. Activate the workflow (or use "Listen for test event" while building it) to get the Webhook URL n8n generates.
3. In GetSales, go to **Settings → Webhooks**, create a new webhook pointing at that URL.
4. GetSales appears to bind one event per webhook entry — repeat step 3 for each additional event you selected in the node.

## Compatibility

Built and tested against n8n's current programmatic node API (`n8n-workflow` v2.x, scaffolded
with `@n8n/node-cli`). No known version incompatibilities yet — this is the first local test pass.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [GetSales](https://getsales.io/)

## Version history

- **0.1.0** — Initial release: GetSales Trigger with 5 confirmed events.
