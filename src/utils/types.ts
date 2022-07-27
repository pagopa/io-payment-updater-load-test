import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

export const ApiPaymentMessageResponse = t.interface({
  messageId: NonEmptyString,
  paid: t.boolean,
});

export type ApiPaymentMessageResponse = t.TypeOf<
  typeof ApiPaymentMessageResponse
>;
