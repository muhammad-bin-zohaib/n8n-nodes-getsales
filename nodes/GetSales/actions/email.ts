import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { getsalesApiRequest } from '../../../utils/getsalesApi';
import { getsalesFetchAllPages } from '../../../utils/pagination';

export const emailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['email'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List emails', description: 'List inbox and outbox emails with filters and pagination' },
			{ name: 'Get', value: 'get', action: 'Get an email', description: 'Retrieve full email details by UUID' },
			{ name: 'Send', value: 'send', action: 'Send an email', description: 'Send an email from a connected mailbox' },
		],
		default: 'list',
	},
];

const emailStatusList = ['need_sync', 'idle', 'waiting', 'sent', 'sync', 'cancelled', 'missing_body', 'error', 'bounced'];

export const emailFields: INodeProperties[] = [
	// ---------- List ----------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: { show: { resource: ['email'], operation: ['list'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
		displayOptions: { show: { resource: ['email'], operation: ['list'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['email'], operation: ['list'] } },
		options: [
			{ displayName: 'Contact UUID', name: 'lead_uuid', type: 'string', default: '' },
			{ displayName: 'Direction', name: 'type', type: 'options', options: [{ name: 'Inbox', value: 'inbox' }, { name: 'Outbox', value: 'outbox' }], default: 'inbox' },
			{ displayName: 'Flow UUID', name: 'flow_uuid', type: 'string', default: '' },
			{ displayName: 'From Email', name: 'from_email', type: 'string', default: '' },
			{ displayName: 'Mailbox UUID', name: 'mailbox_uuid', type: 'string', default: '' },
			{ displayName: 'Sent At Range', name: 'sent_at', type: 'string', default: '', description: 'A single date "2026-03-15" or a range "2026-03-01,2026-03-31"' },
			{ displayName: 'Status', name: 'status', type: 'options', options: emailStatusList.map((s) => ({ name: s, value: s })), default: 'sent' },
			{ displayName: 'To Email', name: 'to_email', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['email'], operation: ['list'] } },
		options: [
			{ displayName: 'Order Field', name: 'order_field', type: 'options', options: [
				{ name: 'Sent At', value: 'sent_at' }, { name: 'Created At', value: 'created_at' }, { name: 'Updated At', value: 'updated_at' },
			], default: 'sent_at' },
			{ displayName: 'Order Type', name: 'order_type', type: 'options', options: [{ name: 'Ascending', value: 'asc' }, { name: 'Descending', value: 'desc' }], default: 'desc' },
		],
	},

	// ---------- Get ----------
	{
		displayName: 'Email UUID',
		name: 'emailUuid',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['email'], operation: ['get'] } },
	},

	// ---------- Send ----------
	{
		displayName: 'Mailbox UUID',
		name: 'mailboxUuid',
		type: 'string',
		required: true,
		default: '',
		description: 'Mailbox to send from (see GET /emails/api/mailboxes)',
		displayOptions: { show: { resource: ['email'], operation: ['send'] } },
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'fixedCollection',
		placeholder: 'Add Recipient',
		default: {},
		required: true,
		typeOptions: { multipleValues: true },
		displayOptions: { show: { resource: ['email'], operation: ['send'] } },
		options: [
			{
				name: 'recipient',
				displayName: 'Recipient',
				values: [
					{ displayName: 'Email', name: 'to_email', type: 'string', required: true, default: '', placeholder: 'name@example.com' },
					{ displayName: 'Name', name: 'to_name', type: 'string', default: '' },
				],
			},
		],
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['email'], operation: ['send'] } },
	},
	{
		displayName: 'Body (HTML)',
		name: 'body',
		type: 'string',
		required: true,
		typeOptions: { rows: 6 },
		default: '',
		displayOptions: { show: { resource: ['email'], operation: ['send'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['email'], operation: ['send'] } },
		options: [
			{
				displayName: 'BCC (JSON)',
				name: 'bcc',
				type: 'json',
				default: '',
				description: 'BCC recipients. The API documents this as a flexible array — provide raw JSON, e.g. ["bcc@example.com"].',
			},
			{
				displayName: 'CC (JSON)',
				name: 'cc',
				type: 'json',
				default: '',
				description: 'CC recipients. The API documents this as a flexible array — provide raw JSON, e.g. ["cc@example.com"].',
			},
			{ displayName: 'Contact UUID', name: 'lead_uuid', type: 'string', default: '', description: 'Associate this email with a contact' },
			{ displayName: 'In Reply to Email UUID', name: 'in_reply_to_email_uuid', type: 'string', default: '' },
			{ displayName: 'Template UUID', name: 'template_uuid', type: 'string', default: '' },
			{ displayName: 'Thread UUID', name: 'thread_uuid', type: 'string', default: '' },
		],
	},
];

export async function executeEmail(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'list') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;

		const items = await getsalesFetchAllPages(
			async (pageLimit, offset) => {
				const qs: IDataObject = { limit: pageLimit, offset, ...options };
				for (const [key, value] of Object.entries(filters)) qs[`filter[${key}]`] = value;
				const response = await getsalesApiRequest.call(this, 'GET', '/emails/api/emails', undefined, qs, i);
				const pagination = (response.pagination as IDataObject) ?? {};
				return { items: (response.data as IDataObject[]) ?? [], hasMore: Boolean(pagination.has_more) };
			},
			returnAll,
			limit,
		);
		return items;
	}

	if (operation === 'get') {
		const uuid = this.getNodeParameter('emailUuid', i) as string;
		return getsalesApiRequest.call(this, 'GET', `/emails/api/emails/${uuid}`, undefined, undefined, i);
	}

	// send
	const mailboxUuid = this.getNodeParameter('mailboxUuid', i) as string;
	const to = this.getNodeParameter('to', i, {}) as { recipient?: Array<{ to_email: string; to_name?: string }> };
	const subject = this.getNodeParameter('subject', i) as string;
	const body = this.getNodeParameter('body', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

	if (typeof additionalFields.cc === 'string' && additionalFields.cc) {
		additionalFields.cc = JSON.parse(additionalFields.cc as string);
	}
	if (typeof additionalFields.bcc === 'string' && additionalFields.bcc) {
		additionalFields.bcc = JSON.parse(additionalFields.bcc as string);
	}

	const requestBody: IDataObject = {
		mailbox_uuid: mailboxUuid,
		to: to.recipient ?? [],
		subject,
		body,
		...additionalFields,
	};
	return getsalesApiRequest.call(this, 'POST', '/emails/api/emails/send-email', requestBody, undefined, i);
}
