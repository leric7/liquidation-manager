// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IWyvernExchange} from "../lib/wyvern/interfaces/IWyvernExchange.sol";

import "hardhat/console.sol";

contract WyvernExchangeFake is IWyvernExchange {
    function atomicMatch_(
        address[14] memory addrs,
        uint256[18] memory uints,
        uint8[8] memory feeMethodsSidesKindsHowToCalls,
        bytes memory calldataBuy,
        bytes memory calldataSell,
        bytes memory replacementPatternBuy,
        bytes memory replacementPatternSell,
        bytes memory staticExtradataBuy,
        bytes memory staticExtradataSell,
        uint8[2] memory vs,
        bytes32[5] memory rssMetadata
    ) external override {
        address _tokenAddress;
        uint256 _tokenId;

        assembly {
            _tokenAddress := and(
                mload(add(calldataBuy, 0x64)),
                0xffffffffffffffffffffffffffffffffffffffff
            )
            _tokenId := mload(add(calldataBuy, 0x84))
        }

        IERC721(_tokenAddress).safeTransferFrom(addrs[1], addrs[8], _tokenId);
    }
}
