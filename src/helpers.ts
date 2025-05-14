import { ethers } from "ethers";
import {
    ROUTER_ADDRESSES,
    SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR,
    EXACT_INPUT_SINGLE_SELECTOR,
    aggregateInterface,
    swapV2Interface,
    additionalSwapInterfaces,
    v3SwapInterfaces
} from "./consts";

/**
 * Decodes the aggregate function input
 */
// export function decodeAggregateInput(input: string): { targets: string[], callDatas: string[]; } | null {
//     try {
//         const decodedCall = aggregateInterface.decodeFunctionData("aggregate", input);
//         return {
//             targets: decodedCall.targets as string[],
//             callDatas: decodedCall.data as string[]
//         };
//     } catch (error) {
//         console.error(`Error decoding aggregate input: ${(error as Error).message}`);
//         return null;
//     }
// }

export function decodeAggregateInput(inputHexWithSelector: string) {
    // 1. Define the ABI for the function
    const aggregateFunctionAbiFragment = { // Only the relevant function fragment
        "type": "function",
        "name": "aggregate",
        "inputs": [
            { "name": "tokenAddress", "type": "address" },
            { "name": "outTokenAddress", "type": "address" },
            { "name": "amount", "type": "uint256" },
            { "name": "targets", "type": "address[]" },
            { "name": "data", "type": "bytes[]" },
            { "name": "destination", "type": "address" },
            { "name": "minOutAmount", "type": "uint256" },
            { "name": "deadline", "type": "uint256" }
        ]
        // outputs and stateMutability are not strictly needed for input decoding here
    };

    // 2. Create an Interface instance
    const iface = new ethers.Interface([aggregateFunctionAbiFragment]);

    // 3. The inputHex already contains the function selector.
    //    The `parseTransaction` method can handle this, or `decodeFunctionData` if you pass the name/selector.
    try {
        // `inputHexWithSelector` is your full transaction input data string (e.g., "0xb0c76125...")
        const decodedParams = iface.decodeFunctionData("aggregate", inputHexWithSelector);

        // decodedParams will be an array-like object (Result object in ethers v5)
        // matching the order of inputs in the ABI.
        // You can access them by index or by name if the ABI includes names.

        const result = {
            tokenAddress: decodedParams.tokenAddress, // Or decodedParams[0]
            outTokenAddress: decodedParams.outTokenAddress, // Or decodedParams[1]
            amount: decodedParams.amount,           // Or decodedParams[2] (will be a BigNumber)
            targets: decodedParams.targets,         // Or decodedParams[3] (will be an array of addresses)
            callDatas: decodedParams.data,          // Or decodedParams[4] (will be an array of hex strings for bytes)
            destination: decodedParams.destination,   // Or decodedParams[5]
            minOutAmount: decodedParams.minOutAmount, // Or decodedParams[6] (BigNumber)
            deadline: decodedParams.deadline        // Or decodedParams[7] (BigNumber)
        };

        console.log("Decoded with ethers:", result);

        // Example: Accessing the first target and its corresponding calldata
        if (result.targets.length > 0) {
            console.log("First target:", result.targets[0]);
            console.log("First calldata:", result.callDatas[0]);
        }

        return result;

    } catch (error) {
        console.error("Error decoding with ethers:", error);
        return null;
    }
}


/**
 * Attempts to decode swap data from calldata based on router type
 */
export function decodeSwapData(routerAddress: string, callData: string): {
    success: boolean;
    tokenInAddress?: string;
    tokenOutAddress?: string;
    amountIn?: bigint;
} {
    const result = {
        success: false,
        tokenInAddress: "",
        tokenOutAddress: "",
        amountIn: BigInt(0)
    };

    if (!callData || callData.length < 10) {
        return result;
    }

    const functionSelector = callData.substring(0, 10);
    const routerInfo = ROUTER_ADDRESSES[routerAddress.toLowerCase()];

    if (!routerInfo) {
        return result;
    }

    try {
        // Handle V2 style swaps
        if (routerInfo.type === "v2") {
            if (functionSelector === SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR) {
                const decoded = swapV2Interface.decodeFunctionData("swapExactTokensForTokens", callData);
                if (decoded.path && decoded.path.length > 0) {
                    result.tokenInAddress = ethers.getAddress(decoded.path[0]);
                    result.amountIn = BigInt(decoded.amountIn.toString());

                    if (decoded.path.length > 1) {
                        result.tokenOutAddress = ethers.getAddress(decoded.path[decoded.path.length - 1]);
                    }

                    result.success = true;
                }
            }
            // Handle swapExactETHForTokens
            else if (functionSelector === "0x7ff36ab5") {
                const decoded = additionalSwapInterfaces.swapExactETHForTokens.decodeFunctionData("swapExactETHForTokens", callData);
                if (decoded.path && decoded.path.length > 0) {
                    // For ETH input, we use a standard placeholder address
                    result.tokenInAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // ETH placeholder
                    // Amount is taken from transaction value

                    if (decoded.path.length > 0) {
                        result.tokenOutAddress = ethers.getAddress(decoded.path[decoded.path.length - 1]);
                    }

                    result.success = true;
                }
            }
            // Add more decoders for other V2 methods as needed
        }
        // Handle V3 style swaps
        else if (routerInfo.type === "v3") {
            if (functionSelector === EXACT_INPUT_SINGLE_SELECTOR) {
                const decoded = swapV2Interface.decodeFunctionData("exactInputSingle", callData);
                result.tokenInAddress = ethers.getAddress(decoded.params.tokenIn);
                result.tokenOutAddress = ethers.getAddress(decoded.params.tokenOut);
                result.amountIn = BigInt(decoded.params.amountIn.toString());
                result.success = true;
            }
            // Add more decoders for other V3 methods as needed
        }
    } catch (error) {
        console.error(`Error decoding swap data for router ${routerAddress}: ${(error as Error).message}`);
    }

    return result;
}

/**
 * Process a swap and update all relevant entities
 */
export async function processSwap(
    context: any,
    txHash: string,
    blockNumber: bigint,
    timestamp: bigint,
    userAddress: string,
    routerAddress: string,
    routerName: string,
    tokenInAddress: string,
    tokenOutAddress: string | undefined,
    amountIn: bigint,
    logIndex: number,
    targetIndex: number
) {
    // Create swap event record
    const swapEventId = `${txHash}-${logIndex}-${targetIndex}`;
    const swapEvent = {
        id: swapEventId,
        transactionHash: txHash,
        blockNumber: blockNumber,
        timestamp: timestamp,
        userAddress: userAddress,
        exchangeAddress: routerAddress,
        exchangeName: routerName,
        tokenInAddress: tokenInAddress,
        tokenOutAddress: tokenOutAddress || "",
        amountIn: amountIn,
        amountOut: BigInt(0), // Not available at this point
        fee: BigInt(0)        // Not available at this point
    };

    await context.SwapEvent.set(swapEvent);

    // 1. Update Global Stats
    await updateGlobalStats(context, amountIn);

    // 2. Update Token Stats
    await updateTokenStats(context, "in", tokenInAddress, amountIn);

    // 3. Update Exchange Stats
    await updateExchangeStats(context, routerAddress, routerName, amountIn);

    // 4. Update User Stats
    await updateUserStats(context, userAddress, amountIn);

    // 5. Update Exchange-Token Stats
    await updateExchangeTokenStats(context, routerAddress, tokenInAddress, amountIn);

    // 6. Update User-Token Stats
    await updateUserTokenStats(context, userAddress, tokenInAddress, amountIn);

    // 7. Update User-Exchange Stats
    await updateUserExchangeStats(context, userAddress, routerAddress, amountIn);

    // 8. Update User-Token-Exchange Stats
    await updateUserTokenExchangeStats(context, userAddress, tokenInAddress, routerAddress, amountIn);
}

/**
 * Update Global Stats
 */
async function updateGlobalStats(context: any, amount: bigint) {
    let globalStats = await context.GlobalStats.get("global");

    if (!globalStats) {
        globalStats = {
            id: "global",
            // totalVolumeIn: BigInt(0),
            // totalVolumeOut: BigInt(0),
            // totalFees: BigInt(0),
            totalTransactionCount: BigInt(0),
            lastUpdatedTimestamp: BigInt(0)
        };
    }

    // globalStats.totalVolumeIn = globalStats.totalVolumeIn + amount;
    globalStats.totalTransactionCount = globalStats.totalTransactionCount + BigInt(1);
    globalStats.lastUpdatedTimestamp = BigInt(Math.floor(Date.now() / 1000));

    await context.GlobalStats.set(globalStats);
}

/**
 * Update Token Stats
 */
async function updateTokenStats(context: any, direction: string, tokenAddress: string, amount: bigint) {
    let token = await context.Token.get(tokenAddress);

    if (!token) {
        token = {
            id: tokenAddress,
            address: tokenAddress,
            volumeIn: BigInt(0),
            volumeOut: BigInt(0),
            feesGenerated: BigInt(0),
            transactionCount: BigInt(0)
        };
    }

    if (direction === "in") {
        token.volumeIn = token.volumeIn + amount;
    } else if (direction === "out") {
        token.volumeOut = token.volumeOut + amount;
    }
    token.transactionCount = token.transactionCount + BigInt(1);

    await context.Token.set(token);
}

/**
 * Update Exchange Stats
 */
async function updateExchangeStats(context: any, exchangeAddress: string, exchangeName: string, amount: bigint) {
    let exchange = await context.Exchange.get(exchangeAddress);

    if (!exchange) {
        exchange = {
            id: exchangeAddress,
            address: exchangeAddress,
            name: exchangeName,
            totalVolume: BigInt(0),
            transactionCount: BigInt(0)
        };
    }

    exchange.totalVolume = exchange.totalVolume + amount;
    exchange.transactionCount = exchange.transactionCount + BigInt(1);

    await context.Exchange.set(exchange);
}

/**
 * Update User Stats
 */
async function updateUserStats(context: any, userAddress: string, amount: bigint) {
    let user = await context.User.get(userAddress);

    if (!user) {
        user = {
            id: userAddress,
            address: userAddress,
            totalVolumeTraded: BigInt(0),
            totalTransactionCount: BigInt(0)
        };
    }

    user.totalVolumeTraded = user.totalVolumeTraded + amount;
    user.totalTransactionCount = user.totalTransactionCount + BigInt(1);

    await context.User.set(user);
}

/**
 * Update Exchange-Token Stats
 */
async function updateExchangeTokenStats(context: any, exchangeAddress: string, tokenAddress: string, amount: bigint) {
    const id = `${exchangeAddress}-${tokenAddress}`;
    let stats = await context.ExchangeTokenStat.get(id);

    if (!stats) {
        stats = {
            id: id,
            exchangeId: exchangeAddress,
            tokenId: tokenAddress,
            volumeIn: BigInt(0),
            transactionCount: BigInt(0)
        };
    }

    stats.volumeIn = stats.volumeIn + amount;
    stats.transactionCount = stats.transactionCount + BigInt(1);

    await context.ExchangeTokenStat.set(stats);
}

/**
 * Update User-Token Stats
 */
async function updateUserTokenStats(context: any, userAddress: string, tokenAddress: string, amount: bigint) {
    const id = `${userAddress}-${tokenAddress}`;
    let stats = await context.UserTokenStat.get(id);

    if (!stats) {
        stats = {
            id: id,
            userId: userAddress,
            tokenId: tokenAddress,
            volumeTraded: BigInt(0),
            transactionCount: BigInt(0)
        };
    }

    stats.volumeTraded = stats.volumeTraded + amount;
    stats.transactionCount = stats.transactionCount + BigInt(1);

    await context.UserTokenStat.set(stats);
}

/**
 * Update User-Exchange Stats
 */
async function updateUserExchangeStats(context: any, userAddress: string, exchangeAddress: string, amount: bigint) {
    const id = `${userAddress}-${exchangeAddress}`;
    let stats = await context.UserExchangeStat.get(id);

    if (!stats) {
        stats = {
            id: id,
            userId: userAddress,
            exchangeId: exchangeAddress,
            volumeTraded: BigInt(0),
            transactionCount: BigInt(0)
        };
    }

    stats.volumeTraded = stats.volumeTraded + amount;
    stats.transactionCount = stats.transactionCount + BigInt(1);

    await context.UserExchangeStat.set(stats);
}

/**
 * Update User-Token-Exchange Stats
 */
async function updateUserTokenExchangeStats(
    context: any,
    userAddress: string,
    tokenAddress: string,
    exchangeAddress: string,
    amount: bigint
) {
    const id = `${userAddress}-${tokenAddress}-${exchangeAddress}`;
    let stats = await context.UserTokenExchangeStat.get(id);

    if (!stats) {
        stats = {
            id: id,
            userId: userAddress,
            tokenId: tokenAddress,
            exchangeId: exchangeAddress,
            volumeTraded: BigInt(0),
            transactionCount: BigInt(0)
        };
    }

    stats.volumeTraded = stats.volumeTraded + amount;
    stats.transactionCount = stats.transactionCount + BigInt(1);

    await context.UserTokenExchangeStat.set(stats);
}