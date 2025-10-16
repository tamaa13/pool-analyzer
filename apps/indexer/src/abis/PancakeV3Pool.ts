export const pancakeV3PoolAbi = [
  {
    type: "event",
    name: "Initialize",
    inputs: [
      {
        indexed: false,
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tick",
        type: "int24"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Mint",
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tickLower",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tickUpper",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Burn",
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tickLower",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tickUpper",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Collect",
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tickLower",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tickUpper",
        type: "int24"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount0",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount1",
        type: "uint128"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "CollectProtocol",
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount0",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "amount1",
        type: "uint128"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Flash",
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "paid0",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "paid1",
        type: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Swap",
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address"
      },
      {
        indexed: false,
        internalType: "int256",
        name: "amount0",
        type: "int256"
      },
      {
        indexed: false,
        internalType: "int256",
        name: "amount1",
        type: "int256"
      },
      {
        indexed: false,
        internalType: "uint160",
        name: "sqrtPriceX96",
        type: "uint160"
      },
      {
        indexed: false,
        internalType: "uint128",
        name: "liquidity",
        type: "uint128"
      },
      {
        indexed: false,
        internalType: "int24",
        name: "tick",
        type: "int24"
      }
    ],
    anonymous: false
  },
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "int24", name: "tick", type: "int24" },
      { internalType: "uint16", name: "observationIndex", type: "uint16" },
      { internalType: "uint16", name: "observationCardinality", type: "uint16" },
      {
        internalType: "uint16",
        name: "observationCardinalityNext",
        type: "uint16"
      },
      { internalType: "uint8", name: "feeProtocol", type: "uint8" },
      { internalType: "bool", name: "unlocked", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "liquidity",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "fee",
    outputs: [{ internalType: "uint24", name: "", type: "uint24" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "tickSpacing",
    outputs: [{ internalType: "int24", name: "", type: "int24" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

export type PancakeV3PoolAbi = typeof pancakeV3PoolAbi;
