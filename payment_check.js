import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
	stages: [
		{duration: '30s', target: 120},
		{duration: '60s', target: 240},
		{duration: '30s', target: 0}
	]
}

export default function() {
	let res = http.get('https://io-d-reminder-payment-updater.azurewebsites.net/api/v1/payment/check/test500');
	check(res, { 'status was 200' : r => r.status == 200 });
	sleep(1);
}