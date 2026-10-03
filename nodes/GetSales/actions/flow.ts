import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { getsalesApiRequest } from '../../../utils/getsalesApi';
import { getsalesFetchAllPages } from '../../../utils/pagination';

export const flowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['flow'] } },
		options: [
			{ name: 'Add Contact', value: 'addContact', action: 'Add a contact to a flow', description: 'Enroll an existing contact into a flow' },
			{ name: 'Get', value: 'get', action: 'Get a flow', description: 'Retrieve a flow by UUID' },
			{ name: 'List', value: 'list', action: 'List flows', description: 'List automation flows' },
			{ name: 'Start', value: 'start', action: 'Start a flow', description: 'Activate a flow (draft/off → on)' },
			{ name: 'Stop', value: 'stop', action: 'Stop a flow', description: 'Pause a running flow (on → off)' },
		],
		default: 'list',
	},
];

export const flowFields: INodeProperties[] = [
	// ---------- List ----------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: { show: { resource: ['flow'], operation: ['list'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		displayOptions: { show: { resource: ['flow'], operation: ['list'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['flow'], operation: ['list'] } },
		options: [
			{ displayName: 'Search Text', name: 'q', type: 'string', default: '', description: 'Search flows by name' },
			{ displayName: 'Status', name: 'status', type: 'options', options: [
				{ name: 'Draft', value: 'draft' }, { name: 'On', value: 'on' }, { name: 'Off', value: 'off' }, { name: 'Archived', value: 'archived' },
			], default: 'on' },
			{ displayName: 'Flow Workspace UUID', name: 'flow_workspace_uuid', type: 'string', default: '', description: 'Filter by automation folder UUID' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['flow'], operation: ['list'] } },
		options: [
			{ displayName: 'Order Field', name: 'order_field', type: 'string', default: 'created_at' },
			{ displayName: 'Order Type', name: 'order_type', type: 'options', options: [{ name: 'Ascending', value: 'asc' }, { name: 'Descending', value: 'desc' }], default: 'desc' },
		],
	},

	// ---------- Get / Start / Stop ----------
	{
		displayName: 'Flow UUID',
		name: 'flowUuid',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['flow'], operation: ['get', 'start', 'stop', 'addContact'] } },
	},

	// ---------- Add Contact ----------
	{
		displayName: 'Contact UUID',
		name: 'leadUuid',
		type: 'string',
		required: true,
		default: '',
		description: 'The flow must be active, and its contact source must have an enabled sender profile',
		displayOptions: { show: { resource: ['flow'], operation: ['addContact'] } },
	},
	{
		displayName: 'Contact Source ID',
		name: 'contactSourceId',
		type: 'string',
		default: '1',
		description: 'Contact source within the flow version. Defaults to "1" (the first contact source).',
		displayOptions: { show: { resource: ['flow'], operation: ['addContact'] } },
	},
];

export async function executeFlow(
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
				const response = await getsalesApiRequest.call(this, 'GET', '/flows/api/flows', undefined, qs, i);
				return { items: (response.data as IDataObject[]) ?? [], hasMore: Boolean(response.has_more) };
			},
			returnAll,
			limit,
		);
		return items;
	}

	if (operation === 'get') {
		const uuid = this.getNodeParameter('flowUuid', i) as string;
		return getsalesApiRequest.call(this, 'GET', `/flows/api/flows/${uuid}`, undefined, undefined, i);
	}

	if (operation === 'start') {
		const uuid = this.getNodeParameter('flowUuid', i) as string;
		return getsalesApiRequest.call(this, 'PUT', `/flows/api/flows/${uuid}/start`, undefined, undefined, i);
	}

	if (operation === 'stop') {
		const uuid = this.getNodeParameter('flowUuid', i) as string;
		return getsalesApiRequest.call(this, 'PUT', `/flows/api/flows/${uuid}/stop`, undefined, undefined, i);
	}

	// addContact
	const flowUuid = this.getNodeParameter('flowUuid', i) as string;
	const leadUuid = this.getNodeParameter('leadUuid', i) as string;
	const contactSourceId = this.getNodeParameter('contactSourceId', i, '1') as string;
	await getsalesApiRequest.call(
		this,
		'POST',
		`/flows/api/flows/${flowUuid}/leads/${leadUuid}`,
		{ contact_source_id: contactSourceId },
		undefined,
		i,
	);
	// 204 No Content on success — return a confirmation object instead of an empty body
	return { success: true, flow_uuid: flowUuid, lead_uuid: leadUuid };
}
