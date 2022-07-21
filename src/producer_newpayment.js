import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
    scenarios: {
        contacts: {
            executor: 'constant-arrival-rate',
            rate: __ENV.rate, // e.g. 20000 for 20K iterations
            duration: __ENV.duration, // e.g. '1m'
            preAllocatedVUs: __ENV.preAllocatedVUs, // e.g. 500
            maxVUs: __ENV.maxVUs // e.g. 1000
        }
    },
    thresholds: {
        http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
        'http_req_duration{Method:newPaymentKafka}': ['p(95)<1000'], // threshold on API requests only
    },
	ext: {
		loadimpact: {
		  apm: [
			{
			  provider: 'azuremonitor',
			  tenantId: '7788edaf-0346-4068-9d79-c868aed15b3d',
			  clientId: '8768beb6-ce9e-4fcd-a0db-3c325a3a5417',
			  clientSecret: __ENV.clientSecret,
			  subscriptionId: 'a4e96bcd-59dc-4d66-b2f7-5547ad157c12',
			  resourceGroupName: 'io-d-reminder-ext',
			  insightsAppName: 'io-d-reminder-ai',
			  // optional
			  azureRegion: 'westeurope',
	
			  // optional
			  metrics: ['http_req_sending', 'my_rate', 'my_gauge'], // ...
			  includeDefaultMetrics: true,
			  includeTestRunId: false,
			},
		  ],
		},
	},
};

const payload = JSON.stringify({
	uuid: '',
	version: '1',
	idPaymentManager:'15735423',
	complete: 'false',
	missingInfo: [
		'missingInfo1',
		'missingInfo2'
	],
	debtorPosition : {
		modelType: '2',
		noticeNumber: 'A10',
		iuv: '97735020584'
	},
	creditor : {
		idPA: 'undefined',
		idBrokerPA: '77777777777',
		idStation: '77777777777_01',
		companyName: 'company EC'
	},
	psp : {
		idPsp : '88888888888',
		idBrokerPsp: '88888888888',
		idChannel: '88888888888_01',
		psp: 'PSP'
	},
	debtor: {
		fullName : 'John Doe',
		entityUniqueIdentifierType: 'F',
		entityUniqueIdentifierValue: 'JHNDOE00A01F205N'
	},
	payer: {
		fullName : 'John Doe',
		entityUniqueIdentifierType: 'F',
		entityUniqueIdentifierValue: 'JHNDOE00A01F205N'
	},
	paymentInfo: {
		paymentDateTime: '2022-01-24',
		applicationDate: '2022-01-24',
		transferDate: '2022-01-24',
		dueDate: '2022-01-24',
		paymentToken: 'c110729d258c4ab1b765fe902aae41d6',
		amount: '110',
		fee: '1.00',
		totalNotice : '1',
		paymentMethod : 'creditCard',
		touchpoint : 'IO',
		remittanceInformation : 'reason for payment'
	},
	transferList : [
		{
			fiscalCodePA : '77777777777',
			companyName : 'company EC',
			amount : '100',
			transferCategory : '0101100IM',
			remittanceInformation : 'remittanceInformation2'
		},
		{
			fiscalCodePA : '77777777778',
			companyName : 'company EC1',
			amount : '10',
			transferCategory : '0201102IM',
			remittanceInformation : 'remittanceInformation3'
		}
	]
});

const params = {
    headers: {
      'Content-Type': 'application/json',
    }
  };

export default function() {
	// Values from env var.
    var producerBaseUrl = `${__ENV.PRODUCER_BASE_URL}`
	var tag = {
        Method: "newPaymentKafka",
    };
	let url = `${producerBaseUrl}/notifications/newPaymentKafka`;
	let res = http.post(url, payload, params, {
        tags: tag,
    });
	check(res, { 'status was 200' : r => r.status == 200 });
	sleep(1);
}