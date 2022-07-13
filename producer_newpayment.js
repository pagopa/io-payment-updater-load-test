import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
	stages: [
		{duration: '30s', target: 120},
		{duration: '60s', target: 120},
		{duration: '30s', target: 0}
	]
}

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
  }]
});

const params = {
    headers: {
      'Content-Type': 'application/json',
    }
  };

export default function() {
	let url = 'https://io-d-reminder-producer-app.azurewebsites.net/notifications/newPaymentKafka';
	let res = http.post(url, payload, params);
	check(res, { 'status was 200' : r => r.status == 200 });
	sleep(1);
}