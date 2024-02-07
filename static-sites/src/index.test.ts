import { vi, describe, it, expect } from "vitest";
import worker, { Env, normalizePathname } from "./index";

describe("GET", () => {
	it("gets a file", async () => {
		const env: Env = getMiniflareBindings();
		const response = await worker.fetch(new Request("https://api-keys.example.com/a"), env, {
			waitUntil: vi.fn(),
			passThroughOnException: vi.fn()
		});
	});
});

describe("normalizePathname", () => {
	it("works", () => {
		expect(normalizePathname("")).toBe("/index.html");
		expect(normalizePathname("/")).toBe("/index.html");
		expect(normalizePathname("/a")).toBe("/a/index.html");
		expect(normalizePathname("/a/")).toBe("/a/index.html");
		expect(normalizePathname("/a.css")).toBe("/a.css");
		expect(normalizePathname("a.css")).toBe("/a.css");
		expect(normalizePathname("/a.css/")).toBe("/a.css/index.html");
		expect(normalizePathname("/b/a.css")).toBe("/b/a.css");
		expect(normalizePathname("/b/a.")).toBe("/b/a.");
		expect(normalizePathname("/b/a")).toBe("/b/a/index.html");
		expect(normalizePathname("/b/a/")).toBe("/b/a/index.html");
		expect(normalizePathname("b/a/")).toBe("/b/a/index.html");
	});
});
