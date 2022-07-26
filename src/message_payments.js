import { check, sleep } from 'k6';
import http from 'k6/http';
import {
  generateMessage,
  generatePayment,
  generateRandomPayment
} from "./utils/generator.js";
  
  export let options = {
    scenarios: {
      contacts: {
        executor: "constant-arrival-rate",
        rate: __ENV.rate, // e.g. 20000 for 20K iterations
        duration: __ENV.duration, // e.g. '1m'
        preAllocatedVUs: __ENV.preAllocatedVUs, // e.g. 500
        maxVUs: __ENV.maxVUs, // e.g. 1000
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
  
  export default function () {
    // Values from env var.
    var producerBaseUrl = `${__ENV.PRODUCER_BASE_URL}`;
    var puBaseUrl = `${__ENV.PU_BASE_URL}`;
  
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
  
    const paymentMessages = messageArray.filter(
      (el) => el.content_type === "PAYMENT"
    );
  
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
        j++;
        if (paymentRelatedToMessage){
          allPayments.push(paymentRelatedToMessage.paymentBizEvent);
        }
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
      let res = http.get(
        `${checkPaymentApiUrl}/${paymentMessage.id}`, {
          headers: {
            "Ocp-Apim-Subscription-Key": `${__ENV.API_SUBSCRIPTION_KEY}`,
            environment: `${__ENV.API_ENVIRONMENT}` ? `${__ENV.API_ENVIRONMENT}` : "default"
          }
        }
        );
      check(res, { "status was 200": (r) => r.status == 200 });
      sleep(1);
    });
  }
  
  