// rpc-hel.js —— Helius 主网 + 自动故障切换
import { Connection } from "https://esm.sh/@solana/web3.js@1.98.0";

// 你的 Helius 节点（已带 key）
const HELIUS_HTTP = "https://mainnet.helius-rpc.com/?api-key=17b33ce1-3ff2-4c11-a229-133b4cf1f3b7";
// 需要订阅类功能时可用（本站目前用不到）
export const HELIUS_WS = "wss://mainnet.helius-rpc.com/?api-key=17b33ce1-3ff2-4c11-a229-133b4cf1f3b7";
// Helius 增强 API（可选，用于解析交易）
export const HELIUS_ENHANCED_TX = "https://api.helius.xyz/v0/transactions/?api-key=17b33ce1-3ff2-4c11-a229-133b4cf1f3b7";

// 允许用 ?rpc= 动态覆盖，便于排查
const override = new URLSearchParams(location.search).get("rpc");

// RPC 列表：Helius 为主，公共节点兜底
const RPCS = [
  override || HELIUS_HTTP,
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com"
];

let rpcIndex = 0;
export let conn = new Connection(RPCS[rpcIndex], "confirmed");

function shouldFailover(err) {
  const msg = (err?.message || String(err)).toLowerCase();
  return /403|forbidden|429|rate|limit|timeout|blockhash|fetch|network/.test(msg);
}

export function currentRpc() {
  return RPCS[rpcIndex];
}

export function switchRpc() {
  rpcIndex = (rpcIndex + 1) % RPCS.length;
  conn = new Connection(RPCS[rpcIndex], "confirmed");
  return currentRpc();
}

// 通用：带故障转移执行某个 Connection 调用
export async function withRpcFailover(fn) {
  try {
    return await fn(conn);
  } catch (e) {
    if (shouldFailover(e)) {
      const next = switchRpc();
      console.warn("[RPC failover] switching to:", next);
      return await fn(conn);
    }
    throw e;
  }
}

// 获取最新 blockhash（带 failover）
export async function getLatestBH(commitment = "finalized") {
  return withRpcFailover(c => c.getLatestBlockhash(commitment));
}

// 发送已签名交易（带 failover）
export async function sendRawWithFailover(signed) {
  return withRpcFailover(c => c.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed"
  }));
}