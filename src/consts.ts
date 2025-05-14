import { ethers } from "ethers";

// Router Addresses (lowercase for matching)
export const ROUTER_ADDRESSES: {
    [key: string]: { type: string; name: string; };
} = {
    "0xfb8e1c3b833f9e67a71c859a132cf783b645e436": { type: "v2", name: "Uniswap V2" },
    "0xCba6b9A951749B8735C603e7fFC5151849248772": { type: "v2", name: "PancakeSwap V2 Deprecated" },
    "0x3a3eBAe0Eec80852FBC7B9E824C6756969cc8dc1": { type: "v2", name: "PancakeSwap V2" },
    "0x006E8E1eAf72eEC070A136e0C315FB554dBeE55B": { type: "v2", name: "Taya V2" },
    "0x64Aff7245EbdAAECAf266852139c67E4D8DBa4de": { type: "v2", name: "Madness V2" },
    "0xCa810D095e90Daae6e867c19DF6D9A8C56db2c89": { type: "v2", name: "Bean V2" },
    "0x619d07287e87C9c643C60882cA80d23C8ed44652": { type: "v2", name: "Nad.fun V2" },
    "0x18556DA13313f3532c54711497A8FedAC273220E": { type: "v2", name: "LFJ V1" },
    "0xc7E09B556E1a00cfc40b1039D6615f8423136Df7": { type: "v2", name: "Atlantis V2" },
    "0xb6091233aAcACbA45225a2B2121BBaC807aF4255": { type: "v2", name: "OctoSwap V2" },
    "0xc80585f78A6e44fb46e1445006f820448840386e": { type: "v2", name: "Monda V2" },
    "0x3be99db246c81df2bd8dc0d708e03f64e1a84917": { type: "v2", name: "zkSwap V2" },

    // TODO
    // "0xc816865f172d640d93712c68a7e1f83f3fa63235": { type: "v2", name: "KURU_ROUTER_ADDRESS" },

    "0xaBD915749969aE370CFD5421457F41F9dEA8b882": { type: "v3", name: "Uniswap V2" },
    "0x46cf505b6ab4aea209480029c9492cb8014cc6a2": { type: "v3", name: "PancakeSwap V3" },
    "0x911418378663b093a81E4B84Ca5bb0b910816935": { type: "v3", name: "zkSwap V3" },

};


// Function selectors
export const SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR = "0x38ed1739"; // swapExactTokensForTokens function selector
export const EXACT_INPUT_SINGLE_SELECTOR = "0x414bf389"; // exactInputSingle function selector

// Interface definitions for decoding
export const aggregateInterface = new ethers.Interface([
    "function aggregate(address,address,uint256,address[],bytes[],address,uint256,uint256)"
]);

export const swapV2Interface = new ethers.Interface([
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMin, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)"
]);

// Helper interfaces for additional swap methods
export const additionalSwapInterfaces = {
    swapETHForExactTokens: new ethers.Interface([
        "function swapETHForExactTokens(uint256 amountOut, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)"
    ]),
    swapExactETHForTokens: new ethers.Interface([
        "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)"
    ]),
    swapTokensForExactETH: new ethers.Interface([
        "function swapTokensForExactETH(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline) returns (uint256[] amounts)"
    ]),
    swapExactTokensForETH: new ethers.Interface([
        "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)"
    ])
};

// V3 additional methods
export const v3SwapInterfaces = {
    exactInput: new ethers.Interface([
        "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMin)) external returns (uint256 amountOut)"
    ])
};

// Native token address (for ETH/native chain token handling)
export const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Wrapped native token addresses for common chains
export const WRAPPED_NATIVE_TOKENS = {
    // Optimism
    10143: "0x4200000000000000000000000000000000000006"
};