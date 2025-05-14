// import assert from "assert";
// import {
//     TestHelpers,
//     Aggregate_Aggregation
// } from "generated";
// const { MockDb, Aggregate } = TestHelpers;

// describe("Aggregate contract Aggregation event tests", () => {
//     // Create mock db
//     const mockDb = MockDb.createMockDb();

//     // Creating mock for Aggregate contract Aggregation event
//     const event = Aggregate.Aggregation.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */ });

//     it("Aggregate_Aggregation is created correctly", async () => {
//         // Processing the event
//         const mockDbUpdated = await Aggregate.Aggregation.processEvent({
//             event,
//             mockDb,
//         });

//         // Getting the actual entity from the mock database
//         let actualAggregateAggregation = mockDbUpdated.entities.Aggregate_Aggregation.get(
//             `${event.chainId}_${event.block.number}_${event.logIndex}`
//         );

//         // Creating the expected entity
//         const expectedAggregateAggregation: Aggregate_Aggregation = {
//             id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
//             tokenAddress: event.params.tokenAddress,
//             outTokenAddress: event.params.outTokenAddress,
//             amount: event.params.amount,
//             destinationAmount: event.params.destinationAmount,
//             feeAmount: event.params.feeAmount,
//         };
//         // Asserting that the entity in the mock database is the same as the expected entity
//         assert.deepEqual(actualAggregateAggregation, expectedAggregateAggregation, "Actual AggregateAggregation should be the same as the expectedAggregateAggregation");
//     });
// });
