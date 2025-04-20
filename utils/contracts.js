import contractProxies from '../deployments/addresses/contract-proxies.json';

export function getContractAddresses() {
  const isTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';
  const network = isTestnet ? 'testnet' : 'mainnet';
  
  return {
    proxies: contractProxies[network] || {}
  };
}

export function getContractAddress(contractName) {
  const { proxies } = getContractAddresses();
  return proxies[contractName];
} 