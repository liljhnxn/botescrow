import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { botchainTestnet, hardhatLocal } from "./network";

export const wagmiConfig = createConfig({
  chains: [botchainTestnet, hardhatLocal],
  connectors: [
    injected({
      target: "metaMask",
    }),
  ],
  transports: {
    [botchainTestnet.id]: http("https://rpc.bohr.life"),
    [hardhatLocal.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});
