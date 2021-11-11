import Web3 from 'web3';
import { WebsocketProvider, HttpProvider, IpcProvider } from 'web3-core';

let web3: Web3;
let provider: WebsocketProvider | HttpProvider | IpcProvider;
export function init(providerPath: string): Web3 {
  provider = new Web3.providers.HttpProvider(providerPath);
  web3 = new Web3(provider);
  return web3;
}

export function getInstance(): Web3 {
  return web3;
}

export function getProvider(): WebsocketProvider | HttpProvider | IpcProvider {
  return provider;
}
