import { initUI, initFooterFormInteraction } from './ui.js';
import { initCountdown } from './countdown.js';
import { initPresaleConverter } from './presale.js';
import { translations } from './translations.js';

// START of WALLET INTEGRATION
import {
  PublicKey, SystemProgram, Transaction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { conn, getLatestBH, sendRawWithFailover } from "./rpc-hel.js";
import nacl from "tweetnacl";
import { Buffer } from "https://esm.sh/buffer@6.0.3";

// --- Configuration ---
const DESTINATION_WALLET = "C2n9YYisQ7CrVCzeUVAv8TtVx8pcdf5LywFAwJWkgER4";
const DEST = new PublicKey(DESTINATION_WALLET); // Recipient address
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC Mint address
const USDT_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"); // USDT Mint address
const DECIMALS = { SOL: 9, USDC: 6, USDT: 6 };

// DOM elements mapping
const connectWalletBtns = [
  document.getElementById("connect-wallet"), // Header button
  document.getElementById("connect-wallet-2") // Presale section button
].filter(Boolean); // Filter out nulls if an element doesn't exist

const buyTmcsBtn = document.getElementById("buy-truthx-btn");
const amountInput = document.getElementById("crypto-amount");
const currencyBtns = document.querySelectorAll('.payment-tabs .tab-btn');
const currencyLabel = document.getElementById('currency-label'); // To update the text inside the input group

let provider = null;
let pubkey = null;
let selectedCurrency = "SOL"; // Default selected currency

// --- Mobile Deep Linking ---
let dappKeyPair = nacl.box.keyPair();
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let sharedSecret = null;
let session = null;

/* --- Toast / Status message --- */
function toast(msg, type="info") {
  let el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position:fixed;left:50%;top:20px;transform:translateX(-50%);
    padding:10px 14px;border-radius:10px;backdrop-filter:blur(8px);
    color:#fff;z-index:2147483647;box-shadow:0 6px 24px rgba(0,0,0,.25);
    background:${type==="error"?"#c0392b":type==="success"?"#27ae60":"#2d3436"};
    font-size:14px;`;
  document.body.appendChild(el);
  setTimeout(()=>{ el.style.transition="all .35s"; el.style.opacity="0"; el.style.transform="translateX(-50%) translateY(-8px)"; }, 2200);
  setTimeout(()=>el.remove(), 2600);
}

/* --- Shorten address --- */
const shortAddr = (pk) => pk?.toBase58().replace(/^(.{6}).*(.{4})$/,'$1...$2');

/* --- Decimal string -> Minor units (BigInt) --- */
function toMinorUnits(str, decimals) {
  const s = String(str || "").trim();
  if(!/^\d+(\.\d+)?$/.test(s)) throw new Error("Invalid amount format");
  const [intPart, fracPart=""] = s.split(".");
  const frac = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(intPart + frac);
}

// Function to convert lamports to a number safely for smaller amounts, or throw for large ones
function lamportsToNumber(bi) { // Only for cases <= 2^53-1 (Number.MAX_SAFE_INTEGER)
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (bi > max) throw new Error("Amount too large to convert to Number safely for transaction.");
  return Number(bi);
}

/* --- Wallet detection --- */
function getSolanaProvider() {
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana; // Older Phantom detection
  if (window.backpack?.solana) return window.backpack.solana;
  if (window.solflare?.isSolflare) return window.solflare;
  return null;
}

/* --- Initialize currency switching --- */
function initCurrencySwitch() {
  currencyBtns.forEach(btn=>{
    btn.addEventListener("click", () => {
      currencyBtns.forEach(b => b.classList.remove("active")); // Use 'active' class from existing CSS
      btn.classList.add("active");
      selectedCurrency = btn.dataset.currency || "SOL";
      if (currencyLabel) {
        currencyLabel.textContent = selectedCurrency;
      }
      // Trigger amount recalculation if needed
      if (amountInput.value) {
        amountInput.dispatchEvent(new Event('input'));
      }
    });
    // Set initial active state and currency (from page load)
    if (btn.classList.contains("active")) {
      selectedCurrency = btn.dataset.currency || "SOL";
      if (currencyLabel) {
        currencyLabel.textContent = selectedCurrency;
      }
    }
  });
}

function getCurrentLang() {
    const langSpan = document.querySelector('.lang-btn span');
    if (!langSpan) return 'EN';
    const langText = langSpan.textContent.trim().toUpperCase();
    if (langText.startsWith('繁')) return '繁';
    if (langText === 'ES') return 'ES';
    if (langText === 'JP') return 'JP';
    return 'EN';
}

/* --- Update wallet button display --- */
function updateConnectButtonDisplay() {
  const currentLang = getCurrentLang();
  
  connectWalletBtns.forEach(btn => {
    if (pubkey) {
      btn.textContent = shortAddr(pubkey);
      btn.classList.add('connected'); // Add a class for connected state styling
      btn.removeAttribute('data-translate'); // Remove translation key
      btn.title = pubkey.toBase58(); // Full address on hover
    } else {
      btn.textContent = translations[currentLang]?.connect_wallet || 'Connect Wallet';
      btn.classList.remove('connected');
      btn.setAttribute('data-translate', 'connect_wallet');
      btn.title = '';
    }
    btn.disabled = false; // Ensure buttons are enabled unless processing
  });

  const presaleConnectBtn = document.getElementById('connect-wallet-2');
  if (buyTmcsBtn && presaleConnectBtn) {
    if (pubkey) {
      buyTmcsBtn.style.display = 'block';
      buyTmcsBtn.removeAttribute('disabled'); // Enable buy button when connected
      buyTmcsBtn.textContent = translations[currentLang]?.buy_truthx || 'BUY TMCS';
      // Hide the second connect wallet button in the presale section if buy button is visible
      presaleConnectBtn.style.display = 'none';
    } else {
      buyTmcsBtn.style.display = 'none';
      // Show the second connect wallet button in the presale section if buy button is hidden
      presaleConnectBtn.style.display = 'block';
    }
  }
}

/* --- Connect Wallet and Event Listeners --- */
async function connectWallet(interactive = true) {
  provider = getSolanaProvider();
  const currentLang = getCurrentLang();

  if (!provider && isMobile && interactive) {
    const modal = document.getElementById('mobile-wallet-notice');
    if (modal) {
        modal.classList.remove('hidden');
    }
    return;
  }

  if (!provider) {
    toast(translations[currentLang]?.no_wallet_detected || "No Solana wallet detected. Please install Phantom / Solflare.", "error");
    connectWalletBtns.forEach(btn => {
      btn.textContent = "Install Wallet"; // Simplified text for now
      btn.classList.remove('connected');
      btn.disabled = false;
    });
    return;
  }

  try {
    // Show 'Connecting...' state
    connectWalletBtns.forEach(btn => {
      btn.disabled = true;
      btn.textContent = 'Connecting...';
    });

    const res = interactive ? await provider.connect() : await provider.connect?.({ onlyIfTrusted: true });
    pubkey = (provider.publicKey || res?.publicKey);
    if (!pubkey) throw new Error("Connection failed.");

    toast(translations[currentLang]?.wallet_connected_success || "Wallet connected successfully!", "success");
    updateConnectButtonDisplay();

    // Listen for account changes and disconnects
    // Use a flag to prevent multiple listeners on the same provider instance
    if (!provider._listenersSetup) {
      if (provider.on) {
        provider.on("accountChanged", (pk) => {
          pubkey = pk; // pk can be null if user disconnects all accounts
          if (!pk) {
            toast(translations[currentLang]?.wallet_disconnected || "Wallet disconnected.", "info");
          } else {
            toast(`${translations[currentLang]?.account_switched || "Account switched to:"} ${shortAddr(pubkey)}`, "info");
          }
          updateConnectButtonDisplay();
        });
        provider.on("disconnect", () => {
          pubkey = null;
          toast(translations[currentLang]?.wallet_disconnected || "Wallet disconnected.", "info");
          updateConnectButtonDisplay();
        });
      }
      provider._listenersSetup = true;
    }

  } catch (e) {
    console.error("Wallet connection error:", e);
    toast(e.message || (translations[currentLang]?.connection_cancelled || "Connection cancelled."), "error");
    pubkey = null; // Ensure pubkey is reset on failure
  } finally {
      updateConnectButtonDisplay();
  }
}

/* --- Send SOL --- */
async function transferSOL(amountStr) {
  const currentLang = getCurrentLang();
  const lamportsBI = toMinorUnits(amountStr, DECIMALS.SOL);
  const lamports = lamportsToNumber(lamportsBI); // legacy Transaction needs number

  const tx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: pubkey,
    toPubkey: DEST,
    lamports
  }));
  const { blockhash, lastValidBlockHeight } = await getLatestBH();
  tx.recentBlockhash = blockhash;
  tx.feePayer = pubkey;

  if (!provider && isMobile) {
    return await signAndSendTransactionMobile(tx);
  }

  let sig;
  if (provider.signAndSendTransaction) {
    const { signature } = await provider.signAndSendTransaction(tx);
    sig = signature;
  } else {
    // This path is for providers that only support signing, not sending
    const signed = await provider.signTransaction(tx);
    sig = await sendRawWithFailover(signed);
  }
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  return sig;
}

/* --- Send SPL (USDC/USDT) --- */
async function transferSPL(mintPk, amountStr, decimals) {
  const currentLang = getCurrentLang();
  // Needs some SOL for transaction fees
  const bal = await conn.getBalance(pubkey, "processed");
  if (bal < 5000) { // 5000 lamports is the minimum fee for a simple transaction
    throw new Error(translations[currentLang]?.insufficient_sol_fee || "Insufficient SOL balance for fees. Please keep a small amount of SOL (recommended ≥0.05).");
  }

  const fromATA = await getAssociatedTokenAddress(mintPk, pubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const toATA = await getAssociatedTokenAddress(mintPk, DEST, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

  const instructions = [];
  // Associated Token Account (ATA) creation is idempotent (no error if it exists)
  instructions.push(createAssociatedTokenAccountIdempotentInstruction(pubkey, fromATA, pubkey, mintPk, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
  instructions.push(createAssociatedTokenAccountIdempotentInstruction(pubkey, toATA, DEST, mintPk, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));

  const amountBI = toMinorUnits(amountStr, decimals);
  // createTransferCheckedInstruction(from, mint, to, owner, amount( BigInt | number ), decimals)
  instructions.push(createTransferCheckedInstruction(fromATA, mintPk, toATA, pubkey, Number(amountBI), decimals, [], TOKEN_PROGRAM_ID));

  const tx = new Transaction().add(...instructions);
  const { blockhash, lastValidBlockHeight } = await getLatestBH();
  tx.recentBlockhash = blockhash;
  tx.feePayer = pubkey;

  if (!provider && isMobile) {
    return await signAndSendTransactionMobile(tx);
  }

  let sig;
  if (provider.signAndSendTransaction) {
    const { signature } = await provider.signAndSendTransaction(tx);
    sig = signature;
  } else {
    const signed = await provider.signTransaction(tx);
    sig = await sendRawWithFailover(signed);
  }
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  return sig;
}

/* --- Mobile Deep Link Transaction --- */
const bs58 = {
  encode: (buffer) => Buffer.from(buffer).toString('base58'),
  decode: (str) => Buffer.from(str, 'base58'),
};

async function signAndSendTransactionMobile(transaction) {
    if (!sharedSecret) throw new Error("Not connected via deep link.");
    
    const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
    const payloadNonce = nacl.randomBytes(24);
    const encryptedPayload = nacl.box(
        serializedTransaction,
        payloadNonce,
        sharedSecret.publicKey,
        dappKeyPair.secretKey
    );
    
    const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
        nonce: bs58.encode(payloadNonce),
        redirect_link: window.location.href.split('?')[0] + "?purchase=1",
        payload: bs58.encode(encryptedPayload),
    });

    const url = `https://phantom.app/ul/v1/signAndSendTransaction?${params.toString()}`;
    window.location.href = url;
    // The promise will not resolve here as the page is redirected.
    // We will handle the result on the redirect page.
    return new Promise(() => {}); // This will never resolve, which is fine.
}

/* --- Purchase Flow --- */
async function onBuyClick() {
  const currentLang = getCurrentLang();
  try {
    if (!pubkey) {
      // If not connected, try to connect interactively. If it fails, return.
      await connectWallet(true);
      if (!pubkey) return;
    }
    const val = (amountInput?.value || "").trim();
    if (!val || isNaN(Number(val)) || Number(val) <= 0) {
      throw new Error(translations[currentLang]?.invalid_amount || "Please enter a valid amount.");
    }

    buyTmcsBtn?.setAttribute("disabled", "true");
    buyTmcsBtn && (buyTmcsBtn.textContent = "Processing…");

    let sig;
    const cur = selectedCurrency.toUpperCase();
    if (cur === "SOL") {
      sig = await transferSOL(val);
    } else if (cur === "USDC") {
      sig = await transferSPL(USDC_MINT, val, DECIMALS.USDC);
    } else if (cur === "USDT") {
      sig = await transferSPL(USDT_MINT, val, DECIMALS.USDT);
    } else {
      throw new Error(translations[currentLang]?.unrecognized_currency || "Unrecognized currency.");
    }

    toast(translations[currentLang]?.transaction_sent_success || "Transaction sent successfully!", "success");
    const url = `https://explorer.solana.com/tx/${sig}?cluster=mainnet`;
    
    setTimeout(() => window.open(url, "_blank"), 200);
  } catch (e) {
    console.error("Purchase failed:", e);
    toast(e.message || (translations[currentLang]?.transaction_failed || "Transaction failed."), "error");
  } finally {
    // Restore button state after any transaction attempt (success or fail)
    buyTmcsBtn && (buyTmcsBtn.textContent = translations[currentLang]?.buy_truthx || "BUY TMCS");
    buyTmcsBtn?.removeAttribute("disabled");
  }
}

async function handleRedirects() {
    const params = new URLSearchParams(window.location.search);
    const currentLang = getCurrentLang();

    if (params.has("errorCode")) {
        const error = params.get("errorMessage") || "An unknown error occurred.";
        toast(error, "error");
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // Handle connect redirect
    if (params.has("phantom_encryption_public_key") && params.has("data") && params.has("nonce")) {
        try {
            const phantomPublicKey = bs58.decode(params.get("phantom_encryption_public_key"));
            const nonce = bs58.decode(params.get("nonce"));
            const encryptedData = bs58.decode(params.get("data"));

            sharedSecret = {
                publicKey: phantomPublicKey,
                secretKey: dappKeyPair.secretKey,
            };
            const decryptedData = nacl.box.open(encryptedData, nonce, phantomPublicKey, dappKeyPair.secretKey);
            if (!decryptedData) throw new Error("Decryption failed");

            const parsedData = JSON.parse(new TextDecoder().decode(decryptedData));
            
            pubkey = new PublicKey(parsedData.public_key);
            session = parsedData.session;
            
            localStorage.setItem('dappSecretKey', bs58.encode(dappKeyPair.secretKey));
            localStorage.setItem('walletData', JSON.stringify({
                publicKey: pubkey.toBase58(),
                session: session
            }));
            
            toast(translations[currentLang]?.wallet_connected_success || "Wallet connected successfully!", "success");
            updateConnectButtonDisplay();

        } catch (error) {
            console.error("Connect redirect error:", error);
            toast("Failed to connect wallet via deep link.", "error");
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Handle purchase redirect
    if (params.has("signature")) {
        const signature = params.get("signature");
        toast(translations[currentLang]?.transaction_sent_success || "Transaction sent successfully!", "success");
        const url = `https://explorer.solana.com/tx/${signature}?cluster=mainnet`;
        setTimeout(() => window.open(url, "_blank"), 200);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/* --- DOM Ready --- */
async function initializeApp() {
    initUI();
    initCountdown();
    initPresaleConverter();
    initFooterFormInteraction();
    initCurrencySwitch();

    // Check for stored deep link session
    const storedSecretKey = localStorage.getItem('dappSecretKey');
    const storedWalletData = localStorage.getItem('walletData');
    if (storedSecretKey && storedWalletData) {
        dappKeyPair = nacl.box.keyPair.fromSecretKey(bs58.decode(storedSecretKey));
        const walletData = JSON.parse(storedWalletData);
        pubkey = new PublicKey(walletData.publicKey);
        session = walletData.session;
        // The public key of phantom is not persisted, it's provided in the redirect
        // We can't build the full shared secret yet, but we have the user pubkey.
        updateConnectButtonDisplay();
    }

    await handleRedirects();

    connectWalletBtns.forEach(btn => {
        btn.addEventListener("click", () => connectWallet(true));
    });

    if (buyTmcsBtn) buyTmcsBtn.addEventListener("click", onBuyClick);

    document.querySelector('.language-switcher')?.addEventListener('click', (e) => {
        if (e.target.closest('li[data-lang]')) {
            setTimeout(updateConnectButtonDisplay, 100);
        }
    });

    // Attempt to connect wallet on page load
    provider = getSolanaProvider();
    if (provider) {
        try {
            // A silent connection attempt first
            await connectWallet(false);
        } catch (err) {
            console.error("Auto-connection failed:", err);
            // Silently fail, user can click to connect.
        }
    }
    updateConnectButtonDisplay();
}

document.addEventListener("DOMContentLoaded", initializeApp);

// END of WALLET INTEGRATION