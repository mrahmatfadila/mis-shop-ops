// Stub minimal `next/server` untuk unit test helper di Node murni (tanpa build).
// Hanya dipakai oleh tests/api-helpers.test.mjs via loader resolve hook.
export const NextResponse = {
  json(body, init = {}) {
    return {
      __stub: true,
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    };
  },
};

export default { NextResponse };
