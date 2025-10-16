import { TokenSearchResult } from "@shared/index";
import { ponderRequest } from "../utils/ponderClient";

const TOKEN_SEARCH_QUERY = `
  query TokenSearch($symbolQuery: String!, $nameQuery: String!, $limit: Int!) {
    bySymbol: tokens(
      where: { symbol_contains_nocase: $symbolQuery }
      first: $limit
    ) {
      id
      symbol
      name
      decimals
    }
    byName: tokens(
      where: { name_contains_nocase: $nameQuery }
      first: $limit
    ) {
      id
      symbol
      name
      decimals
    }
  }
`;

const TOKEN_BY_ADDRESS_QUERY = `
  query TokenByAddress($id: ID!) {
    token(id: $id) {
      id
      symbol
      name
      decimals
    }
  }
`;

const POOL_BY_ID_QUERY = `
  query PoolById($id: ID!) {
    pool(id: $id) {
      id
      totalValueLockedUSD
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
    }
  }
`;

type GraphToken = {
  id: string;
  symbol: string | null;
  name: string | null;
  decimals: string | number | null;
};

type TokenSearchResponse = {
  bySymbol: GraphToken[];
  byName: GraphToken[];
};

type TokenByAddressResponse = {
  token: GraphToken | null;
};

type PoolByIdResponse = {
  pool: {
    id: string;
    totalValueLockedUSD?: string | null;
    token0: GraphToken;
    token1: GraphToken;
  } | null;
};

const mapToken = (token: GraphToken): TokenSearchResult => ({
  address: token.id.toLowerCase(),
  symbol: token.symbol ?? "UNKNOWN",
  name: token.name ?? token.symbol ?? "Unknown Token",
  decimals: Number(token.decimals ?? 18) || 18
});

const mapPoolToSearchResult = (
  pool: NonNullable<PoolByIdResponse["pool"]>
): TokenSearchResult => {
  const token0 = mapToken(pool.token0);
  const token1 = mapToken(pool.token1);
  const pairLabel = `${token0.symbol}/${token1.symbol}`;

  return {
    address: pool.id.toLowerCase(),
    symbol: `POOL ${pairLabel}`,
    name: `Liquidity Pool ${pairLabel}`,
    decimals: 18,
    liquidityUsd: Number(pool.totalValueLockedUSD ?? 0) || undefined
  };
};

export const searchTokens = async (
  query: string,
  limit = 10
): Promise<TokenSearchResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("0x") && trimmed.length === 42) {
    const data = await ponderRequest<TokenByAddressResponse>(
      TOKEN_BY_ADDRESS_QUERY,
      {
        id: trimmed.toLowerCase()
      }
    );

    if (data.token) {
      return [mapToken(data.token)];
    }

    const poolData = await ponderRequest<PoolByIdResponse>(POOL_BY_ID_QUERY, {
      id: trimmed.toLowerCase()
    });

    return poolData.pool ? [mapPoolToSearchResult(poolData.pool)] : [];
  }

  const data = await ponderRequest<TokenSearchResponse>(TOKEN_SEARCH_QUERY, {
    symbolQuery: trimmed,
    nameQuery: trimmed,
    limit
  });

  const results = new Map<string, TokenSearchResult>();

  [...(data.bySymbol ?? []), ...(data.byName ?? [])].forEach((token) => {
    const mapped = mapToken(token);
    if (mapped.address) {
      results.set(mapped.address, mapped);
    }
  });

  return Array.from(results.values()).slice(0, limit);
};
