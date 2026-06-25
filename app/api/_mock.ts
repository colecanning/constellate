/**
 * Helpers shared by the mock API route handlers.
 *
 * IMPORTANT: these routes are an ILLUSTRATIVE backend contract, not the live source of
 * truth. Each request rebuilds the deterministic seed and runs the same pure engine the
 * client store uses — so the response SHAPE is real, but there is no persistence (the
 * client-side Zustand store holds the live demo state). See CLAUDE.md.
 */

const MOCK_NOTE =
  "Illustrative mock — rebuilt from seed each request; the client Zustand store is authoritative.";

export function mockJson(data: Record<string, unknown>, init?: { status?: number }) {
  return Response.json(
    { ...data, _mock: MOCK_NOTE },
    {
      status: init?.status ?? 200,
      headers: { "x-constellate-mock": "true" },
    },
  );
}
