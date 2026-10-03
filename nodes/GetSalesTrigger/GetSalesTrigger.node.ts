import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { getsalesApiRequest } from '../../utils/getsalesApi';

const EVENT_OPTIONS = [
	{ name: 'Contact Exported', value: 'contact_exported', description: 'A contact was exported from GetSales CRM' },
	{ name: 'Contact Enriched', value: 'contact_enriched', description: 'GetSales finished enriching a contact' },
	{ name: 'Contact Replied via Email', value: 'contact_replied_email', description: 'A contact replied to an email' },
	{ name: 'Contact Replied via LinkedIn Message', value: 'contact_replied_linkedin_message', description: 'A contact replied to a LinkedIn message' },
	{ name: 'Contact Replied via LinkedIn InMail', value: 'contact_replied_linkedin_inmail', description: 'A contact replied to a LinkedIn InMail' },
	{ name: 'Account Exported', value: 'account_exported', description: 'A company/account was exported from GetSales CRM' },
	{ name: 'Contact Accepted LinkedIn Connection Request', value: 'contact_accepted_linkedin_connection_request', description: 'A contact accepted a LinkedIn connection request' },
	{ name: 'Sender Profile Sent LinkedIn Connection Request', value: 'sender_profile_sent_linkedin_connection_request', description: 'A sender profile sent a LinkedIn connection request' },
	{ name: 'Sender Profile Sent LinkedIn Message', value: 'sender_profile_sent_linkedin_message', description: 'A sender profile sent a LinkedIn message' },
	{ name: 'Sender Profile Sent Email', value: 'sender_profile_sent_email', description: 'A sender profile sent an email' },
	{ name: 'Sender Profile Sent LinkedIn InMail', value: 'sender_profile_sent_linkedin_inmail', description: 'A sender profile sent a LinkedIn InMail' },
	{ name: 'Sender Profile Issue', value: 'sender_profile_issue', description: 'A problem occurred with a sender profile (e.g. LinkedIn logged out)' },
];

interface GetSalesWebhookStaticData {
	webhooksByEvent?: { [event: string]: string };
}

/**
 * n8n calls checkExists/create/delete separately for "Listen for test event"
 * (activation mode 'manual', targeting the test URL) and for a real workflow
 * activation (every other mode, targeting the production URL). Namespacing
 * the stored webhook-UUID map by mode means testing a trigger that belongs to
 * an already-active workflow registers its own webhook against the test URL
 * instead of being short-circuited by the production registration that
 * already matches the same selected events.
 */
function getStaticData(this: IHookFunctions): GetSalesWebhookStaticData {
	const staticData = this.getWorkflowStaticData('node') as {
		test?: GetSalesWebhookStaticData;
		production?: GetSalesWebhookStaticData;
	};
	const namespace = this.getActivationMode() === 'manual' ? 'test' : 'production';
	if (!staticData[namespace]) staticData[namespace] = {};
	return staticData[namespace] as GetSalesWebhookStaticData;
}

export class GetSalesTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GetSales Trigger',
		name: 'getSalesTrigger',
		icon: 'file:getsales.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when selected GetSales webhook events occur',
		defaults: {
			name: 'GetSales Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'getSalesApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'This node automatically creates the required GetSales webhook(s) when you activate the workflow, with one webhook created for each selected event.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName:
					'When you deactivate the workflow, the node automatically removes them, so no manual webhook setup is required in GetSales.',
				name: 'noticeCleanup',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: EVENT_OPTIONS,
				default: [],
				required: true,
				description: 'The GetSales events that should trigger this workflow',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const selectedEvents = this.getNodeParameter('events', []) as string[];
				const stored = getStaticData.call(this).webhooksByEvent ?? {};
				const storedEvents = Object.keys(stored);
				if (storedEvents.length !== selectedEvents.length) return false;
				return selectedEvents.every((event) => Boolean(stored[event]));
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const selectedEvents = this.getNodeParameter('events', []) as string[];
				const data = getStaticData.call(this);
				if (!data.webhooksByEvent) data.webhooksByEvent = {};
				const stored = data.webhooksByEvent;

				// Remove GetSales webhooks for events that are no longer selected.
				for (const event of Object.keys(stored)) {
					if (selectedEvents.includes(event)) continue;
					try {
						await getsalesApiRequest.call(this, 'DELETE', `/integrations/api/webhooks/${stored[event]}`);
					} catch (error) {
						// Best-effort cleanup (e.g. already removed on the GetSales side) —
						// don't block activation over a stale webhook we can't reach.
						this.logger.warn(
							`GetSales Trigger: failed to delete stale webhook for event "${event}": ${(error as Error).message}`,
						);
					}
					delete stored[event];
				}

				// Create GetSales webhooks for newly selected events only.
				const workflowName = this.getWorkflow().name || 'Untitled workflow';
				for (const event of selectedEvents) {
					if (stored[event]) continue;
					const response = await getsalesApiRequest.call(this, 'POST', '/integrations/api/webhooks', {
						name: `n8n: ${workflowName} (${event})`,
						event,
						request_method: 'POST',
						target_url: webhookUrl,
					});
					const created = response.data as IDataObject;
					stored[event] = created.uuid as string;
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const data = getStaticData.call(this);
				const stored = data.webhooksByEvent ?? {};
				for (const event of Object.keys(stored)) {
					try {
						await getsalesApiRequest.call(this, 'DELETE', `/integrations/api/webhooks/${stored[event]}`);
					} catch (error) {
						// Already gone or unreachable — clear our record regardless so we
						// don't try to delete it again next time.
						this.logger.warn(
							`GetSales Trigger: failed to delete webhook for event "${event}": ${(error as Error).message}`,
						);
					}
					delete stored[event];
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const selectedEvents = this.getNodeParameter('events', []) as string[];
		const eventName = typeof bodyData.event_name === 'string' ? bodyData.event_name : undefined;

		if (!eventName || !selectedEvents.includes(eventName)) {
			// Acknowledge the delivery (responseMode 'onReceived' sends HTTP 200
			// regardless) without executing the workflow, so GetSales never
			// retries deliveries for events the user didn't select.
			return {};
		}

		return {
			workflowData: [[{ json: bodyData }]],
		};
	}
}
