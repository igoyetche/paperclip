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

export class UrlListParseError {
  readonly kind = "url_list_parse" as const;
  constructor(
    readonly lineNumber: number,
    readonly message: string,
  ) {}
}

export class FetchError {
  readonly kind: "http" | "network" | "timeout" | "content_type";

  constructor(
    kind: "http" | "network" | "timeout" | "content_type",
    readonly detail?: string | number,
  ) {
    this.kind = kind;
  }
}

export type DomainError = ExtractionError | ConversionError | UrlListParseError | FetchError;
