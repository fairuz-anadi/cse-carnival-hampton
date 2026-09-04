import type { IncomingMessage, ServerResponse } from "node:http";

type Next = () => void;

export function createApiMiddleware(): (req: IncomingMessage, res: ServerResponse, next?: Next) => Promise<void>;
