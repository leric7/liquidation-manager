export const getOpenseaProxyAddr = (networkName: string): string => {
  switch (networkName) {
    case "rinkeby":
      return "0xf57b2c51ded3a29e6891aba85459d600256cf317";
    case "mainnet":
    case "hardhat":
      return "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
    default:
      return "0x0000000000000000000000000000000000000000";
  }
};

export const getOpenseaWyvernExchangeAddr = (networkName: string): string => {
  switch (networkName) {
    case "rinkeby":
      return "0xdd54d660178b28f6033a953b0e55073cfa7e3744";
    case "mainnet":
    case "hardhat":
      return "0x7f268357A8c2552623316e2562D90e642bB538E5";
    default:
      return "0x0000000000000000000000000000000000000000";
  }
};

export const getNFTXVaultFactoryAddr = (networkName: string): string => {
  switch (networkName) {
    case "rinkeby":
      return "0xbbc53022Af15Bb973AD906577c84784c47C14371";
    case "mainnet":
    case "hardhat":
      return "0xBE86f647b167567525cCAAfcd6f881F1Ee558216";
    default:
      return "0x0000000000000000000000000000000000000000";
  }
};
