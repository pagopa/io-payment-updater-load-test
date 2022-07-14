export const randomString = (length, charset) => {
    let res = "";
    while (length--) res += charset[(Math.random() * charset.length) | 0];
    return res;
  };
  
  export const generateFakeFiscalCode = (decade) => {
    const s = randomString(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    const d = randomString(7, "0123456789");
    return [s, decade, d[1], "A", d[2], d[3], "Y", d[4], d[5], d[6], "X"].join(
      ""
    );
  };
  
  export const generateMessageId = () =>
    randomString(12, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  
  const getPaymentBizEvent = (
    payeeFiscalCode,
    noticeNumber,
    debtorFiscalCode
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
  
  const generatePayeeFiscalCode = () => {
    return randomString(11, "0123456789");
  };
  
  const generateNoticeNumber = () => {
    const prefix = randomString(1, "0123");
    const num = randomString(17, "012345678");
    return `${prefix}${num}`;
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
  export const generateMessage = () => {
    const contentType = generateContentType();
    let paymentData = {};
    if (contentType === "PAYMENT") {
      paymentData = {
        content_paymentData_amount: 500.84,
        content_paymentData_noticeNumber: generateNoticeNumber(),
        content_paymentData_invalidAfterDueDate: false,
        content_paymentData_payeeFiscalCode: generatePayeeFiscalCode(),
        content_paymentData_dueDate: "2999-06-10",
      };
    }
  
    return {
      ...paymentData,
      id: generateMessageId(),
      operation: "CREATE",
      senderServiceId: "Reminder",
      senderUserId: "Reminder",
      timeToLiveSeconds: 100,
      isPending: false,
      content_subject: "subject",
      content_type: generateContentType(),
      fiscal_code: generateFakeFiscalCode(),
    };
  };
  
  export const generateRandomPayment = () => {
    const payeeFiscalCode = generatePayeeFiscalCode();
    const debtorFiscalCode = generateFakeFiscalCode();
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
    payeeFiscalCode,
    noticeNumber,
    debtorFiscalCode
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