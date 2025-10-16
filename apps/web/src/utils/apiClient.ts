const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const buildUrl = (input: string) => {
  if (/^https?:\/\//u.test(input)) {
    return input;
  }

  if (input.startsWith("/")) {
    return `${API_BASE_URL}${input}`;
  }

  return `${API_BASE_URL}/${input}`;
};

export type ApiFetchOptions = RequestInit;

export const apiFetch = (input: string, options?: ApiFetchOptions) =>
  fetch(buildUrl(input), options);

export { API_BASE_URL };
