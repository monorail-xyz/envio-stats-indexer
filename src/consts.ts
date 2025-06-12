import { ethers } from "ethers";

// Router Addresses (lowercase for matching)
export const ROUTER_ADDRESSES: {
    [key: string]: { type: string; name: string; };
} = {
    // V2
    "0xfb8e1c3b833f9e67a71c859a132cf783b645e436": { type: "v2", name: "uniswap-v2" },
    "0xcba6b9a951749b8735c603e7ffc5151849248772": { type: "v2", name: "pancakeswap-deprecated-v2" },
    "0x3a3ebae0eec80852fbc7b9e824c6756969cc8dc1": { type: "v2", name: "pancakeswap-v2" },
    "0x006e8e1eaf72eec070a136e0c315fb554dbee55b": { type: "v2", name: "taya-v2" },
    "0x64aff7245ebdaaecaf266852139c67e4d8dba4de": { type: "v2", name: "madness-v2" },
    "0xca810d095e90daae6e867c19df6d9a8c56db2c89": { type: "v2", name: "bean-v2" },
    "0x619d07287e87c9c643c60882ca80d23c8ed44652": { type: "v2", name: "nadfun-v2" },
    "0x18556da13313f3532c54711497a8fedac273220e": { type: "lfj-v1", name: "lfj-v1" },
    "0xc7e09b556e1a00cfc40b1039d6615f8423136df7": { type: "v2", name: "atlantis-v2" },
    "0xb6091233aacacba45225a2b2121bbac807af4255": { type: "v2", name: "octoswap-v2" },
    "0xc80585f78a6e44fb46e1445006f820448840386e": { type: "v2", name: "monda-v2" },
    "0x3be99db246c81df2bd8dc0d708e03f64e1a84917": { type: "v2", name: "zkswap-v2" },

    // V3
    "0xabd915749969ae370cfd5421457f41f9dea8b882": { type: "v3", name: "uniswap-v3" },
    "0x46cf505b6ab4aea209480029c9492cb8014cc6a2": { type: "v3", name: "pancakeswap-v3" },
    "0x911418378663b093a81e4b84ca5bb0b910816935": { type: "v3", name: "zkswap-v3" },

    // Orderbooks
    "0xc816865f172d640d93712c68a7e1f83f3fa63235": { type: "kuru", name: "kuru-ob" },
    "0x4e77071d619aa164ca6427547aefa41ac51be7a0": { type: "crystal", name: "crystal-ob" },

    // Wrappers
    "0x760afe86e5de5fa0ee542fc7b7b713e1c5425701": { type: "wrapper", name: "monad-wrapper" },

};


// Function selectors
export const SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR = "0x38ed1739"; // swapExactTokensForTokens function selector
export const LFJ_SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR = "0x2a443fae"; // swapExactTokensForTokens function selector
export const EXACT_INPUT_SINGLE_SELECTOR = "0x414bf389"; // exactInputSingle function selector
export const DEPOSIT_SELECTOR = "0xd0e30db0"; // WETH deposit function selector
export const WITHDRAW_SELECTOR = "0x2e1a7d4d"; // WETH withdraw function selector
export const KURU_SWAP_SELECTOR = "0xffa5210a"; // Kuru swap function selector
export const CRYSTAL_SWAP_SELECTOR = "0x05a1450d"; // Crystal swap function selector

// Interface definitions for decoding
export const aggregateInterface = new ethers.Interface([
    "function aggregate(address,address,uint256,address[],bytes[],address,uint256,uint256)"
]);

export const swapV2Interface = new ethers.Interface([
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
]);

export const swapLFJInterface = new ethers.Interface([
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, (uint256[],uint8[],address[]) path, address to, uint256 deadline) returns (uint256)",
]);

export const swapV3Interface = new ethers.Interface([
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256)",
]);

export const wrapperInterface = new ethers.Interface([
    "function deposit()",
    "function withdraw(uint256 amount)"
]);

export const kuruInterface = new ethers.Interface([
    "function anyToAnySwap(address[] pools, bool[] isBuy, bool[] isNativeSend, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)"
]);

export const crystalInterface = new ethers.Interface([
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline, address referrer) returns (uint256[] amounts)",
]);

// Native token address (for ETH/native chain token handling)
export const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

// Wrapped native token addresses for common chains
export const WRAPPED_NATIVE_TOKENS = {
    // Optimism
    10143: "0x760afe86e5de5fa0ee542fc7b7b713e1c5425701"
};