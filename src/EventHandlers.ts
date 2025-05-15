import { ethers } from "ethers";
import { Aggregate, Aggregate_Aggregation } from "../generated";
import {
  ROUTER_ADDRESSES,
} from "./consts";
import {
  decodeAggregateInput,
  decodeSwapData,
  processSwap,
  updateGlobalStats
} from "./helpers";

/**
 * Handle the Aggregation event
 */

Aggregate.Aggregation.handler(async ({ event, context }) => {
  const {
    tokenAddress,
    outTokenAddress,
    amount,
    destinationAmount,
    feeAmount
  } = event.params;

  // First capture our own trading information
  const entity: Aggregate_Aggregation = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    tokenAddress: tokenAddress,
    outTokenAddress: outTokenAddress,
    amount: amount,
    destinationAmount: destinationAmount,
    feeAmount: feeAmount,
  };

  let tokenIn = await context.AggregatorToken.get(tokenAddress);
  if (tokenIn) {
    tokenIn = {
      ...tokenIn,
      tradeInAmount: tokenIn.tradeInAmount + amount,
      tradeInCount: tokenIn.tradeInCount + BigInt(1),
      avgTradeInAmount: (tokenIn.tradeInAmount + amount) / (tokenIn.tradeInCount + BigInt(1)),
      totalAmount: tokenIn.totalAmount + amount,
      feeAmount: tokenIn.feeAmount + feeAmount,
    };
  } else {
    tokenIn = {
      id: tokenAddress,
      tradeInAmount: amount,
      tradeInCount: BigInt(1),
      avgTradeInAmount: amount,
      tradeOutAmount: BigInt(0),
      tradeOutCount: BigInt(0),
      avgTradeOutAmount: BigInt(0),
      feeAmount: feeAmount,
      totalAmount: amount,
    };
  }

  let tokenOut = await context.AggregatorToken.get(outTokenAddress);
  if (tokenOut) {
    tokenOut = {
      ...tokenOut,
      tradeOutAmount: tokenOut.tradeOutAmount + destinationAmount,
      tradeOutCount: tokenOut.tradeOutCount + BigInt(1),
      avgTradeOutAmount: (tokenOut.tradeOutAmount + destinationAmount) / (tokenOut.tradeOutCount + BigInt(1)),
      totalAmount: tokenOut.totalAmount + destinationAmount,
      feeAmount: tokenOut.feeAmount + feeAmount,
    };
  } else {
    tokenOut = {
      id: outTokenAddress,
      tradeInAmount: BigInt(0),
      tradeInCount: BigInt(0),
      avgTradeInAmount: BigInt(0),
      tradeOutAmount: destinationAmount,
      tradeOutCount: BigInt(1),
      avgTradeOutAmount: destinationAmount,
      feeAmount: feeAmount,
      totalAmount: destinationAmount,
    };
  }

  context.AggregatorToken.set(tokenIn);
  context.AggregatorToken.set(tokenOut);

  context.Aggregate_Aggregation.set(entity);

  // 1. Update Global Stats
  const networkFee = (event.transaction.gasPrice || BigInt(0)) * BigInt(event.transaction.gas);
  await updateGlobalStats(context, networkFee, event.transaction.gas);

  // Now break is down by exchange

  const txHash = event.transaction.hash;
  const userAddress = event.transaction.from;
  if (!userAddress) {
    console.warn(`User address not available for tx: ${txHash}`);
    return;
  }
  const blockNumber = BigInt(event.block.number);
  const timestamp = BigInt(event.block.timestamp || Math.floor(Date.now() / 1000));

  // Process the transaction input to extract swap details
  const txInput = event.transaction.input;

  if (!txInput || txInput.length < 10) {
    console.warn(`Transaction input not available or too short for tx: ${txHash}`);
    return;
  }

  try {
    // 1. Decode the aggregate function input
    const decodedAggregate = decodeAggregateInput(txInput);

    if (!decodedAggregate) {
      console.warn(`Could not decode aggregate function input for tx: ${txHash}`);
      return;
    }

    const { targets, callDatas } = decodedAggregate;

    // 2. Process each target call
    for (let i = 0; i < targets.length; i++) {
      const targetAddress = ethers.getAddress(targets[i]);
      const callData = callDatas[i];

      // Check if this target is a known router
      const routerInfo = ROUTER_ADDRESSES[targetAddress.toLowerCase()];

      if (routerInfo && callData && callData.length >= 10) {
        // 3. Decode the swap data
        const decodedSwap = decodeSwapData(targetAddress, callData, event.transaction.value);

        if (decodedSwap.success && decodedSwap.tokenInAddress && decodedSwap.amountIn) {

          // 4. Process the swap and update all entities
          await processSwap(
            context,
            txHash,
            blockNumber,
            timestamp,
            userAddress,
            targetAddress,
            routerInfo.name,
            decodedSwap.tokenInAddress,
            decodedSwap.tokenOutAddress,
            decodedSwap.amountIn,
            event,
            i
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error processing Aggregation event: ${(error as Error).message}`);
  }

  // exit(0);
});