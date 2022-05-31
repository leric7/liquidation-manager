import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { run } from "hardhat";

import { getOpenseaProxyAddr } from "../scripts/helper";

const deployCreature: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const {
    deployments: { deploy },
    getNamedAccounts,
    network,
  } = hre;
  const openseaProxyAddr = getOpenseaProxyAddr(network.name);
  const { deployer } = await getNamedAccounts();

  console.log(`Deploying Creature...`);

  console.log(deployer, openseaProxyAddr);

  const deployResult = await deploy("Creature", {
    from: deployer,
    args: [openseaProxyAddr],
    log: true,
  });

  console.log(`Creature is deployed at ${deployResult.address}\n`);

  try {
    await new Promise((resolve) => setTimeout(resolve, 30000));
    await run("verify:verify", {
      address: deployResult.address,
      constructorArguments: [openseaProxyAddr],
    });
  } catch (error) {
    console.log(error);
  }
};

export default deployCreature;
deployCreature.tags = ["Creature"];
