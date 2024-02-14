import { DurableObjectId, DurableObjectStorage } from "@cloudflare/workers-types/experimental";

declare global {
	function getMiniflareBindings(): Bindings;
	function getMiniflareDurableObjectStorage(
		id: DurableObjectId
	): Promise<DurableObjectStorage>;
}

export { };
