import { ethers } from "ethers";
import { Aggregate, Aggregate_Aggregation } from "../generated";
import {
  ROUTER_ADDRESSES,
  SWAP_EXACT_TOKENS_FOR_TOKENS_SELECTOR,
  EXACT_INPUT_SINGLE_SELECTOR
} from "./consts";
import {
  decodeAggregateInput,
  decodeSwapData,
  processSwap
} from "./helpers";
import { exit } from "process";

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
      totalAmount: tokenIn.totalAmount + amount,
      feeAmount: tokenIn.feeAmount + feeAmount,
    };
  } else {
    tokenIn = {
      id: tokenAddress,
      tradeInAmount: amount,
      tradeOutAmount: BigInt(0),
      feeAmount: feeAmount,
      totalAmount: amount,
    };
  }

  let tokenOut = await context.AggregatorToken.get(outTokenAddress);
  if (tokenOut) {
    tokenOut = {
      ...tokenOut,
      tradeOutAmount: tokenOut.tradeOutAmount + destinationAmount,
      totalAmount: tokenOut.totalAmount + destinationAmount,
      feeAmount: tokenOut.feeAmount + feeAmount,
    };
  } else {
    tokenOut = {
      id: outTokenAddress,
      tradeInAmount: BigInt(0),
      tradeOutAmount: destinationAmount,
      feeAmount: feeAmount,
      totalAmount: destinationAmount,
    };
  }

  context.AggregatorToken.set(tokenIn);
  context.AggregatorToken.set(tokenOut);

  context.Aggregate_Aggregation.set(entity);

  // Now break is down by exchange

  const txHash = event.transaction.hash;
  const userAddress = event.transaction.from;
  if (!userAddress) {
    console.warn(`User address not available for tx: ${txHash}`);
    return;
  }
  const blockNumber = BigInt(event.block.number);
  const timestamp = BigInt(event.block.timestamp || Math.floor(Date.now() / 1000));

  console.log(`Processing Aggregation event: ${txHash}, token: ${tokenAddress}`);

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
        const decodedSwap = decodeSwapData(targetAddress, callData);

        if (decodedSwap.success && decodedSwap.tokenInAddress && decodedSwap.amountIn) {

          console.log(`Decoded swap !!! `);

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
            event.logIndex,
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