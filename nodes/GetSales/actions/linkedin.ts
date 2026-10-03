import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { getsalesApiRequest } from '../../../utils/getsalesApi';
import { getsalesFetchAllPages } from '../../../utils/pagination';

export const linkedinOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['linkedin'] } },
		options: [
			// The "action" field feeds an automated sentence-case check that mangles
			// brand names with an internal capital (e.g. "LinkedIn" → "linked in").
			// The Resource dropdown already reads "LinkedIn", so omit it here too.
			{ name: 'List Messages', value: 'listMessages', action: 'List messages', description: 'List inbox and outbox LinkedIn messages' },
			{ name: 'Send Message', value: 'sendMessage', action: 'Send a message', description: 'Send a LinkedIn message, connection note, or InMail' },
		],
		default: 'listMessages',
	},
];

export const linkedinFields: INodeProperties[] = [
	// ---------- List Messages ----------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: { show: { resource: ['linkedin'], operation: ['listMessages'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		displayOptions: { show: { resource: ['linkedin'], operation: ['listMessages'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['linkedin'], operation: ['listMessages'] } },
		options: [
			{ displayName: 'Automation Mode', name: 'automation', type: 'options', options: [
				{ name: 'AMO Synced', value: 'amo_synced' }, { name: 'Auto', value: 'auto' }, { name: 'Connect', value: 'connect' }, { name: 'Manual', value: 'manual' }, { name: 'Synced', value: 'synced' },
			], default: 'auto' },
			{ displayName: 'Contact UUID', name: 'lead_uuid', type: 'string', default: '' },
			{ displayName: 'Direction', name: 'type', type: 'options', options: [{ name: 'Inbox (Received)', value: 'inbox' }, { name: 'Outbox (Sent)', value: 'outbox' }], default: 'inbox' },
			{ displayName: 'Message Type', name: 'linkedin_type', type: 'options', options: [
				{ name: 'Connection Note', value: 'connection_note' }, { name: 'Message', value: 'message' }, { name: 'InMail', value: 'inmail' },
			], default: 'message' },
			{ displayName: 'Sender Profile UUID', name: 'sender_profile_uuid', type: 'string', default: '' },
			{ displayName: 'Status', name: 'status', type: 'options', options: [
				{ name: 'New', value: 'new' }, { name: 'In Progress', value: 'in_progress' }, { name: 'Done', value: 'done' }, { name: 'Failed', value: 'failed' },
			], default: 'done' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['linkedin'], operation: ['listMessages'] } },
		options: [
			{ displayName: 'Order Field', name: 'order_field', type: 'options', options: [
				{ name: 'UUID', value: 'uuid' }, { name: 'Sent At', value: 'sent_at' }, { name: 'Created At', value: 'created_at' }, { name: 'Updated At', value: 'updated_at' },
			], default: 'sent_at' },
			{ displayName: 'Order Type', name: 'order_type', type: 'options', options: [{ name: 'Ascending', value: 'asc' }, { name: 'Descending', value: 'desc' }], default: 'desc' },
		],
	},

	// ---------- Send Message ----------
	{
		displayName: 'Sender Profile UUID',
		name: 'senderProfileUuid',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['linkedin'], operation: ['sendMessage'] } },
	},
	{
		displayName: 'Contact UUID',
		name: 'leadUuid',
		type: 'string',
		required: true,
		default: '',
		description: 'The contact must be connected, or connection requests must be enabled',
		displayOptions: { show: { resource: ['linkedin'], operation: ['sendMessage'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['linkedin'], operation: ['sendMessage'] } },
		options: [
			{ displayName: 'Text', name: 'text', type: 'string', typeOptions: { rows: 4 }, default: '', description: 'Message body. Max 8000 characters. Can be omitted if using a Template UUID.' },
			{ displayName: 'Subject', name: 'subject', type: 'string', default: '', description: 'For InMail only. Max 511 characters.' },
			{ displayName: 'Template UUID', name: 'template_uuid', type: 'string', default: '' },
			{ displayName: 'Messenger Type', name: 'linkedin_messenger_type', type: 'options', options: [
				{ name: 'Basic (Standard LinkedIn)', value: 'basic' }, { name: 'Sales Navigator', value: 'sn' },
			], default: 'basic' },
		],
	},
];

export async function executeLinkedIn(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'listMessages') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;

		const items = await getsalesFetchAllPages(
			async (pageLimit, offset) => {
				const qs: IDataObject = { limit: pageLimit, offset, ...options };
				for (const [key, value] of Object.entries(filters)) qs[`filter[${key}]`] = value;
				const response = await getsalesApiRequest.call(this, 'GET', '/flows/api/linkedin-messages', undefined, qs, i);
				return { items: (response.data as IDataObject[]) ?? [], hasMore: Boolean(response.has_more) };
			},
			returnAll,
			limit,
		);
		return items;
	}

	// sendMessage
	const senderProfileUuid = this.getNodeParameter('senderProfileUuid', i) as string;
	const leadUuid = this.getNodeParameter('leadUuid', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
	const body: IDataObject = {
		sender_profile_uuid: senderProfileUuid,
		lead_uuid: leadUuid,
		...additionalFields,
	};
	return getsalesApiRequest.call(this, 'POST', '/flows/api/linkedin-messages', body, undefined, i);
}
