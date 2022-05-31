// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {WyvernExchange} from "./lib/wyvern/WyvernExchange.sol";
import {INFTXVault} from "./lib/nftx/interfaces/INFTXVault.sol";
import {INFTXVaultFactory} from "./lib/nftx/interfaces/INFTXVaultFactory.sol";
import {IWyvernExchange} from "./lib/wyvern/interfaces/IWyvernExchange.sol";

contract LiquidationManager is Ownable, IERC721Receiver {
    struct LiquidationInfo {
        uint256 liquidatedAt; // Liquidated time
        bool soldOnOpensea; // If sold on Opensea
        bool soldOnNFTX; // If sold on NFTX
    }

    // Opensea auction duration - 1 day by default
    uint256 public openseaAuctionDuration;

    // WyvernExchange for Opensea
    IWyvernExchange public wyvernExchange;

    // NFTXVaultFactory
    INFTXVaultFactory public nftXVaultFactory;

    // Mapping from token to liquidation
    mapping(address => mapping(uint256 => LiquidationInfo)) public liquidations;

    constructor(address _wyvernExchange, address _nftXVaultFactory) {
        openseaAuctionDuration = 1 days;
        wyvernExchange = IWyvernExchange(_wyvernExchange);
        nftXVaultFactory = INFTXVaultFactory(_nftXVaultFactory);
    }

    /**
     * @notice change Opensea auction duration.
     * @dev only owner can call this function
     * @param _newOpenseaAuctionDuration new auction duration
     */
    function changeOpenseaAuctionDuration(uint256 _newOpenseaAuctionDuration)
        external
        onlyOwner
    {
        require(_newOpenseaAuctionDuration > 0.5 days, "invalid duration");
        openseaAuctionDuration = _newOpenseaAuctionDuration;

        emit OpenseaAuctionDurationUpdated(_newOpenseaAuctionDuration);
    }

    function deposit(address _tokenAddress, uint256 _tokenId) external {
        IERC721(_tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            _tokenId
        );
    }

    /**
     * @notice liquidate the token
     * @dev only owner can call this function
     * @param _tokenAddress liquidated token address
     * @param _tokenId liquidated token id
     */
    function liquidate(address _tokenAddress, uint256 _tokenId)
        external
        onlyOwner
    {
        require(
            IERC721(_tokenAddress).ownerOf(_tokenId) == address(this),
            "not token owner"
        );

        require(
            liquidations[_tokenAddress][_tokenId].liquidatedAt == 0,
            "already liquidated"
        );

        liquidations[_tokenAddress][_tokenId] = LiquidationInfo({
            liquidatedAt: block.timestamp,
            soldOnOpensea: false,
            soldOnNFTX: false
        });

        emit TokenLiquidated(
            _tokenAddress,
            _tokenId,
            block.timestamp,
            openseaAuctionDuration
        );
    }

    /**
     * @notice fulfill the Opensea order
     * @dev only owner can call this function
     * @param _tokenAddress asset token address
     * @param _tokenId asset token id
     * @param buyOrder buy order
     * @param sellOrder sell order
     * @param _vs v of buy & sell order
     * @param _rssMetadata r, s of buy & sell order
     */
    function fulfillOpenseaOrder(
        address _tokenAddress,
        uint256 _tokenId,
        WyvernExchange.Order memory buyOrder,
        WyvernExchange.Order memory sellOrder,
        uint8[2] memory _vs,
        bytes32[5] memory _rssMetadata
    ) external payable onlyOwner {
        require(
            IERC721(_tokenAddress).ownerOf(_tokenId) == address(this),
            "not token owner"
        );

        LiquidationInfo memory liquidation = liquidations[_tokenAddress][
            _tokenId
        ];

        require(liquidation.liquidatedAt != 0, "not liquidated");

        require(
            block.timestamp < liquidation.liquidatedAt + openseaAuctionDuration,
            "opensea auction expired"
        );

        liquidation.soldOnOpensea = true;
        liquidations[_tokenAddress][_tokenId] = liquidation;

        emit SoldOnOpensea(_tokenAddress, _tokenId);

        IERC721(_tokenAddress).approve(address(wyvernExchange), _tokenId);
        wyvernExchange.atomicMatch_(
            [
                buyOrder.exchange,
                buyOrder.maker,
                buyOrder.taker,
                buyOrder.feeRecipient,
                buyOrder.target,
                buyOrder.staticTarget,
                buyOrder.paymentToken,
                sellOrder.exchange,
                sellOrder.maker,
                sellOrder.taker,
                sellOrder.feeRecipient,
                sellOrder.target,
                sellOrder.staticTarget,
                sellOrder.paymentToken
            ],
            [
                buyOrder.makerRelayerFee,
                buyOrder.takerRelayerFee,
                buyOrder.makerProtocolFee,
                buyOrder.takerProtocolFee,
                buyOrder.basePrice,
                buyOrder.extra,
                buyOrder.listingTime,
                buyOrder.expirationTime,
                buyOrder.salt,
                sellOrder.makerRelayerFee,
                sellOrder.takerRelayerFee,
                sellOrder.makerProtocolFee,
                sellOrder.takerProtocolFee,
                sellOrder.basePrice,
                sellOrder.extra,
                sellOrder.listingTime,
                sellOrder.expirationTime,
                sellOrder.salt
            ],
            [
                uint8(buyOrder.feeMethod),
                uint8(buyOrder.side),
                uint8(buyOrder.saleKind),
                uint8(buyOrder.howToCall),
                uint8(sellOrder.feeMethod),
                uint8(sellOrder.side),
                uint8(sellOrder.saleKind),
                uint8(sellOrder.howToCall)
            ],
            buyOrder.bCalldata,
            sellOrder.bCalldata,
            buyOrder.replacementPattern,
            sellOrder.replacementPattern,
            buyOrder.staticExtradata,
            sellOrder.staticExtradata,
            _vs,
            _rssMetadata
        );
    }

    /**
     * @notice mint on NFTX
     * @dev only owner can call this function
     * @param _tokenAddress asset token address
     * @param _tokenId asset token id
     */
    function mintNFTX(address _tokenAddress, uint256 _tokenId)
        external
        onlyOwner
    {
        require(
            IERC721(_tokenAddress).ownerOf(_tokenId) == address(this),
            "not token owner"
        );

        LiquidationInfo memory liquidation = liquidations[_tokenAddress][
            _tokenId
        ];

        require(liquidation.liquidatedAt != 0, "not liquidated");

        require(
            block.timestamp > liquidation.liquidatedAt + openseaAuctionDuration,
            "opensea auction in progress"
        );

        liquidation.soldOnNFTX = true;
        liquidations[_tokenAddress][_tokenId] = liquidation;

        // Create vault
        uint256 vaultId = nftXVaultFactory.createVault(
            IERC721Metadata(_tokenAddress).name(),
            IERC721Metadata(_tokenAddress).symbol(),
            _tokenAddress,
            false,
            true
        );
        INFTXVault vault = INFTXVault(nftXVaultFactory.vault(vaultId));
        IERC721(_tokenAddress).approve(address(vault), _tokenId);

        // Mint NFT
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = _tokenId;
        uint256 _amount = vault.mint(tokenIds, new uint256[](1));
        // And finalize the vault
        vault.finalizeVault();

        emit SoldOnNFTX(_tokenAddress, _tokenId, _amount);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    event OpenseaAuctionDurationUpdated(uint256 openseaAuctionDuration);
    event TokenLiquidated(
        address indexed tokenAddress,
        uint256 indexed tokenId,
        uint256 liquidatedAt,
        uint256 openseaAuctionDuration
    );
    event SoldOnOpensea(address indexed tokenAddress, uint256 indexed tokenId);
    event SoldOnNFTX(
        address indexed tokenAddress,
        uint256 indexed tokenId,
        uint256 amount
    );
}
