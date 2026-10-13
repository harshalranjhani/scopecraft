import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { makeServer } from "../server/app";
const input = {
  clientName: "Acme",
  projectName: "Website",
  brief:
    "A new three page website for our bakery with a menu, contact form and an about page. We have a logo but need copy.",
  hourlyRate: 85,
  currency: "USD",
  bufferPercent: 15,
};
async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
test("API validates input, authenticates, and reports real inference failures", async () => {
  const server = makeServer({
    aiBaseUrl: "http://127.0.0.1:1",
    model: "qwen",
    token: "secret",
  });
  const url = await listen(server);
  try {
    const send = (value: unknown, token?: string, origin?: string) =>
      fetch(url + "/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(origin ? { Origin: origin } : {}),
        },
        body: JSON.stringify(value),
      });
    assert.equal((await send(input)).status, 401);
    assert.equal(
      (await send(input, "secret", "https://evil.example")).status,
      403,
    );
    assert.equal((await send(input, "secret", "not-an-origin")).status, 403);
    assert.equal((await send({}, "secret")).status, 400);
    assert.equal((await send(input, "secret")).status, 503);
    assert.equal(
      (await (await fetch(url + "/api/health")).json()).available,
      false,
    );
  } finally {
    await close(server);
  }
});
test("API returns a validated successful scope and strips thinking blocks", async () => {
  const scope = {
    summary: "Build a focused bakery website.",
    deliverables: [
      { title: "Website", description: "Three responsive pages.", hours: 20 },
    ],
    exclusions: ["Online ordering."],
    questions: ["Who supplies the copy?"],
    risks: [
      {
        severity: "medium",
        title: "Content",
        detail: "The copy is not ready.",
      },
    ],
  };
  const model = createServer(async (req, res) => {
    for await (const _ of req) {
      /* Consume the request. */
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                "<think>private reasoning</think>" + JSON.stringify(scope),
            },
          },
        ],
        usage: { completion_tokens: 100 },
      }),
    );
  });
  const modelUrl = await listen(model);
  const server = makeServer({ aiBaseUrl: modelUrl, model: "qwen" });
  const url = await listen(server);
  try {
    const response = await fetch(url + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.scope, scope);
    assert.equal(result.model, "qwen");
    assert.equal(result.outputTokens, 100);
  } finally {
    await close(server);
    await close(model);
  }
});
test("API sends schema-constrained requests, validates output, and limits concurrency", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let called!: () => void;
  const entered = new Promise<void>((resolve) => {
    called = resolve;
  });
  const model = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const payload = JSON.parse(text);
    assert.equal(payload.response_format.type, "json_schema");
    called();
    await gate;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ choices: [{ message: { content: "{}" } }] }));
  });
  const modelUrl = await listen(model);
  const server = makeServer({ aiBaseUrl: modelUrl, model: "qwen" });
  const url = await listen(server);
  try {
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    };
    const first = fetch(url + "/api/generate", options);
    await entered;
    assert.equal((await fetch(url + "/api/generate", options)).status, 429);
    release();
    assert.equal((await first).status, 502);
  } finally {
    release();
    await close(server);
    await close(model);
  }
});
