// helpers.ts
import { ethers } from "ethers";
import {
    ROUTER_ADDRESSES,
    SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR,
    EXACT_INPUT_SINGLE_SELECTOR,
    swapV2Interface,
    DEPOSIT_SELECTOR,
    WITHDRAW_SELECTOR,
    wrapperInterface,
    KURU_SWAP_SELECTOR,
    kuruInterface,
    swapV3Interface,
    LFJ_SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR,
    swapLFJInterface,
    CRYSTAL_SWAP_SELECTOR,
    crystalInterface
} from "./consts";
import { Aggregate_Aggregation_event, AggregateV3_AggregatedTrade_event, DailyUserData, MonthlyUserData } from "../generated";

/**
 * Get the ISO 8601 week number for a given Date.
 * @param date The date to get the week number for.
 * @returns The ISO week number.
 */
export function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Sunday is 0, Monday is 1, etc. Make Sunday 7 for calculation.
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

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

        return result;

    } catch (error) {
        console.error("Error decoding with ethers:", error);
        return null;
    }
}


/**
 * Attempts to decode swap data from calldata based on router type
 */
export function decodeSwapData(routerAddress: string, callData: string, value: bigint): {
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
        }
        // Handle V3 style swaps
        else if (routerInfo.type === "v3") {
            if (functionSelector === EXACT_INPUT_SINGLE_SELECTOR) {
                const decoded = swapV3Interface.decodeFunctionData("exactInputSingle", callData);
                const params = decoded[0];
                result.tokenInAddress = ethers.getAddress(params[0]);
                result.tokenOutAddress = ethers.getAddress(params[1]);
                result.amountIn = params[5];
                result.success = true;
            }
            // Add more decoders for other V3 methods as needed
        }
        // Handle Kuru orderbook style swaps
        else if (routerInfo.type === "kuru") {
            if (functionSelector === KURU_SWAP_SELECTOR) {
                const decoded = kuruInterface.decodeFunctionData("anyToAnySwap", callData);
                result.tokenInAddress = ethers.getAddress(decoded[3]);
                result.tokenOutAddress = ethers.getAddress(decoded[4]);
                result.amountIn = decoded[5];
                result.success = true;
            }
            // Add more decoders for other Kuru methods as needed
        }
        if (routerInfo.type === "crystal") {
            if (functionSelector === CRYSTAL_SWAP_SELECTOR) {
                const decoded = crystalInterface.decodeFunctionData("swapExactTokensForTokens", callData);
                if (decoded.path && decoded.path.length > 0) {
                    result.tokenInAddress = ethers.getAddress(decoded.path[0]);
                    result.amountIn = BigInt(decoded.amountIn.toString());

                    if (decoded.path.length > 1) {
                        result.tokenOutAddress = ethers.getAddress(decoded.path[decoded.path.length - 1]);
                    }

                    result.success = true;
                }
            }
        }
        else if (routerInfo.type === "wrapper") {

            if (functionSelector === DEPOSIT_SELECTOR) {
                const decoded = wrapperInterface.decodeFunctionData("deposit", callData);
                // The decoded information holds nothing
                result.tokenInAddress = "0x0000000000000000000000000000000000000000";
                result.tokenOutAddress = ethers.getAddress("0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701");
                result.amountIn = value; // The value is the native amount in for deposits
                result.success = true;

            } else if (functionSelector === WITHDRAW_SELECTOR) {
                const decoded = wrapperInterface.decodeFunctionData("withdraw", callData);
                result.tokenInAddress = ethers.getAddress("0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701");
                result.tokenOutAddress = "0x0000000000000000000000000000000000000000";
                result.amountIn = BigInt(decoded[0]);
                result.success = true;
            }

            // Add more decoders for other wrapper methods as needed
        }
        else if (routerInfo.type === "lfj-v1") {

            if (functionSelector === LFJ_SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR) {
                const decoded = swapLFJInterface.decodeFunctionData("swapExactTokensForTokens", callData);
                const path = decoded[2];
                const route = path[2];

                result.tokenInAddress = ethers.getAddress(route[0]);;
                result.tokenOutAddress = ethers.getAddress(route[1]);
                result.amountIn = decoded[0]; // The value is the native amount in for deposits
                result.success = true;

            }
            // Add more decoders for other LFJ methods as needed
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
    event: Aggregate_Aggregation_event | AggregateV3_AggregatedTrade_event,
    targetIndex: number
) {

    const fee = (event.transaction.gasPrice || BigInt(0)) * BigInt(event.transaction.gas);

    // Create swap event record
    const swapEventId = `${txHash}-${event.logIndex}-${targetIndex}`;
    const swapEvent = {
        id: swapEventId,
        transactionHash: txHash,
        blockNumber: blockNumber,
        timestamp: timestamp,
        userAddress: userAddress.toLowerCase(),
        exchangeAddress: routerAddress.toLowerCase(),
        exchangeName: routerName,
        tokenInAddress: tokenInAddress.toLowerCase(),
        tokenOutAddress: tokenOutAddress || "",
        amountIn: amountIn,
        amountOut: BigInt(0), // Not available at this point
        fee: fee,
        gasPrice: event.transaction.gasPrice || BigInt(0),
        gasUsed: event.transaction.gas,
    };

    await context.SwapEvent.set(swapEvent);

    // 2. Update Token Stats
    await updateTokenStats(context, "in", tokenInAddress.toLowerCase(), amountIn);

    // 3. Update Exchange Stats
    await updateExchangeStats(context, routerAddress.toLowerCase(), routerName, amountIn);

    // 4. Update User Stats
    await updateUserStats(context, userAddress.toLowerCase(), amountIn, fee, event.transaction.gas);

    // 5. Update Exchange-Token Stats
    await updateExchangeTokenStats(context, routerAddress.toLowerCase(), tokenInAddress.toLowerCase(), amountIn);

    // 6. Update User-Token Stats
    await updateUserTokenStats(context, userAddress.toLowerCase(), tokenInAddress.toLowerCase(), amountIn);

    // 7. Update User-Exchange Stats
    await updateUserExchangeStats(context, userAddress.toLowerCase(), routerAddress.toLowerCase(), amountIn);

    // 8. Update User-Token-Exchange Stats
    await updateUserTokenExchangeStats(context, userAddress.toLowerCase(), tokenInAddress.toLowerCase(), routerAddress.toLowerCase(), amountIn);
}

/**
 * Update Global Stats
 */
export async function updateGlobalStats(context: any, globalStats: any, fee: bigint, gasUsed: bigint) {
    if (!globalStats) {
        globalStats = {
            id: "global",
            totalFee: BigInt(0),
            totalGasUsed: BigInt(0),
            totalTransactionCount: BigInt(0),
            totalUniqueUsers: BigInt(0),
            lastUpdatedTimestamp: BigInt(0)
        };
    }

    globalStats.totalTransactionCount = globalStats.totalTransactionCount + BigInt(1);
    globalStats.totalFee = globalStats.totalFee + fee;
    globalStats.totalGasUsed = globalStats.totalGasUsed + gasUsed;
    globalStats.lastUpdatedTimestamp = BigInt(Math.floor(Date.now() / 1000));

    await context.GlobalStats.set(globalStats);
}

export async function updateGlobalUserCount(context: any, userAddress?: string) {
    let globalStats = await context.GlobalStats.get("global");

    if (!globalStats) {
        globalStats = {
            id: "global",
            totalFee: BigInt(0),
            totalGasUsed: BigInt(0),
            totalTransactionCount: BigInt(0),
            totalUniqueUsers: BigInt(0),
            lastUpdatedTimestamp: BigInt(0)
        };
    }
    globalStats.lastUpdatedTimestamp = BigInt(Math.floor(Date.now() / 1000));

    if (userAddress) {
        let user = await context.User.get(userAddress);
        if (!user) {
            globalStats.totalUniqueUsers = (globalStats.totalUniqueUsers || BigInt(0)) + BigInt(1);
        }
    }

    await context.GlobalStats.set(globalStats);
}

export async function updateGlobalUserCountWithStats(context: any, globalStats: any, userAddress?: string) {
    if (!globalStats) {
        globalStats = {
            id: "global",
            totalFee: BigInt(0),
            totalGasUsed: BigInt(0),
            totalTransactionCount: BigInt(0),
            totalUniqueUsers: BigInt(0),
            lastUpdatedTimestamp: BigInt(0)
        };
    }
    globalStats.lastUpdatedTimestamp = BigInt(Math.floor(Date.now() / 1000));

    if (userAddress) {
        let user = await context.User.get(userAddress);
        if (!user) {
            globalStats.totalUniqueUsers = (globalStats.totalUniqueUsers || BigInt(0)) + BigInt(1);
        }
    }

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
    exchange.transactionCount = exchange.transactionCount + BigInt(1);

    await context.Exchange.set(exchange);
}

/**
 * Update User Stats
 */
async function updateUserStats(context: any, userAddress: string, amount: bigint, fee: bigint, gasUsed: bigint) {
    let user = await context.User.get(userAddress);

    if (!user) {
        user = {
            id: userAddress,
            address: userAddress,
            totalFee: BigInt(0),
            totalGasUsed: BigInt(0),
            totalVolumeTraded: BigInt(0),
            totalTransactionCount: BigInt(0)
        };
    }

    user.totalFee = user.totalFee + fee;
    user.totalGasUsed = user.totalGasUsed + gasUsed;
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


export async function updateTimeframeStats(userAddress: string, event: any, context: any) {
    if (userAddress) { // Proceed only if userAddress is available
        const blockTimestamp = Number(event.block.timestamp); // Unix timestamp in seconds
        const date = new Date(blockTimestamp * 1000); // Convert to milliseconds for Date object

        // Daily Stats
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth(); // 0-indexed
        const day = date.getUTCDate();
        const dayId = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        let dailyData: DailyUserData | undefined | null = await context.DailyUserData.get(dayId);
        if (!dailyData) {
            const dayTimestamp = Date.UTC(year, month, day) / 1000;
            dailyData = {
                id: dayId,
                date: BigInt(dayTimestamp),
                totalTransactions: BigInt(0),
                uniqueUserCount: BigInt(0),
            };
        }
        const dayUserId = `${dayId}-${userAddress}`;
        const existingDay = await context.UserDay.get(dayUserId);
        let dayUniqueUsers = dailyData.uniqueUserCount;
        if (!existingDay) {
            await context.UserDay.set({ id: dayUserId });
            dayUniqueUsers = dayUniqueUsers + BigInt(1);
        }

        dailyData = {
            ...dailyData,
            totalTransactions: dailyData.totalTransactions + BigInt(1),
            uniqueUserCount: dayUniqueUsers,
        };
        await context.DailyUserData.set(dailyData);

        // Monthly Stats
        const monthId = `${year}-${String(month + 1).padStart(2, '0')}`;
        let monthlyData: MonthlyUserData | undefined | null = await context.MonthlyUserData.get(monthId);
        if (!monthlyData) {
            const monthTimestamp = Date.UTC(year, month, 1) / 1000;
            monthlyData = {
                id: monthId,
                monthStartDate: BigInt(monthTimestamp),
                totalTransactions: BigInt(0),
                uniqueUserCount: BigInt(0),
            };
        }

        const monthUserId = `${monthId}-${userAddress}`;
        const existingMonth = await context.UserMonth.get(monthUserId);
        let monthUniqueUsers = monthlyData.uniqueUserCount;
        if (!existingMonth) {
            await context.UserMonth.set({ id: monthUserId });
            monthUniqueUsers = monthUniqueUsers + BigInt(1);
        }

        monthlyData = {
            ...monthlyData,
            totalTransactions: monthlyData.totalTransactions + BigInt(1),
            uniqueUserCount: monthUniqueUsers
        };

        await context.MonthlyUserData.set(monthlyData);
    } else {
        context.log.warn(`User address not available for transaction ${event.transaction.hash} in Aggregated event. Skipping user-specific stats.`);
    }
}