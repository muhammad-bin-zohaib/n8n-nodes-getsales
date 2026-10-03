import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { getsalesApiRequest } from '../../../utils/getsalesApi';
import { getsalesFetchAllPages } from '../../../utils/pagination';
import { customFieldsProperty, customFieldsToObject } from './shared';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['company'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a company', description: 'Create a new company' },
			{ name: 'Get', value: 'get', action: 'Get a company', description: 'Retrieve a company by UUID' },
			{ name: 'List', value: 'list', action: 'List companies', description: 'Search and list companies with filters and pagination' },
			{ name: 'Lookup', value: 'lookup', action: 'Look up a company', description: 'Find a company by LinkedIn page, website, domain, or name' },
			{ name: 'Update', value: 'update', action: 'Update a company', description: 'Update an existing company by UUID' },
		],
		default: 'list',
	},
];

const companyStatusOptions = [
	{ name: 'OK', value: 'ok' },
	{ name: 'Failed Validation', value: 'failed_validation' },
	{ name: 'Duplicate', value: 'duplicate' },
];
const companyLinkedinStatusOptions = [
	{ name: 'Need Enrichment', value: 'need_enrichment' },
	{ name: 'Enrichment Failed', value: 'enrichment_failed' },
	{ name: 'No Data', value: 'no_data' },
	{ name: 'OK', value: 'ok' },
];
const networkTypeOptions = [
	{ name: 'Business', value: 'business' },
	{ name: 'Education', value: 'eduction' },
	{ name: 'Hosting', value: 'hosting' },
	{ name: 'ISP', value: 'isp' },
];

function splitCommaList(value: unknown): string[] | undefined {
	if (typeof value !== 'string' || !value) return undefined;
	return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export const companyFields: INodeProperties[] = [
	// ---------- List ----------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: { show: { resource: ['company'], operation: ['list'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		displayOptions: { show: { resource: ['company'], operation: ['list'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['company'], operation: ['list'] } },
		options: [
			{ displayName: 'Data Source UUID', name: 'data_source_uuid', type: 'string', default: '' },
			{ displayName: 'Domain', name: 'domain', type: 'string', default: '', description: 'Exact match' },
			{ displayName: 'LinkedIn Company ID', name: 'ln_id', type: 'number', default: 0 },
			{ displayName: 'LinkedIn Page Slug', name: 'linkedin', type: 'string', default: '' },
			{ displayName: 'LinkedIn Status', name: 'linkedin_status', type: 'options', options: companyLinkedinStatusOptions, default: 'ok' },
			{ displayName: 'List UUIDs', name: 'lists', type: 'string', default: '', description: 'Comma-separated list UUIDs' },
			{ displayName: 'Minimum Deal Size', name: 'deal_size', type: 'number', default: 0 },
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Partial match' },
			{ displayName: 'Pipeline Stage UUID', name: 'pipeline_stage_uuid', type: 'string', default: '' },
			{ displayName: 'Search Text', name: 'q', type: 'string', default: '', description: 'Full-text search across company name and domain' },
			{ displayName: 'Status', name: 'status', type: 'options', options: companyStatusOptions, default: 'ok' },
			{ displayName: 'Tag UUIDs', name: 'tags', type: 'string', default: '', description: 'Comma-separated tag UUIDs' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['company'], operation: ['list'] } },
		options: [
			{ displayName: 'Order Field', name: 'order_field', type: 'string', default: 'created_at', description: 'Common values: created_at, updated_at, name, deal_size, employees_on_linkedin' },
			{ displayName: 'Order Type', name: 'order_type', type: 'options', options: [{ name: 'Ascending', value: 'asc' }, { name: 'Descending', value: 'desc' }], default: 'desc' },
		],
	},

	// ---------- Lookup ----------
	{
		displayName: 'LinkedIn Company ID', name: 'ln_id', type: 'string', default: '',
		displayOptions: { show: { resource: ['company'], operation: ['lookup'] } },
	},
	{
		displayName: 'LinkedIn Page Slug', name: 'linkedin', type: 'string', default: '',
		description: 'The slug after /company/ in a LinkedIn URL, e.g. acme-inc',
		displayOptions: { show: { resource: ['company'], operation: ['lookup'] } },
	},
	{
		displayName: 'Website', name: 'website', type: 'string', default: '',
		description: 'Full website URL — domain is extracted automatically',
		displayOptions: { show: { resource: ['company'], operation: ['lookup'] } },
	},
	{
		displayName: 'Name', name: 'name', type: 'string', default: '',
		description: 'Least precise match',
		displayOptions: { show: { resource: ['company'], operation: ['lookup'] } },
	},
	{
		displayName: 'Disable Aggregation', name: 'disableAggregation', type: 'boolean', default: false,
		displayOptions: { show: { resource: ['company'], operation: ['lookup'] } },
	},

	// ---------- Get / Update ----------
	{
		displayName: 'Company UUID',
		name: 'companyUuid',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['company'], operation: ['get', 'update'] } },
	},

	// ---------- Create ----------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['company'], operation: ['create'] } },
	},
	{
		displayName: 'List UUIDs',
		name: 'listUuids',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated list UUIDs to assign the created company to',
		displayOptions: { show: { resource: ['company'], operation: ['create'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['company'], operation: ['create'] } },
		options: [
			{ displayName: 'About', name: 'about', type: 'string', typeOptions: { rows: 3 }, default: '' },
			{ displayName: 'Domain', name: 'domain', type: 'string', default: '', description: 'Used for deduplication and contact matching', placeholder: 'e.g. acme.com' },
			{ displayName: 'Employees on LinkedIn', name: 'employees_on_linkedin', type: 'number', default: 0 },
			{ displayName: 'Employees Range', name: 'employees_range', type: 'string', default: '', placeholder: 'e.g. 201-500' },
			{ displayName: 'Facebook', name: 'facebook', type: 'string', default: '' },
			{ displayName: 'Followers', name: 'followers', type: 'number', default: 0 },
			{ displayName: 'Hashtags', name: 'hashtags', type: 'string', default: '', description: 'Comma-separated' },
			{ displayName: 'HQ Address', name: 'hq_raw_address', type: 'string', default: '' },
			{ displayName: 'Industry', name: 'industry', type: 'string', default: '' },
			{ displayName: 'LinkedIn Company ID', name: 'ln_id', type: 'string', default: '' },
			{ displayName: 'LinkedIn Page Slug', name: 'linkedin', type: 'string', default: '', description: 'Triggers automatic enrichment', placeholder: 'e.g. acme-inc' },
			{ displayName: 'Logo URL', name: 'logo_url', type: 'string', default: '' },
			{ displayName: 'Network Type', name: 'network_type', type: 'options', options: networkTypeOptions, default: 'business' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Specialities', name: 'specialities', type: 'string', default: '', description: 'Comma-separated' },
			{ displayName: 'Tagline', name: 'tagline', type: 'string', default: '' },
			{ displayName: 'Tags', name: 'tags', type: 'string', default: '', description: 'Comma-separated tag names' },
			{ displayName: 'Twitter', name: 'twitter', type: 'string', default: '' },
			{ displayName: 'Website', name: 'website', type: 'string', default: '' },
			{ displayName: 'Year Established', name: 'year_established', type: 'number', default: 0 },
		],
	},

	// ---------- Update ----------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['company'], operation: ['update'] } },
		options: [
			{ displayName: 'About', name: 'about', type: 'string', typeOptions: { rows: 3 }, default: '' },
			{ displayName: 'Deal Size', name: 'deal_size', type: 'number', default: 0 },
			{ displayName: 'Domain', name: 'domain', type: 'string', default: '' },
			{ displayName: 'Employees on LinkedIn', name: 'employees_on_linkedin', type: 'number', default: 0 },
			{ displayName: 'Employees Range', name: 'employees_range', type: 'string', default: '' },
			{ displayName: 'Facebook', name: 'facebook', type: 'string', default: '' },
			{ displayName: 'Followers', name: 'followers', type: 'number', default: 0 },
			{ displayName: 'Hashtags', name: 'hashtags', type: 'string', default: '', description: 'Comma-separated' },
			{ displayName: 'HQ Address', name: 'hq_raw_address', type: 'string', default: '' },
			{
				displayName: 'HQ Location',
				name: 'hq_location',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{ displayName: 'Address String', name: 'address_string', type: 'string', default: '' },
					{ displayName: 'City', name: 'city', type: 'string', default: '' },
					{ displayName: 'Country', name: 'country', type: 'string', default: '' },
					{ displayName: 'Region', name: 'region', type: 'string', default: '' },
					{ displayName: 'Timezone', name: 'timezone', type: 'string', default: '' },
					{ displayName: 'Zip', name: 'zip', type: 'string', default: '' },
				],
			},
			{ displayName: 'Industry', name: 'industry', type: 'string', default: '' },
			{ displayName: 'LinkedIn Company ID', name: 'ln_id', type: 'number', default: 0 },
			{ displayName: 'LinkedIn Page Slug', name: 'linkedin', type: 'string', default: '', placeholder: 'e.g. acme-inc' },
			{ displayName: 'LinkedIn Status', name: 'linkedin_status', type: 'options', options: companyLinkedinStatusOptions, default: 'ok' },
			{ displayName: 'Logo URL', name: 'logo_url', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Network Type', name: 'network_type', type: 'options', options: networkTypeOptions, default: 'business' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Pipeline Stage UUID', name: 'pipeline_stage_uuid', type: 'string', default: '' },
			{ displayName: 'Specialities', name: 'specialities', type: 'string', default: '', description: 'Comma-separated' },
			{ displayName: 'Status', name: 'status', type: 'options', options: companyStatusOptions, default: 'ok' },
			{ displayName: 'Tagline', name: 'tagline', type: 'string', default: '' },
			{ displayName: 'Twitter', name: 'twitter', type: 'string', default: '' },
			{ displayName: 'Website', name: 'website', type: 'string', default: '' },
			{ displayName: 'Year Established', name: 'year_established', type: 'number', default: 0 },
		],
	},
	customFieldsProperty('company', ['update']),
];

export async function executeCompany(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'list') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = this.getNodeParameter('limit', i, 50) as number;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		filters.lists = splitCommaList(filters.lists) ?? filters.lists;
		filters.tags = splitCommaList(filters.tags) ?? filters.tags;

		const items = await getsalesFetchAllPages(
			async (pageLimit, offset) => {
				const response = await getsalesApiRequest.call(
					this,
					'POST',
					'/leads/api/companies/list',
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
		const lookup: IDataObject = {
			ln_id: (this.getNodeParameter('ln_id', i, '') as string) || null,
			linkedin: (this.getNodeParameter('linkedin', i, '') as string) || null,
			website: (this.getNodeParameter('website', i, '') as string) || null,
			name: (this.getNodeParameter('name', i, '') as string) || null,
		};
		const body: IDataObject = {
			companies: [lookup],
			disable_aggregation: this.getNodeParameter('disableAggregation', i, false) as boolean,
		};
		return getsalesApiRequest.call(this, 'POST', '/leads/api/companies/lookup', body, undefined, i);
	}

	if (operation === 'get') {
		const uuid = this.getNodeParameter('companyUuid', i) as string;
		return getsalesApiRequest.call(this, 'GET', `/leads/api/companies/${uuid}`, undefined, undefined, i);
	}

	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const listUuids = splitCommaList(this.getNodeParameter('listUuids', i) as string) ?? [];
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		additionalFields.specialities = splitCommaList(additionalFields.specialities) ?? additionalFields.specialities;
		additionalFields.hashtags = splitCommaList(additionalFields.hashtags) ?? additionalFields.hashtags;
		additionalFields.tags = splitCommaList(additionalFields.tags) ?? additionalFields.tags;

		const body: IDataObject = {
			companies: [{ name, ...additionalFields }],
			list_uuids: listUuids,
		};
		return getsalesApiRequest.call(this, 'POST', '/leads/api/companies', body, undefined, i);
	}

	// update
	const uuid = this.getNodeParameter('companyUuid', i) as string;
	const body = this.getNodeParameter('updateFields', i, {}) as IDataObject;
	body.specialities = splitCommaList(body.specialities) ?? body.specialities;
	body.hashtags = splitCommaList(body.hashtags) ?? body.hashtags;
	const customFields = customFieldsToObject(this, i);
	if (customFields) body.custom_fields = customFields;
	return getsalesApiRequest.call(this, 'PUT', `/leads/api/companies/${uuid}`, body, undefined, i);
}
