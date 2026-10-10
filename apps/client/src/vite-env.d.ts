/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_HTTP_URL?: string;
  readonly VITE_SERVER_WS_URL?: string;
  readonly VITE_MONAD_CHAIN_ID?: string;
  readonly VITE_MONAD_RPC_URL?: string;
  readonly VITE_MONAD_EXPLORER_URL?: string;
  readonly VITE_CONTRACT_AGENT_REGISTRY?: string;
  readonly VITE_CONTRACT_CIVILIZATION_ECONOMY?: string;
  readonly VITE_CONTRACT_REPUTATION_LEDGER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
