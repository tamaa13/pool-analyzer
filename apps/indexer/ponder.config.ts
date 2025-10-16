import { createConfig } from "@ponder/core";
import { http } from "viem";
import { pancakeV3FactoryAbi } from "./src/abis/PancakeV3Factory";
import { pancakeV3PoolAbi } from "./src/abis/PancakeV3Pool";

const DEFAULT_FACTORY =
  "0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865" as const;

const normalizeAddress = (value?: string): `0x${string}` =>
  (value ? value.toLowerCase() : DEFAULT_FACTORY) as `0x${string}`;

const PANCAKE_FACTORY = normalizeAddress(process.env.PANCAKE_V3_FACTORY);
const POOL_CREATED_EVENT = pancakeV3FactoryAbi.find(
  (item) => item.type === "event" && item.name === "PoolCreated"
) as (typeof pancakeV3FactoryAbi)[number] & { type: "event" } | undefined;

if (!POOL_CREATED_EVENT) {
  throw new Error("PoolCreated event not found in PancakeV3Factory ABI");
}

export default createConfig({
  database: process.env.PONDER_DATABASE_URL
    ? {
        kind: "postgres",
        connectionString: process.env.PONDER_DATABASE_URL
      }
    : {
        kind: "pglite",
        directory: ".ponder/pglite"
      },
  networks: {
    bsc: {
      chainId: 56,
      transport: http(
        (process.env.PONDER_RPC_URL ?? process.env.RPC_URL_BSC ?? "").trim()
      )
    }
  },
  contracts: {
    pancakeFactory: {
      abi: pancakeV3FactoryAbi,
      address: PANCAKE_FACTORY,
      network: "bsc",
      startBlock: Number(process.env.PONDER_START_BLOCK ?? 51961304)
    },
    pancakePool: {
      abi: pancakeV3PoolAbi,
      network: "bsc",
      factory: {
        address: PANCAKE_FACTORY,
        event: POOL_CREATED_EVENT,
        parameter: "pool"
      },
      startBlock: Number(process.env.PONDER_START_BLOCK ?? 51961304)
    }
  }
});
