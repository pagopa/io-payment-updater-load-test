import { check, sleep } from "k6";
import http from "k6/http";
import * as O from "fp-ts/lib/Option";
import { getConfigOrThrow } from "./utils/config";
import {
  generateMessage,
  generatePayment,
  generateRandomPayment,
  PaymentMessage,
} from "./utils/generator";
import { pipe } from "fp-ts/lib/function";

const config = getConfigOrThrow();

export let options = {
  scenarios: {
    contacts: {
      executor: "constant-arrival-rate",
      rate: config.rate, // e.g. 20000 for 20K iterations
      duration: config.duration, // e.g. '1m'
      preAllocatedVUs: config.preAllocatedVUs, // e.g. 500
      maxVUs: config.maxVUs, // e.g. 1000
    },
  },
  thresholds: {
    http_req_duration: ["p(99)<1500"], // 99% of requests must complete below 1.5s
  },
};

const params = {
  headers: {
    "Content-Type": "application/json",
  },
};

export default function() {
  // Values from env var.
  var producerBaseUrl = `${config.PRODUCER_BASE_URL}`;
  var puBaseUrl = `${config.PU_BASE_URL}`;

  const messageArray = [];
  // first create a set of randomMessages to be processed
  for (let i = 0; i <= 100; i++) {
    messageArray.push(generateMessage());
  }

  // publish messages
  let url = `${producerBaseUrl}/notifications/newKafka`;
  let res = http.post(url, JSON.stringify(messageArray), params);
  check(res, { "status was 200": (r) => r.status == 200 });
  sleep(60);

  const paymentMessages = messageArray.filter(PaymentMessage.is);

  // Generate and publish related payments for payment messages
  const paymentsRelatedToMessages = paymentMessages.map((paymentMessage) =>
    generatePayment(
      paymentMessage.content_paymentData_payeeFiscalCode,
      paymentMessage.content_paymentData_noticeNumber,
      paymentMessage.fiscal_code
    )
  );

  const allPayments = [];
  let j = 0;
  for (let i = 0; i <= 100; i++) {
    allPayments.push(generateRandomPayment().paymentBizEvent);
    if (i % 5 === 0 && j < paymentsRelatedToMessages.length) {
      const paymentRelatedToMessage = paymentsRelatedToMessages[j];
      if (paymentRelatedToMessage) {
        allPayments.push(paymentRelatedToMessage.paymentBizEvent);
      }
      j++;
    }
  }

  let createPaymentUrl = `${producerBaseUrl}/notifications/newPaymentKafka`;
  allPayments.forEach((paymentBizEvent) => {
    const payload = JSON.stringify(paymentBizEvent);
    let res = http.post(createPaymentUrl, payload, params);
    check(res, { "status was 200": (r) => r.status == 200 });
    sleep(1);
  });

  sleep(2);

  // check Processed Payments
  let checkPaymentApiUrl = `${puBaseUrl}/api/v1/payment/check/messages`;
  paymentMessages.forEach((paymentMessage) => {
    let res = http.get(`${checkPaymentApiUrl}/${paymentMessage.id}`, {
      headers: {
        "Ocp-Apim-Subscription-Key": `${config.API_SUBSCRIPTION_KEY}`,
        environment: pipe(
          config.API_ENVIRONMENT,
          O.fromNullable,
          O.getOrElse(() => "default")
        ),
      },
    });
    check(res, { "status was 200": (r) => r.status == 200 });
    sleep(1);
  });
}
