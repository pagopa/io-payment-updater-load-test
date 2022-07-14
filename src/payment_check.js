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
        'http_req_duration{Method:checkPayment}': ['p(95)<1000'], // threshold on API requests only
    },
};

export default function() {
	// Values from env var.
    var puBaseUrl = `${__ENV.PU_BASE_URL}`
	var tag = {
        Method: "checkPayment",
    };
	let res = http.get(`${puBaseUrl}/api/v1/payment/check/test500`, {
        tags: tag,
    });
	check(res, { 'status was 200' : r => r.status == 200 }, tag);
	sleep(1);
}