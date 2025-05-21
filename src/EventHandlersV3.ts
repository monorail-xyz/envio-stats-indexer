import { AggregateV3, Aggregate_Aggregation } from "../generated";
import {
  ROUTER_ADDRESSES,
} from "./consts";
import {
  processSwap,
  updateGlobalStats
} from "./helpers";

/**
 * Handle the Aggregation event
 */

AggregateV3.Aggregated.handler(async ({ event, context }) => {
  const {
    tokenIn,
    tokenOut,
    amount,
    destinationAmount,
    feeAmount
  } = event.params;

  // First capture our own trading information
  const entity: Aggregate_Aggregation = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    tokenAddress: tokenIn,
    outTokenAddress: tokenOut,
    amount: amount,
    destinationAmount: destinationAmount,
    feeAmount: feeAmount,
  };

  let storedTokenIn = await context.AggregatorToken.get(tokenIn);
  if (storedTokenIn) {
    storedTokenIn = {
      ...storedTokenIn,
      tradeInAmount: storedTokenIn.tradeInAmount + amount,
      tradeInCount: storedTokenIn.tradeInCount + BigInt(1),
      avgTradeInAmount: (storedTokenIn.tradeInAmount + amount) / (storedTokenIn.tradeInCount + BigInt(1)),
      totalAmount: storedTokenIn.totalAmount + amount,
      feeAmount: storedTokenIn.feeAmount + feeAmount,
    };
  } else {
    storedTokenIn = {
      id: tokenIn,
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

  let storedTokenOut = await context.AggregatorToken.get(tokenOut);
  if (storedTokenOut) {
    storedTokenOut = {
      ...storedTokenOut,
      tradeOutAmount: storedTokenOut.tradeOutAmount + destinationAmount,
      tradeOutCount: storedTokenOut.tradeOutCount + BigInt(1),
      avgTradeOutAmount: (storedTokenOut.tradeOutAmount + destinationAmount) / (storedTokenOut.tradeOutCount + BigInt(1)),
      totalAmount: storedTokenOut.totalAmount + destinationAmount,
      feeAmount: storedTokenOut.feeAmount + feeAmount,
    };
  } else {
    storedTokenOut = {
      id: tokenOut,
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

  context.AggregatorToken.set(storedTokenIn);
  context.AggregatorToken.set(storedTokenOut);

  context.Aggregate_Aggregation.set(entity);

  // 1. Update Global Stats
  const networkFee = (event.transaction.gasPrice || BigInt(0)) * BigInt(event.transaction.gas);
  await updateGlobalStats(context, networkFee, event.transaction.gas);
});


AggregateV3.AggregatedTrade.handler(async ({ event, context }) => {
  const {
    router,
    tokenIn,
    tokenOut,
    amount
  } = event.params;

  try {
    const routerInfo = ROUTER_ADDRESSES[router.toLowerCase()];
    if (routerInfo) {

      const txHash = event.transaction.hash;
      const userAddress = event.transaction.from;
      if (!userAddress) {
        console.warn(`User address not available for tx: ${txHash}`);
        return;
      }
      const blockNumber = BigInt(event.block.number);
      const timestamp = BigInt(event.block.timestamp || Math.floor(Date.now() / 1000));

      // This new contract no longer uses this raw calldata to execute, we need to look at 
      // the AggregatedTrade event now that is emitted for each step
      await processSwap(
        context,
        txHash,
        blockNumber,
        timestamp,
        userAddress,
        router.toLowerCase(),
        routerInfo.name,
        tokenIn,
        tokenOut,
        amount,
        event,
        0 // index is not used in this case
      );
    }
  } catch (error) {
    console.error(`Error processing Aggregation event: ${(error as Error).message}`);
  }
});