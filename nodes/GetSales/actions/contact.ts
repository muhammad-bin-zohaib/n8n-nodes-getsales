import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { getsalesApiRequest } from '../../../utils/getsalesApi';
import { getsalesFetchAllPages } from '../../../utils/pagination';
import { customFieldsProperty, customFieldsToObject } from './shared';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['contact'] } },
		options: [
			{ name: 'Create or Update', value: 'upsert', action: 'Upsert a contact', description: 'Create a new record, or update the current one if it already exists (upsert)' },
			{ name: 'Get', value: 'get', action: 'Get a contact', description: 'Retrieve a contact by UUID' },
			{ name: 'Lookup', value: 'lookup', action: 'Look up a contact', description: 'Find a contact by LinkedIn ID, email, or name + company' },
			{ name: 'Search', value: 'search', action: 'Search contacts', description: 'Search contacts with filters and pagination' },
			{ name: 'Update', value: 'update', action: 'Update a contact', description: 'Update an existing contact by UUID' },
		],
		default: 'search',
	},
];

const statusOptions = [
	{ name: 'OK', value: 'ok' },
	{ name: 'Failed Validation', value: 'failed_validation' },
	{ name: 'No Contact Data', value: 'no_contact_data' },
	{ name: 'Duplicate', value: 'duplicate' },
];
const linkedinStatusOptions = [
	{ name: 'Need Enrichment', value: 'need_enrichment' },
	{ name: 'Enrichment Failed', value: 'enrichment_failed' },
	{ name: 'No Data', value: 'no_data' },
	{ name: 'Blocked', value: 'blocked' },
	{ name: 'OK', value: 'ok' },
];
const emailStatusOptions = [
	{ name: 'Need Search', value: 'need_search' },
	{ name: 'No Data', value: 'no_data' },
	{ name: 'Unsubscribed', value: 'unsubscribed' },
	{ name: 'OK', value: 'ok' },
];

export const contactFields: INodeProperties[] = [
	// ---------- Search ----------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['contact'], operation: ['search'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['contact'], operation: ['search'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['contact'], operation: ['search'] } },
		options: [
			{ displayName: 'Company Name', name: 'company_name', type: 'string', default: '' },
			{ displayName: 'Company UUID', name: 'company_uuid', type: 'string', default: '' },
			{ displayName: 'Data Source UUID', name: 'data_source_uuid', type: 'string', default: '' },
			{ displayName: 'Email Status', name: 'email_status', type: 'options', options: emailStatusOptions, default: 'ok' },
			{ displayName: 'LinkedIn Status', name: 'linkedin_status', type: 'options', options: linkedinStatusOptions, default: 'ok' },
			{ displayName: 'List Name or ID', name: 'list_uuid', type: 'string', default: '', description: 'Whatever gets passed is used as the exact list_uuid' },
			{ displayName: 'Pipeline Stage UUID', name: 'pipeline_stage_uuid', type: 'string', default: '' },
			{ displayName: 'Search Text', name: 'q', type: 'string', default: '', description: 'Full-text search across name, email, position, headline, about' },
			{ displayName: 'Sender Profile UUID', name: 'sender_profile_uuid', type: 'string', default: '' },
			{ displayName: 'Status', name: 'status', type: 'options', options: statusOptions, default: 'ok' },
			{ displayName: 'Tag UUIDs', name: 'tags', type: 'string', default: '', description: 'Comma-separated tag UUIDs (from List Tags: GET /leads/api/tags)' },
			{ displayName: 'Work Email Domain', name: 'work_email_domain', type: 'string', default: '', placeholder: 'e.g. acme.com' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['contact'], operation: ['search'] } },
		options: [
			{ displayName: 'Order Field', name: 'order_field', type: 'string', default: 'created_at' },
			{ displayName: 'Order Type', name: 'order_type', type: 'options', options: [{ name: 'Ascending', value: 'asc' }, { name: 'Descending', value: 'desc' }], default: 'desc' },
			{ displayName: 'Disable Aggregation', name: 'disable_aggregation', type: 'boolean', default: false, description: 'Whether to skip markers/flows/custom-fields aggregation for a faster response' },
		],
	},

	// ---------- Lookup ----------
	{
		displayName: 'LinkedIn ID',
		name: 'linkedinId',
		type: 'string',
		default: '',
		description: 'Any LinkedIn reference: full profile URL, Sales Navigator URL, nickname, ln_id, or sn_id',
		displayOptions: { show: { resource: ['contact'], operation: ['lookup'] } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Matches both work and personal email',
		displayOptions: { show: { resource: ['contact'], operation: ['lookup'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Full name (use together with Company Name)',
		displayOptions: { show: { resource: ['contact'], operation: ['lookup'] } },
	},
	{
		displayName: 'Company Name',
		name: 'companyName',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['lookup'] } },
	},
	{
		displayName: 'Disable Aggregation',
		name: 'disableAggregation',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['lookup'] } },
	},

	// ---------- Get ----------
	{
		displayName: 'Contact UUID',
		name: 'contactUuid',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['get', 'update'] } },
	},
	{
		displayName: 'Disable Aggregation',
		name: 'disableAggregation',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['contact'], operation: ['get'] } },
	},

	// ---------- Upsert ----------
	{
		displayName: 'List UUID',
		name: 'listUuid',
		type: 'string',
		required: true,
		default: '',
		description: 'List to add the contact to',
		displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
	},
	{
		displayName: 'Update If Exists',
		name: 'updateIfExists',
		type: 'boolean',
		default: true,
		description: 'Whether to update the existing contact if a match is found instead of creating a duplicate',
		displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
	},
	{
		displayName: 'Move to List',
		name: 'moveToList',
		type: 'boolean',
		default: false,
		description: 'Whether to move an existing matched contact into List UUID (instead of keeping its current list)',
		displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
	},
	{
		displayName: 'Contact Fields',
		name: 'leadFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
		options: [
			{ displayName: 'About', name: 'about', type: 'string', typeOptions: { rows: 3 }, default: '' },
			{ displayName: 'Avatar URL', name: 'avatar', type: 'string', default: '' },
			{ displayName: 'Company Name', name: 'company_name', type: 'string', default: '' },
			{ displayName: 'Facebook', name: 'facebook', type: 'string', default: '' },
			{ displayName: 'First Name', name: 'first_name', type: 'string', default: '' },
			{ displayName: 'Full Name', name: 'name', type: 'string', default: '', description: 'Auto-generated from First/Last Name if omitted' },
			{ displayName: 'Headline', name: 'headline', type: 'string', default: '' },
			{ displayName: 'Last Name', name: 'last_name', type: 'string', default: '' },
			{ displayName: 'LinkedIn ID', name: 'linkedin_id', type: 'string', default: '', description: 'Recommended: any LinkedIn reference (URL, nickname, ln_id, sn_id) — auto-detected' },
			{ displayName: 'LinkedIn Nickname', name: 'linkedin', type: 'string', default: '', description: 'Use LinkedIn ID instead unless you specifically have just the nickname' },
			{ displayName: 'Personal Email', name: 'personal_email', type: 'string', default: '' },
			{ displayName: 'Personal Phone Number', name: 'personal_phone_number', type: 'string', default: '' },
			{ displayName: 'Position', name: 'position', type: 'string', default: '' },
			{ displayName: 'Raw Address', name: 'raw_address', type: 'string', default: '' },
			{ displayName: 'Tags', name: 'tags', type: 'string', default: '', description: 'Comma-separated tag names (created automatically if missing)' },
			{ displayName: 'Twitter', name: 'twitter', type: 'string', default: '' },
			{ displayName: 'Work Email', name: 'work_email', type: 'string', default: '' },
			{ displayName: 'Work Phone Number', name: 'work_phone_number', type: 'string', default: '' },
		],
	},
	customFieldsProperty('contact', ['upsert']),

	// ---------- Update ----------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['contact'], operation: ['update'] } },
		options: [
			{ displayName: 'About', name: 'about', type: 'string', typeOptions: { rows: 3 }, default: '' },
			{ displayName: 'Company Name', name: 'company_name', type: 'string', default: '' },
			{ displayName: 'Facebook', name: 'facebook', type: 'string', default: '' },
			{ displayName: 'First Name', name: 'first_name', type: 'string', default: '' },
			{ displayName: 'Full Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Headline', name: 'headline', type: 'string', default: '' },
			{ displayName: 'Last Name', name: 'last_name', type: 'string', default: '' },
			{ displayName: 'LinkedIn ID', name: 'linkedin_id', type: 'string', default: '', description: 'Recommended: any LinkedIn reference (URL, nickname, ln_id, sn_id) — auto-detected' },
			{ displayName: 'LinkedIn Nickname', name: 'linkedin', type: 'string', default: '' },
			{ displayName: 'Personal Email', name: 'personal_email', type: 'string', default: '' },
			{ displayName: 'Personal Phone Number', name: 'personal_phone_number', type: 'string', default: '' },
			{ displayName: 'Position', name: 'position', type: 'string', default: '' },
			{ displayName: 'Raw Address', name: 'raw_address', type: 'string', default: '' },
			{ displayName: 'Twitter', name: 'twitter', type: 'string', default: '' },
			{ displayName: 'Work Email', name: 'work_email', type: 'string', default: '' },
			{ displayName: 'Work Phone Number', name: 'work_phone_number', type: 'string', default: '' },
		],
	},
	customFieldsProperty('contact', ['update']),
];

export async function executeContact(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'search') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;

		if (typeof filters.tags === 'string' && filters.tags) {
			filters.tags = (filters.tags as string).split(',').map((s) => s.trim()).filter(Boolean);
		}

		const items = await getsalesFetchAllPages(
			async (pageLimit, offset) => {
				const response = await getsalesApiRequest.call(
					this,
					'POST',
					'/leads/api/leads/search',
					{ filter: filters, limit: pageLimit, offset, ...options },
					undefined,
					i,
				);
				return { items: (response.data as IDataObject[]) ?? [], hasMore: Boolean(response.has_more) };
			},
			returnAll,
			limit,
		);
		return items;
	}

	if (operation === 'lookup') {
		const body: IDataObject = {
			linkedin_id: (this.getNodeParameter('linkedinId', i, '') as string) || null,
			email: (this.getNodeParameter('email', i, '') as string) || null,
			name: (this.getNodeParameter('name', i, '') as string) || null,
			company_name: (this.getNodeParameter('companyName', i, '') as string) || null,
			disable_aggregation: this.getNodeParameter('disableAggregation', i, false) as boolean,
		};
		return getsalesApiRequest.call(this, 'POST', '/leads/api/leads/lookup-one', body, undefined, i);
	}

	if (operation === 'get') {
		const uuid = this.getNodeParameter('contactUuid', i) as string;
		const disableAggregation = this.getNodeParameter('disableAggregation', i, false) as boolean;
		return getsalesApiRequest.call(
			this,
			'GET',
			`/leads/api/leads/${uuid}`,
			undefined,
			disableAggregation ? { disable_aggregation: true } : undefined,
			i,
		);
	}

	if (operation === 'upsert') {
		const listUuid = this.getNodeParameter('listUuid', i) as string;
		const leadFields = this.getNodeParameter('leadFields', i, {}) as IDataObject;
		if (typeof leadFields.tags === 'string' && leadFields.tags) {
			leadFields.tags = (leadFields.tags as string).split(',').map((s) => s.trim()).filter(Boolean);
		}
		const body: IDataObject = {
			lead: leadFields,
			list_uuid: listUuid,
			update_if_exists: this.getNodeParameter('updateIfExists', i) as boolean,
			move_to_list: this.getNodeParameter('moveToList', i) as boolean,
		};
		const customFields = customFieldsToObject(this, i);
		if (customFields) body.custom_fields = customFields;
		return getsalesApiRequest.call(this, 'POST', '/leads/api/leads/upsert', body, undefined, i);
	}

	// update
	const uuid = this.getNodeParameter('contactUuid', i) as string;
	const body = this.getNodeParameter('updateFields', i, {}) as IDataObject;
	const customFields = customFieldsToObject(this, i);
	if (customFields) body.custom_fields = customFields;
	return getsalesApiRequest.call(this, 'PUT', `/leads/api/leads/${uuid}`, body, undefined, i);
}
