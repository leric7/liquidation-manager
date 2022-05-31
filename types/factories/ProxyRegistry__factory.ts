/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { ProxyRegistry, ProxyRegistryInterface } from "../ProxyRegistry";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "proxies",
    outputs: [
      {
        internalType: "contract OwnableDelegateProxy",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b5060d18061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063c455279114602d575b600080fd5b60536038366004606f565b6000602081905290815260409020546001600160a01b031681565b6040516001600160a01b03909116815260200160405180910390f35b600060208284031215607f578081fd5b81356001600160a01b03811681146094578182fd5b939250505056fea2646970667358221220adae803f836cace506615479d171a0b6b91c8ace3ddc89f100d703e08f78f25564736f6c63430008040033";

export class ProxyRegistry__factory extends ContractFactory {
  constructor(
    ...args: [signer: Signer] | ConstructorParameters<typeof ContractFactory>
  ) {
    if (args.length === 1) {
      super(_abi, _bytecode, args[0]);
    } else {
      super(...args);
    }
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ProxyRegistry> {
    return super.deploy(overrides || {}) as Promise<ProxyRegistry>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): ProxyRegistry {
    return super.attach(address) as ProxyRegistry;
  }
  connect(signer: Signer): ProxyRegistry__factory {
    return super.connect(signer) as ProxyRegistry__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ProxyRegistryInterface {
    return new utils.Interface(_abi) as ProxyRegistryInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ProxyRegistry {
    return new Contract(address, _abi, signerOrProvider) as ProxyRegistry;
  }
}