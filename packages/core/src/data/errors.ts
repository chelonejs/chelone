/**
 * Thrown/rejected by DataProvider mutations when the server rejects on
 * validation. `fieldErrors` maps field source paths to messages — P5 maps
 * this onto form state. Framework-free by design.
 */
export class ValidationError extends Error {
  override readonly name = "ValidationError";
  readonly fieldErrors: Record<string, string | string[]>;

  constructor(message: string, fieldErrors: Record<string, string | string[]>) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}
