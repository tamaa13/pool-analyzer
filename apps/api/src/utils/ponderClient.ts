import fetch from "node-fetch";
import env from "../env";

interface GraphError {
  message: string;
}

interface GraphResponse<T> {
  data?: T;
  errors?: GraphError[];
}

export class PonderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PonderError";
  }
}

export const ponderRequest = async <T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> => {
  if (!env.subgraphUrl) {
    throw new PonderError("SUBGRAPH_URL is not configured.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (env.subgraphAuthHeader && env.subgraphAuthToken) {
    headers[env.subgraphAuthHeader] = env.subgraphAuthToken;
  }

  const response = await fetch(env.subgraphUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new PonderError(
      `Subgraph request failed (${response.status} ${response.statusText})`
    );
  }

  const payload = (await response.json()) as GraphResponse<T>;

  if (payload.errors?.length) {
    throw new PonderError(payload.errors.map((err) => err.message).join(", "));
  }

  if (!payload.data) {
    throw new PonderError("Subgraph response is missing data.");
  }

  return payload.data;
};
