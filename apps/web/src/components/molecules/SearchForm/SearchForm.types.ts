import type { FormEvent } from "react";
import type { TokenSearchResult } from "@shared/index";

export type SearchFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSuggestionSelect: (suggestion: TokenSearchResult) => void;
  suggestions: TokenSearchResult[];
  suggestionsLoading: boolean;
  loading: boolean;
};
