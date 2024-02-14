import { vi, describe, it, expect } from "vitest";
import worker from "./index";
import { Env } from "./common";

describe("GET", () => {
	it("gets a file", async () => {
		const env: Env = getMiniflareBindings();
		const response = await worker.fetch(new Request("https://example.com/a"), env, {
			waitUntil: vi.fn(),
			passThroughOnException: vi.fn()
		});
	});
});
