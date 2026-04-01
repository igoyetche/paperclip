export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export class ExtractionError {
  readonly kind = "extraction" as const;
  constructor(readonly message: string) {}
}

export class ConversionError {
  readonly kind = "conversion" as const;
  constructor(readonly message: string) {}
}

export type DomainError = ExtractionError | ConversionError;
