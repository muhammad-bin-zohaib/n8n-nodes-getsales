import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class GetSalesApi implements ICredentialType {
	name = 'getSalesApi';

	displayName = 'GetSales API';

	icon = 'file:../nodes/GetSales/getsales.svg' as const;

	documentationUrl = 'https://help.getsales.io';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create one from GetSales under Workspace Settings → API Keys',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://amazing.getsales.io',
			url: '/id/api/users/current',
		},
	};
}
