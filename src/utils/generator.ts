import {
  FiscalCode,
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

export const PaymentMessage = t.interface({
  id: t.string,
  operation: t.literal("CREATE"),
  senderServiceId: t.string,
  senderUserId: t.string,
  timeToLiveSeconds: t.number,
  isPending: t.boolean,
  content_subject: t.string,
  content_type: t.literal("PAYMENT"),
  content_paymentData_amount: t.number,
  content_paymentData_noticeNumber: NonEmptyString,
  content_paymentData_invalidAfterDueDate: t.boolean,
  content_paymentData_payeeFiscalCode: OrganizationFiscalCode,
  content_paymentData_dueDate: t.string,
  fiscal_code: FiscalCode,
});

export type PaymentMessage = t.TypeOf<typeof PaymentMessage>;

export const randomString = (length: number, charset: string) => {
  let res = "";
  while (length--) res += charset[(Math.random() * charset.length) | 0];
  return res;
};

export const generateFakeFiscalCode = (decade: string): FiscalCode => {
  const s = randomString(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  const d = randomString(7, "0123456789");
  return [s, decade, d[1], "A", d[2], d[3], "Y", d[4], d[5], d[6], "X"].join(
    ""
  ) as FiscalCode;
};

export const generateAvroMessageId = () =>
  randomString(12, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");

const getPaymentBizEvent = (
  payeeFiscalCode: OrganizationFiscalCode,
  noticeNumber: NonEmptyString,
  debtorFiscalCode: FiscalCode
) => ({
  uuid: "",
  version: "1",
  idPaymentManager: "15735423",
  complete: "false",
  missingInfo: ["missingInfo1", "missingInfo2"],
  debtorPosition: {
    modelType: "2",
    noticeNumber: noticeNumber,
    iuv: "97735020584",
  },
  creditor: {
    idPA: payeeFiscalCode,
    idBrokerPA: "77777777777",
    idStation: "77777777777_01",
    companyName: "company EC",
  },
  psp: {
    idPsp: "88888888888",
    idBrokerPsp: "88888888888",
    idChannel: "88888888888_01",
    psp: "PSP",
  },
  debtor: {
    fullName: "John Doe",
    entityUniqueIdentifierType: "F",
    entityUniqueIdentifierValue: debtorFiscalCode,
  },
  payer: {
    fullName: "John Doe",
    entityUniqueIdentifierType: "F",
    entityUniqueIdentifierValue: debtorFiscalCode,
  },
  paymentInfo: {
    paymentDateTime: "2022-01-24",
    applicationDate: "2022-01-24",
    transferDate: "2022-01-24",
    dueDate: "2022-01-24",
    paymentToken: "c110729d258c4ab1b765fe902aae41d6",
    amount: "110",
    fee: "1.00",
    totalNotice: "1",
    paymentMethod: "creditCard",
    touchpoint: "IO",
    remittanceInformation: "reason for payment",
  },
  transferList: [
    {
      fiscalCodePA: "77777777777",
      companyName: "company EC",
      amount: "100",
      transferCategory: "0101100IM",
      remittanceInformation: "remittanceInformation2",
    },
    {
      fiscalCodePA: "77777777778",
      companyName: "company EC1",
      amount: "10",
      transferCategory: "0201102IM",
      remittanceInformation: "remittanceInformation3",
    },
  ],
});

export const generatePayeeFiscalCode = () => {
  return randomString(11, "0123456789") as OrganizationFiscalCode;
};

const generateNoticeNumber = () => {
  const prefix = randomString(1, "0123");
  const num = randomString(17, "012345678");
  return `${prefix}${num}` as NonEmptyString;
};

const generateContentType = () => {
  const rand = randomString(1, "0123");
  switch (rand) {
    case "0":
      return "PAYMENT";
    case "1":
      return "GENERIC";
    default:
      return "GENERIC";
  }
};

export const generateAvroMessage = () => {
  const contentType = generateContentType();

  if (contentType === "PAYMENT") {
    return {
      id: generateAvroMessageId(),
      operation: "CREATE",
      senderServiceId: "Reminder",
      senderUserId: "Reminder",
      timeToLiveSeconds: 100,
      isPending: false,
      content_subject: "subject",
      content_type: contentType,
      content_paymentData_amount: 500.84,
      content_paymentData_noticeNumber: generateNoticeNumber(),
      content_paymentData_invalidAfterDueDate: false,
      content_paymentData_payeeFiscalCode: generatePayeeFiscalCode(),
      content_paymentData_dueDate: "2999-06-10",
      fiscal_code: generateFakeFiscalCode("9"),
    };
  } else {
    return {
      id: generateAvroMessageId(),
      operation: "CREATE",
      senderServiceId: "Reminder",
      senderUserId: "Reminder",
      timeToLiveSeconds: 100,
      isPending: false,
      content_subject: "subject",
      content_type: contentType,
      fiscal_code: generateFakeFiscalCode("9"),
    };
  }
};

export const testFiscalCodeGenerator = (
  testFiscalCodes: ReadonlyArray<FiscalCode>
) => () => testFiscalCodes[Math.floor(Math.random() * testFiscalCodes.length)];

export const generatePaymentMessage = (
  fiscalCodeGenerator: () => FiscalCode
) => ({
  content: {
    markdown: "A Payment updater markdown".repeat(5),
    subject: "A Payment updater subject",
    payment_data: {
      notice_number: generateNoticeNumber(),
      amount: 10,
      payee: {
        fiscal_code: generatePayeeFiscalCode(),
      },
    },
  },
  fiscal_code: fiscalCodeGenerator(),
});

export const generateRandomPayment = () => {
  const payeeFiscalCode = generatePayeeFiscalCode();
  const debtorFiscalCode = generateFakeFiscalCode("9");
  const noticeNumber = generateNoticeNumber();
  return {
    paymentBizEvent: getPaymentBizEvent(
      payeeFiscalCode,
      noticeNumber,
      debtorFiscalCode
    ),
    debtorFiscalCode,
    noticeNumber,
    payeeFiscalCode,
  };
};

export const generatePayment = (
  payeeFiscalCode: OrganizationFiscalCode,
  noticeNumber: NonEmptyString,
  debtorFiscalCode: FiscalCode
) => ({
  paymentBizEvent: getPaymentBizEvent(
    payeeFiscalCode,
    noticeNumber,
    debtorFiscalCode
  ),
  debtorFiscalCode,
  noticeNumber,
  payeeFiscalCode,
});
