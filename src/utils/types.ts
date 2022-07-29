import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

export const ApiPaymentMessageResponse = t.interface({
  messageId: NonEmptyString,
  paid: t.boolean,
});

export type ApiPaymentMessageResponse = t.TypeOf<
  typeof ApiPaymentMessageResponse
>;

export const ApiSendMessageResponse = t.interface({
  id: NonEmptyString,
});

export type ApiSendMessageResponse = t.TypeOf<typeof ApiSendMessageResponse>;

export const ApiGetMessageResponse = t.interface({
  status: NonEmptyString,
  read_status: NonEmptyString,
  payment_status: NonEmptyString,
});

export type ApiGetMessageResponse = t.TypeOf<typeof ApiSendMessageResponse>;
