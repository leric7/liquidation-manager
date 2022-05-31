import { expect } from "chai";
import { Signer } from "ethers";
import { ethers, network } from "hardhat";

import {
  getNFTXVaultFactoryAddr,
  getOpenseaProxyAddr,
  getOpenseaWyvernExchangeAddr,
} from "../scripts/helper";
import { Creature, LiquidationManager, WyvernExchangeFake } from "../types";

describe("Liquidation Manager", function () {
  let alice: Signer;
  let bob: Signer;

  let liquidationManager: LiquidationManager;
  let wayvernExchange: WyvernExchangeFake;
  let creature: Creature;

  beforeEach(async () => {
    [, alice, bob] = await ethers.getSigners();

    // Deploy Creature NFT
    const CreatureFactory = await ethers.getContractFactory("Creature");
    creature = await CreatureFactory.deploy(getOpenseaProxyAddr(network.name));

    // Mint token to Alice
    await creature.mintTo(await alice.getAddress());
    // Mint token to Bob
    await creature.mintTo(await bob.getAddress());

    const WyvernExchangeFactory = await ethers.getContractFactory(
      "WyvernExchangeFake"
    );
    wayvernExchange = await WyvernExchangeFactory.deploy();
    await wayvernExchange.deployed();

    const LiquidationManagerFactory = await ethers.getContractFactory(
      "LiquidationManager"
    );
    liquidationManager = await LiquidationManagerFactory.deploy(
      // getOpenseaWyvernExchangeAddr(network.name),
      wayvernExchange.address,
      getNFTXVaultFactoryAddr(network.name)
    );
    await liquidationManager.deployed();
  });

  it("should be deployed, and configured", async () => {
    expect(await liquidationManager.wyvernExchange()).to.equal(
      wayvernExchange.address
    );
    expect(await liquidationManager.nftXVaultFactory()).to.equal(
      getNFTXVaultFactoryAddr(network.name)
    );
    expect(
      (await liquidationManager.openseaAuctionDuration()).toString()
    ).to.equal("86400");
  });

  describe("opensea auction duration", () => {
    it("non-owner can't change opensea auction duration", async () => {
      await expect(
        liquidationManager.connect(alice).changeOpenseaAuctionDuration(3600)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("opensea auction duration can't be lower than a half day", async () => {
      await expect(
        liquidationManager.changeOpenseaAuctionDuration(3600)
      ).to.be.revertedWith("invalid duration");
    });
    it("owner should modify opensea auction duration", async () => {
      expect(await liquidationManager.changeOpenseaAuctionDuration(2 * 86400))
        .to.emit(liquidationManager, "OpenseaAuctionDurationUpdated")
        .withArgs(2 * 86400);
      expect(
        (await liquidationManager.openseaAuctionDuration()).toString()
      ).to.equal("172800");
    });
  });

  describe("liquidate", () => {
    it("non-owner should not liquidate", async () => {
      await expect(
        liquidationManager.connect(alice).liquidate(creature.address, 1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not liquidate NFT not deposited", async () => {
      await expect(
        liquidationManager.liquidate(creature.address, 1)
      ).to.be.revertedWith("not token owner");
    });

    it("should liquidate alice's NFT", async () => {
      await creature.connect(alice).approve(liquidationManager.address, 1);
      await liquidationManager.connect(alice).deposit(creature.address, 1);

      const liquidateTx = await liquidationManager.liquidate(
        creature.address,
        1
      );
      const liquidateBlock = await ethers.provider.getBlock(
        liquidateTx.blockNumber || 0
      );

      await expect(liquidateTx)
        .to.emit(liquidationManager, "TokenLiquidated")
        .withArgs(creature.address, 1, liquidateBlock.timestamp, 86400);
    });

    it("should not liquidate alice's NFT which is already liquidated", async () => {
      await creature.connect(alice).approve(liquidationManager.address, 1);
      await liquidationManager.connect(alice).deposit(creature.address, 1);

      await liquidationManager.liquidate(creature.address, 1);

      await expect(
        liquidationManager.liquidate(creature.address, 1)
      ).to.be.revertedWith("already liquidated");
    });

    describe("sell NFT on Opensea", async () => {
      let buyOrder = {};
      let sellOrder = {};

      beforeEach(async () => {
        buyOrder = {
          exchange: wayvernExchange.address,
          maker: liquidationManager.address,
          taker: "0x0000000000000000000000000000000000000000",
          makerRelayerFee: 0,
          takerRelayerFee: 250,
          makerProtocolFee: 0,
          takerProtocolFee: 0,
          feeRecipient: "0x5b3256965e7c3cf26e11fcaf296dfc8807c01073",
          feeMethod: 1,
          side: 0,
          saleKind: 0,
          target: "0x45b594792a5cdc008d0de1c1d69faa3d16b3ddc1",
          howToCall: 1,
          bCalldata: `0xfb16a595000000000000000000000000000000000000000000000000000000000000000000000000000000000000000075ae13c83add91272a02179ecf18f20ba65b8256000000000000000000000000${creature.address.replace(
            "0x",
            ""
          )}0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000`,
          replacementPattern:
            "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
          staticTarget: "0x0000000000000000000000000000000000000000",
          staticExtradata: "0x",
          paymentToken: "0xc778417e063141139fce010982780140aa0cd5ab",
          basePrice: 6000000000000000,
          extra: 0,
          listingTime: 1653963516,
          expirationTime: 1654222805,
          salt: "46283856062284117332718487320173134166179297852652433828828758657181924533959",
        };

        sellOrder = {
          exchange: wayvernExchange.address,
          maker: await bob.getAddress(),
          taker: "0x0000000000000000000000000000000000000000",
          makerRelayerFee: 250,
          takerRelayerFee: 0,
          makerProtocolFee: 0,
          takerProtocolFee: 0,
          feeRecipient: "0x5b3256965e7c3cf26e11fcaf296dfc8807c01073",
          feeMethod: 1,
          side: 1,
          saleKind: 0,
          target: "0x45b594792a5cdc008d0de1c1d69faa3d16b3ddc1",
          howToCall: 1,
          bCalldata:
            "0xfb16a595000000000000000000000000717063e488ad6b721cb1847096ea02700805b85f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000009d833825409d873144163146de5b83073ad8736c0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000",
          replacementPattern:
            "0x000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
          staticTarget: "0x0000000000000000000000000000000000000000",
          staticExtradata: "0x",
          paymentToken: "0x0000000000000000000000000000000000000000",
          basePrice: 5000000000000000,
          extra: 0,
          listingTime: 1653963538,
          expirationTime: 1656642021,
          salt: "18558812411864480083071132580553219875873671083323086408990868255548902707473",
        };

        await creature.connect(alice).approve(liquidationManager.address, 1);
        await liquidationManager.connect(alice).deposit(creature.address, 1);

        const liquidateTx = await liquidationManager.liquidate(
          creature.address,
          1
        );
        const liquidateBlock = await ethers.provider.getBlock(
          liquidateTx.blockNumber || 0
        );

        await expect(liquidateTx)
          .to.emit(liquidationManager, "TokenLiquidated")
          .withArgs(creature.address, 1, liquidateBlock.timestamp, 86400);
      });

      it("non-owner should not sell liquidated alice's NFT on Opensea", async () => {
        await expect(
          liquidationManager
            .connect(alice)
            .fulfillOpenseaOrder(
              creature.address,
              1,
              buyOrder as any,
              sellOrder as any,
              [28, 27],
              [
                "0x127b6f4d96c568600b3160d525a9bb19b8692c088591916072f33ac66ae157e0",
                "0x3e2956c9157fa1913696705edc397df469edacdb60c8172808397acde3e0601b",
                "0xd4802879c117987f77dce27216d737632b601c22e0c4974225f4747d14cb995c",
                "0xd4802879c117987f77dce27216d737632b601c22e0c4974225f4747d14cb995c",
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              ]
            )
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("should not sell liquidated alice's NFT on Opensea, after expiration", async () => {
        await network.provider.send("evm_increaseTime", [3 * 86400]);
        await network.provider.send("evm_mine");

        await expect(
          liquidationManager.fulfillOpenseaOrder(
            creature.address,
            1,
            buyOrder as any,
            sellOrder as any,
            [28, 27],
            [
              "0x127b6f4d96c568600b3160d525a9bb19b8692c088591916072f33ac66ae157e0",
              "0x3e2956c9157fa1913696705edc397df469edacdb60c8172808397acde3e0601b",
              "0xd4802879c117987f77dce27216d737632b601c22e0c4974225f4747d14cb995c",
              "0xd4802879c117987f77dce27216d737632b601c22e0c4974225f4747d14cb995c",
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            ]
          )
        ).to.be.revertedWith("opensea auction expired");
      });

      it("should sell liquidated alice's NFT on Opensea", async () => {
        await network.provider.send("evm_increaseTime", [0.5 * 86400]);
        await network.provider.send("evm_mine");

        await expect(
          liquidationManager.fulfillOpenseaOrder(
            creature.address,
            1,
            buyOrder as any,
            sellOrder as any,
            [28, 27],
            [
              "0x127b6f4d96c568600b3160d525a9bb19b8692c088591916072f33ac66ae157e0",
              "0x3e2956c9157fa1913696705edc397df469edacdb60c8172808397acde3e0601b",
              "0xd4802879c117987f77dce27216d737632b601c22e0c4974225f4747d14cb995c",
              "0x51ab2120203646814d1d31dca24a23d4a97c9b7a5d81a720ae60428fd57bf184",
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            ]
          )
        )
          .to.emit(liquidationManager, "SoldOnOpensea")
          .withArgs(creature.address, 1);
      });
    });

    describe("sell NFT on NFTX", async () => {
      beforeEach(async () => {
        await creature.connect(alice).approve(liquidationManager.address, 1);
        await liquidationManager.connect(alice).deposit(creature.address, 1);

        const liquidateTx = await liquidationManager.liquidate(
          creature.address,
          1
        );
        const liquidateBlock = await ethers.provider.getBlock(
          liquidateTx.blockNumber || 0
        );

        await expect(liquidateTx)
          .to.emit(liquidationManager, "TokenLiquidated")
          .withArgs(creature.address, 1, liquidateBlock.timestamp, 86400);
      });

      it("non-owner should not sell liquidated alice's NFT on NFTX", async () => {
        await expect(
          liquidationManager.connect(alice).mintNFTX(creature.address, 1)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("should not sell liquidated alice's NFT on NFTX, while opensea auction is on-going", async () => {
        await network.provider.send("evm_increaseTime", [0.5 * 86400]);
        await network.provider.send("evm_mine");

        await expect(
          liquidationManager.mintNFTX(creature.address, 1)
        ).to.be.revertedWith("opensea auction in progress");
      });

      it("should sell liquidated alice's NFT on NFTX", async () => {
        await network.provider.send("evm_increaseTime", [2 * 86400]);
        await network.provider.send("evm_mine");

        expect(await liquidationManager.mintNFTX(creature.address, 1))
          .to.emit(liquidationManager, "SoldOnNFTX")
          .withArgs(creature.address, 1, 1e18);
      });

      it("should not sell liquidated alice's NFT on NFTX, which is already sold", async () => {
        await network.provider.send("evm_increaseTime", [2 * 86400]);
        await network.provider.send("evm_mine");

        expect(await liquidationManager.mintNFTX(creature.address, 1))
          .to.emit(liquidationManager, "SoldOnNFTX")
          .withArgs(creature.address, 1, 1e18);

        await expect(
          liquidationManager.mintNFTX(creature.address, 1)
        ).to.be.revertedWith("not token owner");
      });
    });
  });
});
