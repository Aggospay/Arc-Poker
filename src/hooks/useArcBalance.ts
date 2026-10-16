import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { getUsdc } from '@/onchain-facts';
import { Amount, usdcDecimalsFor } from '@/onchain-money';

const ARC_TESTNET_CHAIN_ID = 5042002;

export function useArcBalance() {
  const { address, isConnected } = useAccount();

  const usdcFact = getUsdc(ARC_TESTNET_CHAIN_ID);

  const { data: rawBalance, isLoading, refetch } = useReadContract({
    address: usdcFact?.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: {
      enabled: !!address && !!usdcFact,
      refetchInterval: 8000,
    },
  });

  const formatted =
    rawBalance !== undefined && rawBalance !== null
      ? Amount.fromRaw(rawBalance, usdcDecimalsFor(ARC_TESTNET_CHAIN_ID)).toFixed(2)
      : '0.00';

  return {
    balance: formatted,
    rawBalance: rawBalance,
    isLoading,
    isConnected,
    address,
    refetch,
    chainId: ARC_TESTNET_CHAIN_ID,
  };
}
