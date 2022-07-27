import { check, fail, sleep } from "k6";
import http from "k6/http";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as B from "fp-ts/lib/boolean";
import { getConfigOrThrow } from "./utils/config";
import {
  generateMessage,
  generatePayment,
  generateRandomPayment,
  PaymentMessage,
} from "./utils/generator";
import { pipe } from "fp-ts/lib/function";
import { ApiPaymentMessageResponse } from "./utils/types";

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
    "http_req_duration{api:checkMessages}": ["p(95)<1000"],
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
  let res = http.post(url, JSON.stringify(messageArray), {
    ...params,
    tags: { api: "newKafka" },
  });
  check(
    res,
    { "newKafka status was 200": (r) => r.status == 200 },
    { tags: { api: "newKafka" } }
  );
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

  const allPayments = [
    ...paymentsRelatedToMessages.map((m) => m.paymentBizEvent),
  ];
  for (let i = 0; i <= 100; i++) {
    allPayments.push(generateRandomPayment().paymentBizEvent);
  }

  const allPaymentsShuffled = allPayments.sort(() => Math.random() - 0.5);

  let createPaymentUrl = `${producerBaseUrl}/notifications/newPaymentKafka`;
  allPaymentsShuffled.forEach((paymentBizEvent) => {
    const payload = JSON.stringify(paymentBizEvent);
    let res = http.post(createPaymentUrl, payload, {
      ...params,
      tags: { api: "newPaymentKafka" },
    });
    check(
      res,
      { "newPaymentKafka status was 200": (r) => r.status == 200 },
      { tags: { api: "newPaymentKafka" } }
    );
    sleep(0.5);
  });

  sleep(2);

  // check Processed Payments
  let checkPaymentApiUrl = `${puBaseUrl}/api/v1/payment/check/messages`;
  paymentMessages.forEach((paymentMessage) => {
    pipe(
      http.get(`${checkPaymentApiUrl}/${paymentMessage.id}`, {
        headers: {
          "Ocp-Apim-Subscription-Key": `${config.API_SUBSCRIPTION_KEY}`,
          environment: pipe(
            config.API_ENVIRONMENT,
            O.fromNullable,
            O.getOrElse(() => "default")
          ),
        },
        tags: { api: "checkMessages" },
      }),
      (res) =>
        pipe(
          check(
            res,
            { "checkMessages status was 200": (r) => r.status == 200 },
            { tags: { api: "checkMessages" } }
          ),
          () => res.status == 200,
          B.fold(
            () => void 0,
            () =>
              pipe(
                res.json(),
                ApiPaymentMessageResponse.decode,
                E.map((paymentResponse) =>
                  check(
                    paymentResponse,
                    {
                      "payment response paid flag is true": (pR) => pR.paid,
                    },
                    { tags: { method: "checkPaidFlag" } }
                  )
                ),
                E.getOrElse((errs) =>
                  check(
                    errs,
                    {
                      "payment response has a correct response shape": (errs) =>
                        errs == undefined,
                    },
                    { tags: { method: "checkPaymentResponseShape" } }
                  )
                )
              )
          )
        )
    );

    sleep(1);
  });
}
