// SPDX-License-Identifier: MIT

/**
 * @dev https://github.com/ProjectWyvern/wyvern-ethereum/blob/master/contracts/exchange/SaleKindInterface.sol
 */

pragma solidity ^0.8.0;

library SaleKindInterface {
    enum Side {
        Buy,
        Sell
    }

    enum SaleKind {
        FixedPrice,
        DutchAuction
    }
}
