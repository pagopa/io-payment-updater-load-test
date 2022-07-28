import { check, fail, sleep } from "k6";
import http from "k6/http";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as B from "fp-ts/lib/boolean";
import { getConfigOrThrow } from "./utils/config";
import {
  generatePayeeFiscalCode,
  generatePayment,
  generatePaymentMessage,
  testFiscalCodeGenerator,
} from "./utils/generator";
import { pipe } from "fp-ts/lib/function";
import { ApiGetMessageResponse, ApiSendMessageResponse } from "./utils/types";

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
    "http_req_duration{api:getMessage}": ["p(95)<1000"],
  },
};

const commonHeaders = {
  "Content-Type": "application/json",
};

export default function() {
  // Values from env var.
  var producerBaseUrl = `${config.PRODUCER_BASE_URL}`;
  var appBackendBaseUrl = `${config.APP_BACKEND_BASE_URL}`;
  var apimPublicUrl = `${config.APIM_PUBLIC_URL}`;
  var serviceSubscriptionKey = pipe(
    config.SERVICE_SUBSCRIPTION_KEY,
    O.fromNullable,
    O.getOrElseW(() =>
      fail("Cannot read a subscription key for sending messages")
    )
  );

  const aGeneratedPaymentMessageToSend = pipe(
    config.TEST_LOGIN_FISCAL_CODES,
    O.fromNullable,
    O.map(testFiscalCodeGenerator),
    O.map(generatePaymentMessage),
    O.getOrElseW(() => fail("Cannot generate Test Fiscal Codes data"))
  );

  // send message
  let url = `${apimPublicUrl}/api/v1/messages`;
  let res = http.post(
    url,
    JSON.stringify({
      ...aGeneratedPaymentMessageToSend,
      feature_level_type: "ADVANCED",
    }),
    {
      headers: {
        ...commonHeaders,
        "Ocp-Apim-Subscription-Key": serviceSubscriptionKey,
      },
      tags: { api: "sendMessage" },
    }
  );
  check(
    res,
    { "sendMessage status was 201": (r) => r.status == 201 },
    { tags: { api: "sendMessage" } }
  );

  const messageId = pipe(
    res.json(),
    ApiSendMessageResponse.decode,
    E.map((_) => _.id),
    E.getOrElseW(() => fail("Cannot get a sent messageId"))
  );

  sleep(60);

  // Generate and publish related payment for payment message
  const paymentRelatedToMessage = generatePayment(
    generatePayeeFiscalCode(),
    aGeneratedPaymentMessageToSend.content.payment_data.notice_number,
    aGeneratedPaymentMessageToSend.fiscal_code
  );

  let createPaymentUrl = `${producerBaseUrl}/notifications/newPaymentKafka`;

  const payload = JSON.stringify(paymentRelatedToMessage.paymentBizEvent);
  res = http.post(createPaymentUrl, payload, {
    headers: { ...commonHeaders },
    tags: { api: "newPaymentKafka" },
  });
  check(
    res,
    { "newPaymentKafka status was 200": (r) => r.status == 200 },
    { tags: { api: "newPaymentKafka" } }
  );

  sleep(10);

  // Login with test fiscal Code

  // check Processed Payments
  let checkMessageApiUrl = `${apimPublicUrl}/api/v1/messages`;
  pipe(
    http.get(
      `${checkMessageApiUrl}/${aGeneratedPaymentMessageToSend.fiscal_code}/${messageId}`,
      {
        headers: {
          ...commonHeaders,
          "Ocp-Apim-Subscription-Key": `${config.SERVICE_SUBSCRIPTION_KEY}`,
        },
        tags: { api: "getMessage" },
      }
    ),
    (res) =>
      pipe(
        check(
          res,
          { "getMessage status was 200": (r) => r.status == 200 },
          { tags: { api: "getMessage" } }
        ),
        () => res.status == 200,
        B.fold(
          () => void 0,
          () =>
            pipe(
              res.json(),
              ApiGetMessageResponse.decode,
              E.map((getMessageResponse) =>
                check(
                  getMessageResponse,
                  {
                    "getMessageResponse response payment_status is PAID": (
                      mR
                    ) => mR.payment_status === "PAID",
                  },
                  { tags: { method: "checkPaidStatus" } }
                )
              ),
              E.getOrElse((errs) =>
                check(
                  errs,
                  {
                    "getMessageResponse response has a correct response shape": (
                      errs
                    ) => errs == undefined,
                  },
                  { tags: { method: "checkgetMessageResponseShape" } }
                )
              )
            )
        )
      )
  );
}
