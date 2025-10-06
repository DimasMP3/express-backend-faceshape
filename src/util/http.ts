export function ok<T>(data: T) {
  return { ok: true, ...((typeof data === "object" && data) || { data }) };
}
export function fail(message: string, code = 400) {
  return { ok: false, code, error: message };
}
