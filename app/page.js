"use client"

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PipABI from "../abi/PipABI.json";
import ERC20ABI from "../abi/ERC20ABI.json";
import { buildPoseidon } from 'circomlibjs';
import Toastify  from 'toastify-js';
import "toastify-js/src/toastify.css";
import { RingLoader } from "react-spinners";

export default function Home() {

  // ==========================
  // STATE VARIABLES & EFFECTS
  // ==========================

  // Wallet & Transaction Dashboard Tabs
  const [currentAccount, setCurrentAccount] = useState('');
  const [activeTab, setActiveTab] = useState('deposit');

  // Deposit State
  const [generatedNullifier, setGeneratedNullifier] = useState(null);
  const [depositLeaf, setDepositLeaf] = useState('');
  const [depositToken, setDepositToken] = useState('ETH');
  const [depositDenomination, setDepositDenomination] = useState(null);
  const [finalizeDepositOverlay, setFinalizeDepositOverlay] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [depositPending, setDepositPending] = useState(false);

  // Request Gas State
  const [requestGasNullifier, setRequestGasNullifier] = useState('');
  const [requestGasRecipient, setRequestGasRecipient] = useState('');
  const [publishPrivately, setPublishPrivately] = useState(false);
  const [requestGasPending, setRequestGasPending] = useState(false);

  // Send Gas State
  const [pA, set_pA] = useState('');
  const [pB, set_pB] = useState('');
  const [pC, set_pC] = useState('');
  const [sendGasRecipient, setSendGasRecipient] = useState('');
  const [sendGasNullifierHash, setSendGasNullifierHash] = useState('');
  const [sendGasRoot, setSendGasRoot] = useState('');
  const [sendGasPoolAddress, setSendGasPoolAddress] = useState('');
  const [sendGasPending, setSendGasPending] = useState(false);

  // Withdraw State
  const [withdrawNullifier, setWithdrawNullifier] = useState('');
  const [withdrawRecipient, setWithdrawRecipient] = useState('');
  const [withdrawPending, setWithdrawPending] = useState(false);

  // Anonymity Set State
  const [anonTreeIndex, setAnonTreeIndex] = useState('');
  const [anonPoolAddress, setAnonPoolAddress] = useState('');
  const [anonDeposits, setAnonDeposits] = useState('');
  const [anonWithdraws, setAnonWithdraws] = useState('');
  const [anonSet, setAnonSet] = useState('');
  const [anonSetPending, setAnonSetPending] = useState(false);

  // Constants
  const FIELD_SIZE = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  const ZERO_VALUE = BigInt("11122724670666931127833274645309940916396779779585410472511079044548860378081");
  const GAS = 100000000000000n; // 1e14
  const TREE_HEIGHT = 12;
  const COMMITMENT_CONSTANT = 69420n;
  const CHAIN_ID = 11155111n; // Sepolia

  const poolInfo = {
    ETH: {
      "1e15": { label: "0.001", address: "0x4F9380a2f21112Bdca6A7113Cb93E94DC8305746" },
      "2e15": { label: "0.002", address: "0x976AaDBB4B2b834816196F7af887a03FDC335CB2" }
    },
    LINK: {
      "1e16": { label: "0.01", address: "0xfbEd60FE519F120Fd72a9c30C2525995BA0AAca5" },
      "2e16": { label: "0.02", address: "0x09D7E194fd9f01966C8125D32AdfC9F1Be8a40Ee" }
    }
  };
  
  const denominationValues = {
    "1e15": 1000000000000000n,  // 0.001 ETH in wei
    "2e15": 2000000000000000n,  // 0.002 ETH in wei
    "1e16": 10000000000000000n, // 0.01 LINK in wei
    "2e16": 20000000000000000n  // 0.02 LINK in wei
  };

  const tokenAddresses = {
    "LINK": "0x779877A7B0D9E8603169DdbD7836e478b4624789"
  };


  useEffect(() => {
    const wallet = getWallet();
    if (!wallet) return;
    setExistingAccount(wallet);

    const handleAccountsChanged = (accounts) => {
      accounts.length === 0 ? setCurrentAccount(null) : setCurrentAccount(accounts[0]);
    };
    
    wallet.on('accountsChanged', handleAccountsChanged);
  
    return () => {
      wallet.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);


  // ==========================
  // DEPOSIT
  // ==========================

  const initiateDeposit = async () => {
    const _generatedNullifier = await generateNullifier(); 
    const poseidon = await buildPoseidon();
    const _leaf = await computeLeaf(_generatedNullifier, poseidon); 
    setDepositLeaf(_leaf);
    setFinalizeDepositOverlay(true);
  };


  const executeDeposit = async () => {

    // 0. Must have wallet
    const wallet = getWallet();
    if (!wallet) return;

    // 0. Verify user is connected to correct network
    const provider = new ethers.BrowserProvider(wallet);
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
      toast(`Wrong network! Please switch to Chain ID ${CHAIN_ID} (Sepolia)`, 3000, "#ffadb7");
      return;
    }

    // 1. Instantiate specific PIP pool
    const poolAddress = poolInfo[depositToken][depositDenomination].address;
    const signer = await provider.getSigner();
    const pool = new ethers.Contract(poolAddress, PipABI, signer);

    // 2. Check allowance for the ERC20 token, and increase if needed
    const denomination = denominationValues[depositDenomination];
    const tokenAddress = tokenAddresses[depositToken];

    setDepositPending(true);
    if (depositToken !== 'ETH') {
      try {
        const currentAllowance = await checkAllowance(tokenAddress, poolAddress, signer);
        // we only approve the exact denomination each time.
        // If the pool somehow accumulates excess allowance (should never), we skip the approval step.
        currentAllowance < denomination 
          ? await approve(poolAddress, tokenAddress, denomination, signer)
          : console.log("Sufficient allowance, skipping ERC20 token approval.");
      } catch (error) {
        setDepositPending(false);
        toast(`Failed to approve pool to spend ${depositDenomination} ${depositToken} on user's behalf.`, 15000, "#ffadb7")
        return;
      }
    }

    // 3. Execute the deposit
    let tx;
    try {
      depositToken === 'ETH' 
        ? tx = await pool.deposit(depositLeaf, { value: denomination + GAS})
        : tx = await pool.deposit(depositLeaf, { value: GAS });
      toast(`Deposit tx submitted ${tx.hash}`, 6000, "#99ffb1");
      const receipt = await tx.wait();
      toast(`Deposit tx validated in block ${receipt.blockNumber}`, 6000, "#99ffb1");
    } catch (error) {
      toast(`Deposit tx rejected`, 3000, "#ffadb7");
      setDepositPending(false);
      return;
    }
    setDepositPending(false);
    setFinalizeDepositOverlay(false);
    setBackupConfirmed(false);
  };


  // ==========================
  // REQUEST GAS
  // ==========================

  const requestGas = async () => {

    setRequestGasPending(true);

    // 0. Instantiate provider using user's wallet, check correct network.
    // 0. Also, build Poseidon once for all the helpers
    const wallet = getWallet();
    if (!wallet) {
      setRequestGasPending(false);
      return;
    }
    const provider = new ethers.BrowserProvider(wallet); 
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
      toast(`Wrong network! Please switch to Chain ID ${CHAIN_ID} (Sepolia)`, 6000, "#ffadb7");
      setRequestGasPending(false);
      return;
    }

    const poseidon = await buildPoseidon();

    // 1. Sanitize recipient & nullifier data, get pool address
    const recipientData = checkAddress(requestGasRecipient);
    const nullifierData = checkNullifierData(requestGasNullifier);
    if (!recipientData || !nullifierData) {
      setRequestGasPending(false);
      return;
    }

    const { token, denomination, nullifierBigInt } = nullifierData;

    const poolAddress = poolInfo[token][denomination].address;

    // 2. Compute leaf from nullifier
    const _leaf = await computeLeaf(nullifierBigInt, poseidon);

    // 3. Make a query to Envio to get the leaf index and tree index for this leaf's Deposit event
    const indices = await fetchIndicesForLeaf(_leaf, poolAddress);
    if (!indices) {
      setRequestGasPending(false);
      return;
    }

    const {leafIndex, treeIndex} = indices;

    // 4. Compute nullifier hash from nullifier and leaf index
    const nullifierHash = await computeNullifierHash(nullifierBigInt, leafIndex, poseidon);

    // 5. Compute path indices from leaf index
    const pathIndices = computePathIndices(leafIndex);

    // 6. Make a second query to get all the leaves of the tree for the specific pool
    const leaves = await fetchLeavesForTree(treeIndex, poolAddress);
    if (!leaves) {
      setRequestGasPending(false);
      return;
    }

    // 7. Build the specific tree for this pool from all the input leaves.
    const { tree, root } = await buildTree(leaves, poseidon);

    // 8. Calculate pathElements based on the tree.
    const pathElements = getPathElements(tree, leafIndex);
    const formattedPathElements = await formatPathElements(pathElements, poseidon);

    // 9. Gather all witness inputs
    const input = {
      recipient: BigInt(requestGasRecipient).toString(),
      nullifierHash: nullifierHash.toString(),
      root: root.toString(),
      nullifier: nullifierBigInt.toString(),
      pathElements: formattedPathElements,
      pathIndices: pathIndices
    };

    // 10. Generate proof with input
    const fullProof = await generateProof(input);
    if (!fullProof) {
      setRequestGasPending(false);
      return;
    }
    const { proof, publicSignals} = fullProof;

    // 11. Validate proof with snarkjs
    const isValidProof = await validateProof(proof, publicSignals);
    if (!isValidProof) {
      setRequestGasPending(false);
      toast("Snarkjs proof validation failed.", 3000, "#ffadb7");
      return;
    }

    // 12. Format proof and signals. 
    const formattedProof = {
      pA: [proof.pi_a[0], proof.pi_a[1]],
      // `snarkjs.fullProve` - We must manually switch X and Y coordinates of pB to match solidity verifier
      // `snarkjs generatecall` with node.js - automatically switches X and Y coordinates of pB to match solidity verifier
      pB: [ [proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]] ],
      pC: [proof.pi_c[0], proof.pi_c[1]]
    };

    const formattedPublicSignals = {
      recipient: requestGasRecipient,
      // JS removes leading zero padding. Adds back if needed. 66 characters always required for bytes32 in solidity.
      nullifierHash: `0x${BigInt(publicSignals[1]).toString(16).padStart(64, "0")}`,
      root: `0x${BigInt(publicSignals[2]).toString(16).padStart(64, "0")}`
    };

    // 13. Ensure proof has not already been used to send gas.
    try {
      const pool = new ethers.Contract(poolAddress, PipABI, provider);
      await pool.checkProof(formattedProof, formattedPublicSignals, 0); // 0 = ProofType.Gas
      console.log("Proof is valid. Root from proof matched. Proof hasn't been used to send gas yet. Publishing proof...");
    } catch (error) {
      toast(`checkProof call failed.\n1. Proof already spent and recipient already has gas\n2. Root from the proof doesn't match any roots in the pool\n3. Proof passed snarkjs verification but not solidity verification`, 10000, "#ffadb7");
      setRequestGasPending(false);
      return;
    }

    // 14. Publish proof privately or publicly.
    if (publishPrivately) {
      saveProofToFile(formattedProof, formattedPublicSignals, poolAddress);
    } else {
      try {
        await sendTelegramMessage(formattedProof, formattedPublicSignals, poolAddress);
      } catch {
        return;
      }
    }
    setRequestGasPending(false);
    toast("Proof successfully published!", 5000, "#99ffb1");
  };


  // ==========================
  // SEND GAS
  // ==========================

  const sendGas = async () => {

    // 0. Format user inputs
    const pA_values = pA.split(',').map(val => val.trim());
    const pB_values = pB.split(',').map(val => val.trim());
    const pC_values = pC.split(',').map(val => val.trim());

    if (pA_values.length !== 2 || pB_values.length !== 4 || pC_values.length !== 2) {
      toast("Incorrectly formatted proof values", 3000, "#ffadb7");
      return;
    }

    const formattedProof = {
      pA: pA_values,
      pB: [ [pB_values[0], pB_values[1]], [pB_values[2], pB_values[3]] ],
      pC: pC_values
    };

    const recipientData = checkAddress(sendGasRecipient);
    if (!recipientData) return;

    const formattedPublicSignals = {
      recipient: sendGasRecipient,
      nullifierHash: sendGasNullifierHash,
      root: sendGasRoot
    };

    // 0. Must have wallet
    const wallet = getWallet();
    if (!wallet) return;

    // 0. Verify user is connected to correct network
    const provider = new ethers.BrowserProvider(wallet);
    const signer = await provider.getSigner();

    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
      toast(`Wrong network! Please switch to Chain ID ${CHAIN_ID} (Sepolia)`, 6000, "#ffadb7");
      return;
    }

    // 1. Instantiate pool contract
    const pool = new ethers.Contract(sendGasPoolAddress, PipABI, signer);

    // 2. Ensure proof is correct and hasn't been used to send gas yet.
    setSendGasPending(true);
    try {
      await pool.checkProof(formattedProof, formattedPublicSignals, 0); // 0 = ProofType.Gas
    } catch (error) {
      toast("Failure to send gas.\n1. Incorrect proof/signal inputs\n2. Nullifier Hash for proof has already been used to send gas.", 6000, "#ffadb7");
      setSendGasPending(false);
      return;
    }

    // 3. Execute sendGas()
    try {
      const tx = await pool.sendGas(formattedProof, formattedPublicSignals);
      toast(`Send Gas tx submitted ${tx.hash}`, 6000, "#99ffb1");
      const receipt = await tx.wait();
      toast(`Send Gas tx validated in block ${receipt.blockNumber}`, 6000, "#99ffb1");
    } catch (error) {
      toast(`Send Gas tx failed`, 3000, "#ffadb7");
      setSendGasPending(false);
      return;
    }
    setSendGasPending(false);
  };


  // ==========================
  // WITHDRAW
  // ==========================

  const withdraw = async () => {
    setWithdrawPending(true);

    // 0. Instantiate provider, signer, and build poseidon for helper functions
    const wallet = getWallet();
    if (!wallet) {
      setWithdrawPending(false);
      return;
    }
    const provider = new ethers.BrowserProvider(wallet); 
    const signer = await provider.getSigner();
    const poseidon = await buildPoseidon();

    // 0. Verify user is connected to correct network
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
      setWithdrawPending(false);
      toast(`Wrong network! Please switch to Chain ID ${CHAIN_ID} (Sepolia)`, 3000, "#ffadb7");
      return;
    }

    // 1. Sanitize recipient & nullifier data, get pool address
    const recipientData = checkAddress(withdrawRecipient);
    const nullifierData = checkNullifierData(withdrawNullifier);
    if (!recipientData || !nullifierData) {
      setWithdrawPending(false);
      return;
    }

    const { token, denomination, nullifierBigInt } = nullifierData;
    const poolAddress = poolInfo[token][denomination].address;

    // 2. Compute leaf from nullifier
    const _leaf = await computeLeaf(nullifierBigInt, poseidon);

    // 3. Make a query to Envio to get the leaf index and tree index for our Deposit event
    const indices = await fetchIndicesForLeaf(_leaf, poolAddress);
    if (!indices) {
      setWithdrawPending(false);
      return;
    }

    const {leafIndex, treeIndex} = indices;

    // 4. Compute nullifier hash from nullifier and leaf index
    const nullifierHash = await computeNullifierHash(nullifierBigInt, leafIndex, poseidon);

    // 5. Compute path indices from leaf index
    const pathIndices = computePathIndices(leafIndex);

    // 6. Make a second query to get all the leaves of the tree for the specific pool
    const leaves = await fetchLeavesForTree(treeIndex, poolAddress);
    if (!leaves) {
      setWithdrawPending(false);
      return;
    }

    // 7. Build the specific tree for this pool from all the input leaves.
    const { tree, root } = await buildTree(leaves, poseidon);

    // 8. Calculate pathElements based on the tree.
    const pathElements = getPathElements(tree, leafIndex);
    const formattedPathElements = await formatPathElements(pathElements, poseidon);

    // 9. Gather all witness inputs
    const input = {
      recipient: BigInt(withdrawRecipient).toString(),
      nullifierHash: nullifierHash.toString(),
      root: root.toString(),
      nullifier: nullifierBigInt.toString(),
      pathElements: formattedPathElements,
      pathIndices: pathIndices
    };

    // 10. Generate proof with input
    const fullProof = await generateProof(input);
    if (!fullProof) {
      setWithdrawPending(false);
      return;
    }
    const { proof, publicSignals} = fullProof;

    // 11. Validate proof with snarkjs
    const isValidProof = await validateProof(proof, publicSignals);
    if (!isValidProof) {
      setWithdrawPending(false);
      toast("Snarkjs proof validation failed.", 3000, "#ffadb7");
      return;
    }

    // 12. Format proof and signals. 
    const formattedProof = {
      pA: [proof.pi_a[0], proof.pi_a[1]],
      // `snarkjs.fullProve` - We must manually switch X and Y coordinates of pB to match solidity verifier
      // `snarkjs generatecall` with node.js - automatically switches X and Y coordinates of pB to match solidity verifier
      pB: [ [proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]] ],
      pC: [proof.pi_c[0], proof.pi_c[1]]
    };

    const formattedPublicSignals = {
      recipient: withdrawRecipient,
      // JS removes leading zero padding. Adds back if needed. 66 characters always required for bytes32 in solidity.
      nullifierHash: `0x${BigInt(publicSignals[1]).toString(16).padStart(64, "0")}`,
      root: `0x${BigInt(publicSignals[2]).toString(16).padStart(64, "0")}`
    };

    // 13. Ensure proof has not already been used to withdraw
    const pool = new ethers.Contract(poolAddress, PipABI, signer);

    try {
      await pool.checkProof(formattedProof, formattedPublicSignals, 1); // 1 = ProofType.Withdraw
      console.log("Proof is valid. Root from proof matched. Proof hasn't been used to withdraw. Withdrawing...");
    } catch (error) {
      toast(`checkProof call failed.\n1. Nullifier Hash from proof already spent and recipient got withdraw.\n2. Proof passed snarkjs verification but somehow failed solidity verification. `, 10000, "#ffadb7");
      setWithdrawPending(false);
      return;
    }

    // 14. Execute withdraw
    try {
      const tx = await pool.withdraw(formattedProof, formattedPublicSignals);
      toast(`Withdraw tx submitted ${tx.hash}`, 6000, "#99ffb1");
      const receipt = await tx.wait();
      toast(`Withdraw tx validated in block ${receipt.blockNumber}`, 6000, "#99ffb1");
    } catch (error) {
      toast(`Withdraw tx failed`, 3000, "#ffadb7");
      setWithdrawPending(false);
      return;
    }

    setWithdrawPending(false);
  };


  // ==========================
  // ERC20 TOKEN HELPERS
  // ==========================

  const checkAllowance = async (tokenAddress, spender, signer) => {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, signer);
    const owner = await signer.getAddress();
    return await tokenContract.allowance(owner, spender);
  };


  const approve = async (pool, tokenAddress, denomination, signer) => {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, signer);
    const approveTx = await tokenContract.approve(pool, denomination);
    await approveTx.wait();
  };


  // ==========================
  // USER INPUT CHECKS
  // ==========================

  const checkAddress = (_address) => {
    if (!_address.startsWith('0x') || _address.length !== 42) {
      toast('Invalid address.', 3000, "#ffadb7");
      return null;
    }
    return _address;
  };


  const checkNullifierData = (nullifier) => {
    // Parse nullifier input
    const nullifierData = nullifier.split('-');

    // Must be structured correctly
    if (nullifierData.length !== 3) {
      toast(`Invalid input format. Expected: {TOKEN}-{DENOMINATION}-{NULLIFIER}`, 3000, "#ffadb7");
      return null;
    }

    const [_token, _denomination, _nullifier] = nullifierData;
 
    // Validate token-denomination pair
    if (!poolInfo[_token]?.[_denomination]) {
      toast(`Invalid token-denomination pair: ${_token}-${_denomination}`, 3000, "#ffadb7");
      return null;
    }
    
    // Check nullifier existence
    if (!_nullifier) {
      toast('Nullifier value missing', 3000, "#ffadb7");
      return null;
    }

    // Safe convert to BigInt
    let _nullifierBigInt;
    try {
      _nullifierBigInt = BigInt(_nullifier);
      if (_nullifierBigInt >= FIELD_SIZE) {
        toast('Nullifier exceeds field size.', 3000, "#ffadb7");
        return null;
      }
    } catch (error) {
      toast('Invalid nullifier format. Must be a valid number.', 3000, "#ffadb7");
      return null;
    }

    return { token: _token, denomination: _denomination, nullifierBigInt: _nullifierBigInt };
  };


  // ==========================
  // TREE CALCULATIONS
  // ==========================

  const buildTree = async (leaves, poseidon) => {

    // convert leaves to BigInt
    const _leaves = leaves.map(leaf => BigInt(leaf));

    // tree[y][x] where y = TREE_HEIGHT, x = index
    const tree = Array(TREE_HEIGHT + 1).fill().map(() => []);
    
    // Fill non-zero commitment leafs at height 0
    for (let i = 0; i < _leaves.length; i++) {
      tree[0][i] = _leaves[i];
    }
    
    // Fill 'empty' leaf nodes at height 0 with zero value
    for (let i = _leaves.length; i < 2**TREE_HEIGHT; i++) {
      tree[0][i] = ZERO_VALUE;
    }
    
    // Calculate tree node values
    for (let y = 1; y <= TREE_HEIGHT; y++) {

      const nodes = 2**(TREE_HEIGHT - y)

      for (let x = 0; x < nodes; x++) {
          const leftChild = tree[y-1][2*x];
          const rightChild = tree[y-1][2*x+1];
          tree[y][x] = poseidon([leftChild, rightChild]);
      }
    }

    const root = poseidon.F.toString(tree[TREE_HEIGHT][0], 10);
    return { tree, root };
  };


  const getPathElements = (tree, leafIndex) => {
    const pathElements = [];
    let x = BigInt(leafIndex);
    
    for (let y = 0; y < TREE_HEIGHT; y++) {
      const siblingX = x % 2n === 0n ? x + 1n : x - 1n;
      pathElements.push(tree[y][Number(siblingX)]); // Convert back to Number for array index
      x = x / 2n;
    }
    
    return pathElements;
  };


  const formatPathElements = async (pathElements, poseidon) => {
    return pathElements.map(element => typeof element === "bigint" ? element.toString() : poseidon.F.toString(element, 10));
  };


  // ==========================
  // WITNESS COMPUTATIONS
  // ==========================

  const generateNullifier = async () => {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    const nullifierHex = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const nullifier = BigInt(nullifierHex) % FIELD_SIZE;
    setGeneratedNullifier(nullifier);
    return nullifier;
  };


  const computeLeaf = async (nullifier, poseidon) => {
    const hash = poseidon([nullifier, COMMITMENT_CONSTANT]);
    // JS removes leading zero padding. Adds back if needed. 66 characters always required for bytes32 in solidity.
    const _leaf = '0x' + poseidon.F.toString(hash, 16).padStart(64, '0');
    return _leaf;
  };


  const computeNullifierHash = async (nullifier, leafIndex, poseidon) => {
    const hash = poseidon([nullifier, leafIndex]);
    const nullifierHash = poseidon.F.toString(hash, 10);
    return nullifierHash;
  };


  const computePathIndices = (leafIndex) => {
    // Path index values are reversed for circom.
    // Ex: TREE_HEIGHT = 4, leafIndex = 5 --> 101 --> 0101 (pad) --> 1010 (reverse) --> [1,0,1,0]
    return leafIndex.toString(2).padStart(TREE_HEIGHT, '0').split('').reverse().map(Number);
  };


  // ==========================
  // PROOF HELPERS
  // ==========================

  const generateProof = async (input) => {

    if (!window.snarkjs) {
      toast("snarkjs.min.js failed to load.", 3000, "#ffadb7");
      return null;
    }

    try {
      const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(
        input, 
        "/withdraw.wasm", 
        "/withdraw_0001.zkey"
      );
      
      return { proof, publicSignals };
    } catch (error) {
      toast("Snarkjs could not generate proof.", 3000, "#ffadb7");
      return null;
    }
  };


  const validateProof = async (proof, publicSignals) => {
    try {
      const vkeyRes = await fetch("/verification_key.json");
      const vkey = await vkeyRes.json();
      const isValidProof = await window.snarkjs.groth16.verify(vkey, publicSignals, proof);
      return isValidProof;
    } catch (error) {
      return false;
    }
  };


  // ==========================
  // ROUTES (Envio & Telegram)
  // ==========================

  const fetchIndicesForLeaf = async (_leaf, _poolAddress) => {
    try {
      const response = await fetch('/api/envioFetchIndices', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ leaf: _leaf, poolAddress: _poolAddress})
      });
  
      const result = await response.json();
      
      if (!result.success) {
        toast(`${result.error}`, 3000, "#ffadb7");
        return null;
      }
      
      return { leafIndex: BigInt(result.data.leafIndex), treeIndex: BigInt(result.data.treeIndex) };
    } catch (error) {
      toast("Error fetching indices for leaf.", 3000, "#ffadb7");
      return null;
    }
  };


  const fetchLeavesForTree = async (_treeIndex, _poolAddress) => {
    try {
      const response = await fetch('/api/envioFetchLeaves', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ treeIndex: _treeIndex.toString(), poolAddress: _poolAddress })
      });
  
      const result = await response.json();
      
      if (!result.success) {
        toast(`${result.error}`, 3000, "#ffadb7");
        return null;
      }

      return result.data.leaves;
    } catch (error) {
      toast("Error fetching leaves for tree", 3000, "#ffadb7");
      return null;
    }
  };


  const sendTelegramMessage = async (proof, pubSignals, poolAddress) => {
    try {
      const message = `PROOF
      \npA: ${proof.pA[0]}, ${proof.pA[1]}
      \npB: ${proof.pB[0][0]}, ${proof.pB[0][1]}, ${proof.pB[1][0]}, ${proof.pB[1][1]}
      \npC: ${proof.pC[0]}, ${proof.pC[1]}
      \nPUBLIC SIGNALS
      \nRecipient: ${pubSignals.recipient}\nNullifier Hash: ${pubSignals.nullifierHash}\nRoot: ${pubSignals.root}\nPool Address: ${poolAddress}`;

      await fetch('/api/telegram', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message})
      });
    } catch (error) {
      setRequestGasPending(false);
      toast("Failure to post Telegram message.", 3000, "#ffadb7");
      throw error;
    }
  };


  const fetchAnonymitySet = async () => {

    const addressReturn = checkAddress(anonPoolAddress);
    if (!addressReturn) return;

    const addressExists = Object.values(poolInfo).some(pools =>
      Object.values(pools).some(pool => pool.address === anonPoolAddress)
    );

    if (!addressExists) {
      toast("Not a valid pool address", 6000, "#ffadb7");
      return;
    }

    setAnonSetPending(true);
    let deposits = 0;
    let withdraws = 0;
    try {
      // Deposits
      const depositResponse = await fetch('/api/envioFetchDepositCount', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ treeIndex: anonTreeIndex, poolAddress: anonPoolAddress})
      });
  
      const depositResult = await depositResponse.json();
      
      if (depositResult.success) {
        deposits = depositResult.data.depositCount;
        setAnonDeposits(deposits);
      } else {
        toast(`${depositResult.error}`, 6000, "#ffadb7");
      }

      // Withdraws
      const withdrawResponse = await fetch('/api/envioFetchWithdrawCount', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ treeIndex: anonTreeIndex, poolAddress: anonPoolAddress})
      });
  
      const withdrawResult = await withdrawResponse.json();
      
      if (withdrawResult.success) {
        withdraws = withdrawResult.data.withdrawCount;
        setAnonWithdraws(withdraws);
      } else {
        toast(`${withdrawResult.error}`, 6000, "#ffadb7");
      }

      // Anon set
      const anonymitySet = deposits - withdraws;
      setAnonSet(anonymitySet);
      
    } catch (error) {
      toast("Error fetching anonymity set data.", 6000, "#ffadb7");
    } finally {
      setAnonSetPending(false);
    }
  };


  // ==========================
  // FILE DOWNLOADS
  // ==========================

  const saveNullifierToFile = (nullifier, token, denomination) => {
    const nullifierStr = nullifier.toString();
    const abbreviatedNullifier = nullifierStr.substring(0, 8);

    const filename = `${token}-${denomination}-${abbreviatedNullifier}.txt`;
    const fileContent = `${token}-${denomination}-${nullifierStr}`;
    const blob = new Blob([fileContent], { type: 'text/plain' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


  const saveProofToFile = (proof, pubSignals, poolAddress) => {
    const abbreviated_pA = proof.pA[0].substring(0, 8);

    const filename = `proof-${abbreviated_pA}.txt`;
    const fileContent = `PROOF
      \npA: ${proof.pA[0]}, ${proof.pA[1]}
      \npB: ${proof.pB[0][0]}, ${proof.pB[0][1]}, ${proof.pB[1][0]}, ${proof.pB[1][1]}
      \npC: ${proof.pC[0]}, ${proof.pC[1]}
      \nPUBLIC SIGNALS
      \nRecipient: ${pubSignals.recipient}\nNullifier Hash: ${pubSignals.nullifierHash}\nRoot: ${pubSignals.root}\nPool Address: ${poolAddress}`;
    const blob = new Blob([fileContent], { type: 'text/plain' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


  // ==========================
  // UI HELPERS
  // ==========================

  const toast = (message, duration, color) => {
    Toastify({
      text: message, 
      duration: duration, 
      close: true, 
      gravity: 'top', 
      position: 'left', 
      style: {background: color, color: "black", borderRadius: "32px", zIndex: 100}
    }).showToast();
  };


  const truncateAddress = (address) => {
    if (!address) return "";
    const prefix = address.slice(0, 6);
    const suffix = address.slice(-4);
    return `${prefix}...${suffix}`;
  };


  // ==========================
  // WALLET CONNECTION
  // ==========================

  const getWallet = () => {
    const wallet = window.ethereum;
    if (!wallet) {
      toast('No wallet found. Ensure you have a wallet installed.', 3000, "#ffadb7");
      return null;
    }
    return wallet;
  };


	const setExistingAccount = async (wallet) => {
		try {
			const accounts = await wallet.request({ method: 'eth_accounts'});
			if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
			}
		} catch (error) {
      toast(`Failed to set an existing account.`, 3000, "#ffadb7");
		}
	};


	const requestWalletConnection = async () => {
		try {
      const wallet = getWallet();
      if (!wallet) return;

      if (currentAccount) {
        toast(`Currently connected with ${currentAccount}.\nTo change accounts, you may need to switch or disconnect your account via your wallet's connection settings, depending on your wallet provider.`, 10000, "#ffadb7");
      } else {
        const accounts = await wallet.request({method: 'eth_requestAccounts'});
        setCurrentAccount(accounts[0]);
        toast(`${accounts[0]} connected`, 3000, "#99ffb1");
      }
		} catch (error) {
			toast(`Failed to connect account.`, 3000, "#ffadb7");
		}
	};


  // ==========================
  // USER INTERFACE
  // ==========================

  return (
    <main 
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 text-white"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      
      {/* Wallet Connection */}
      <div className="flex justify-end pt-4 pr-4 h-40">
        <div className="flex flex-col items-end">
          <div className="flex space-x-4">
            <button onClick={requestWalletConnection} className="p-2 border-2 font-bold text-gray-950 bg-gray-500 rounded-2xl">Connect Wallet</button>
          </div>
          <div className="h-6 mt-1 pr-4">
            {currentAccount && (<div className="text-gray-300 font-bold">{truncateAddress(currentAccount)}</div>)}
          </div>
        </div>
      </div>

      {/* Transaction Dashboard */}
      <div className="w-full max-w-2xl mx-auto">

        {/* Transaction Tabs */}
        <div className="flex">

          <button
            className={`px-4 py-3 text-lg font-bold rounded-t-lg border-1 text-black hover:bg-gray-400
              ${activeTab === 'deposit' ? 'bg-gray-400' : 'bg-gray-500'}`}
            onClick={() => setActiveTab('deposit')}
          >Deposit</button>

          <button
            className={`px-4 py-3 text-lg font-bold rounded-t-lg border-1 text-black hover:bg-gray-400
              ${activeTab === 'requestGas' ? 'bg-gray-400' : 'bg-gray-500'}`}
            onClick={() => setActiveTab('requestGas')}
          >Request Gas</button>

          <button
            className={`px-4 py-3 text-lg font-bold rounded-t-lg border-1 text-black hover:bg-gray-400
              ${activeTab === 'sendGas' ? 'bg-gray-400' : 'bg-gray-500'}`}
            onClick={() => setActiveTab('sendGas')}
          >Send Gas</button>

          <button
            className={`px-4 py-3 text-lg font-bold rounded-t-lg border-1 text-black hover:bg-gray-400
              ${activeTab === 'withdraw' ? 'bg-gray-400' : 'bg-gray-500'}`}
            onClick={() => setActiveTab('withdraw')}
          >Withdraw</button>

          <button
            className={`px-4 py-3 text-lg font-bold rounded-t-lg border-1 text-black hover:bg-gray-400
              ${activeTab === 'anon' ? 'bg-gray-400' : 'bg-gray-500'}`}
            onClick={() => setActiveTab('anon')}
          >Anonymity Set</button>
        </div>
        
        {/* Transaction Dashboard Content */}
        <div className="relative bg-gray-500 border border-gray-700 rounded-b-lg rounded-tr-lg p-6 min-h-[300px]">


          {/* Initiate Deposit Content */}
          {activeTab === 'deposit' && (
            <div className="space-y-6">

              {/* Token Options */}
              <div className="grid grid-cols-2 gap-4">
                {['ETH', 'LINK'].map((token) => (
                  <button
                    key={token}
                    onClick={() => {
                      setDepositToken(token);
                      setDepositDenomination(null); // Reset denomination when token changes
                    }}
                    className={`border-2 border-gray-900 rounded-lg p-4 cursor-pointer transition-colors flex justify-center items-center 
                      text-black text-2xl font-bold 
                      ${depositToken === token ? 'bg-gray-400' : 'bg-gray-500 hover:bg-gray-400'}`}
                  >
                    {token}
                  </button>
                ))}
              </div>
              
              {/* Denomination Options */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {depositToken &&
                  Object.entries(poolInfo[depositToken]).map(([value, option]) => (
                    <button
                      key={value}
                      onClick={() => setDepositDenomination(value)}
                      className={`border-2 border-gray-900 rounded-lg p-4 cursor-pointer transition-colors flex justify-center items-center 
                        text-black text-2xl font-bold 
                        ${depositDenomination === value ? 'bg-gray-400' : 'bg-gray-500 hover:bg-gray-400'}`}
                    >
                      {option.label}
                    </button>
                  ))}
              </div>
              
              {/* Initiate Deposit Button */}
              <div className="pt-6">
                <button
                  onClick={initiateDeposit}
                  disabled={!depositDenomination}
                  className="button"
                >
                  Initiate Deposit
                </button>
              </div>
              
              {/* Display Pool Address */}
              <div className="text-black font-bold mt-4">
                {depositDenomination && (
                  <div>Pool Address: {poolInfo[depositToken][depositDenomination].address}</div>
                )}
              </div>
            </div>
          )}

          {/* Finalize Deposit Overlay */}
          {finalizeDepositOverlay && (
            <div 
              className="fixed inset-0 bg-cover bg-center bg-no-repeat flex items-center justify-center z-20"
              style={{ backgroundImage: "url('/background.png')" }}
            >
              <div className="bg-gray-500 border-2 border-gray-900 rounded-lg p-6 max-w-md w-full mx-4 relative">

              {/* Ring Loader */}
              {depositPending && (
                <div className="ringloader">
                  <div>
                    <RingLoader color="#4d004d" size={300} speedMultiplier={0.5}/>
                  </div>
                </div>
              )}

                {/* Header and 'X' */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-black flex-grow text-center">Nullifier</h2>
                  <button 
                    onClick={() => setFinalizeDepositOverlay(false)} 
                    className="text-black text-xl hover:text-gray-300 font-bold"
                    disabled={depositPending}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Nullifier Display */}
                <div className="bg-gray-400 p-3 rounded-md mb-6 border-2 border-gray-900 overflow-x-auto">
                  <p className="text-black font-bold break-all font-mono text-sm">
                    {depositToken}-{depositDenomination}-{generatedNullifier}
                  </p>
                </div>

                {/* Nullifier Info Message */}
                <div className="mb-6 text-black font-bold">
                  <p className="mb-2">This NULLIFIER is REQUIRED to WITHDRAW and request gas for your deposit. Click below if you wish to save your nullifier in a text file.</p>
                </div>

                {/* Backup Nullifier Button */}
                <div className="mb-6">
                  <button
                    onClick={() => saveNullifierToFile(generatedNullifier, depositToken, depositDenomination)}
                    className="button"
                    disabled={depositPending}
                  >
                    Backup Nullifier
                  </button>
                </div>

                <div className="mb-6 text-black font-bold">
                  <p className="mb-2">WARNING: Once you click "Execute Deposit", this nullifier will PERMANENTLY disappear. If you don't save your nullifier you LOSE YOUR DEPOSIT.</p>
                </div>

                {/* Checkbox Confirmation */}
                <div className="flex items-center mb-6 relative group">
                  <input 
                    type="checkbox" 
                    id="backupConfirmation" 
                    className="mr-2"
                    checked={backupConfirmed}
                    onChange={(e) => setBackupConfirmed(e.target.checked)}
                    disabled={depositPending}
                  />
                  <label htmlFor="backupConfirmation" className="text-black font-bold cursor-pointer">
                    I understand
                  </label>
                </div>
                
                {/* Execute Deposit Button */}
                <button
                  onClick={executeDeposit}
                  disabled={!backupConfirmed || depositPending}
                  className="button"
                >
                  Execute Deposit
                </button>

              </div>
            </div>
          )}


          {/* Request Gas Content */}
          {activeTab === 'requestGas' && (
            <div className="space-y-6">

              {/* Ring Loader */}
              {requestGasPending && (
                <div className="ringloader">
                  <div>
                    <RingLoader color="#4d004d" size={300} speedMultiplier={0.5}/>
                  </div>
                </div>
              )}

              {/* Nullifier Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Nullifier</label>
                <input
                  type="text"
                  value={requestGasNullifier}
                  onChange={(e) => setRequestGasNullifier(e.target.value)}
                  placeholder="ETH-1e15-12345678901234567890..."
                  className="input-field"
                />
              </div>
              
              {/* Recipient Address Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Recipient</label>
                <input
                  type="text"
                  value={requestGasRecipient}
                  onChange={(e) => setRequestGasRecipient(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>

              {/* Checkbox Confirmation */}
              <div className="flex items-center mb-6 relative group">
                <input 
                  type="checkbox" 
                  id="publishPrivately" 
                  className="mr-2"
                  checked={publishPrivately}
                  onChange={(e) => setPublishPrivately(e.target.checked)}
                  disabled={requestGasPending}
                />
                <label htmlFor="publishPrivately" className="text-black font-bold cursor-pointer">
                  Publish proof privately?
                </label>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-400 rounded-xl text-black border-2 border-gray-900  p-2 w-128">
                Publishing the proof privately saves it as a text file. If this box is unchecked, the proof is posted publicly on Telegram at `t.me/pulseinprivate` for anonymous relayers to fulfill. If your recipient address already has enough gas to withdraw, YOU CAN EARN THE RELAYER FEES YOURSELF by calling send gas from your recipient address.
                </div>
              </div>
              
              {/* Request Gas Button */}
              <div className="pt-4">
                <button
                  onClick={requestGas}
                  disabled={!requestGasNullifier || !requestGasRecipient || requestGasPending}
                  className="button"
                >
                  Request Gas
                </button>
              </div>
            </div>
          )}
          

          {/* Send Gas Content */}
          {activeTab === 'sendGas' && (
            <div className="space-y-6">

              {/* Ring Loader */}
              {sendGasPending && (
                <div className="ringloader">
                  <div>
                    <RingLoader color="#4d004d" size={300} speedMultiplier={0.5}/>
                  </div>
                </div>
              )}

              {/* Proof Points */}
              <div>
                <label className="text-black font-bold block mb-1 px-2">pA</label>
                <input
                  type="text"
                  value={pA}
                  onChange={(e) => set_pA(e.target.value)}
                  placeholder="1234, 5678"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-black font-bold block mb-1 px-2">pB</label>
                <input
                  type="text"
                  value={pB}
                  onChange={(e) => set_pB(e.target.value)}
                  placeholder="6969, 1234, 1337, 9876"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-black font-bold block mb-1 px-2">pC</label>
                <input
                  type="text"
                  value={pC}
                  onChange={(e) => set_pC(e.target.value)}
                  placeholder="9876, 5432"
                  className="input-field"
                />
              </div>

              {/* Public Signals */}
              <div>
                <label className="text-black font-bold block mb-1 px-2">Recipient Address</label>
                <input
                  type="text"
                  value={sendGasRecipient}
                  onChange={(e) => setSendGasRecipient(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-black font-bold block mb-1 px-2">Nullifier Hash</label>
                <input
                  type="text"
                  value={sendGasNullifierHash}
                  onChange={(e) => setSendGasNullifierHash(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-black font-bold block mb-1 px-2">Root</label>
                <input
                  type="text"
                  value={sendGasRoot}
                  onChange={(e) => setSendGasRoot(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>
              
              {/* Pool Address Input */}
              <div>
                <label className="text-black font-bold block mb-1 px-2">Pool Address</label>
                <input
                  type="text"
                  value={sendGasPoolAddress}
                  onChange={(e) => setSendGasPoolAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>

              {/* Send Gas Button */}
              <div className="pt-4">
                <button
                  onClick={sendGas}
                  disabled={!pA || !pB || !pC || !sendGasRecipient || !sendGasNullifierHash || !sendGasRoot || !sendGasPoolAddress || sendGasPending}
                  className="button"
                >
                  Send Gas
                </button>
              </div>
            </div>
          )}


          {/* Withdraw Content */}
          {activeTab === 'withdraw' && (
            <div className="space-y-6">

              {/* Ring Loader */}
              {withdrawPending && (
                <div className="ringloader">
                  <div>
                    <RingLoader color="#4d004d" size={250} speedMultiplier={0.5}/>
                  </div>
                </div>
              )}

              {/* Nullifier Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Nullifier</label>
                <input
                  type="text"
                  value={withdrawNullifier}
                  onChange={(e) => setWithdrawNullifier(e.target.value)}
                  placeholder="ETH-1e15-12345678901234567890..."
                  className="input-field"
                />
              </div>
              
              {/* Recipient Address Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Recipient</label>
                <input
                  type="text"
                  value={withdrawRecipient}
                  onChange={(e) => setWithdrawRecipient(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>
              
              {/* Withdraw Button */}
              <div className="pt-4">
                <button
                  onClick={withdraw}
                  disabled={!withdrawNullifier || !withdrawRecipient || withdrawPending}
                  className="button"
                >
                  Execute Withdraw
                </button>
              </div>
            </div>
          )}


          {/* Anonymity Set Content */}
          {activeTab === 'anon' && (
            <div className="space-y-6">

              {/* Ring Loader */}
              {anonSetPending && (
                <div className="ringloader">
                  <div>
                    <RingLoader color="#4d004d" size={250} speedMultiplier={0.5}/>
                  </div>
                </div>
              )}

              {/* Nullifier Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Tree Index</label>
                <input
                  type="text"
                  value={anonTreeIndex}
                  onChange={(e) => setAnonTreeIndex(e.target.value)}
                  placeholder="69"
                  className="input-field"
                />
              </div>
              
              {/* Pool Address Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Pool Address</label>
                <input
                  type="text"
                  value={anonPoolAddress}
                  onChange={(e) => setAnonPoolAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>
              
              {/* Get Anonymity Set Button */}
              <div className="pt-4">
                <button
                  onClick={fetchAnonymitySet}
                  disabled={!anonTreeIndex || !anonPoolAddress || anonSetPending}
                  className="button"
                >
                  Current Anonymity Set
                </button>
              </div>

              {/* Display Anonymity Set */}
              <div className="text-black font-bold mt-4">
                {anonDeposits !== '' && anonWithdraws !== '' && (
                  <p>Deposits: {anonDeposits} Withdraws: {anonWithdraws} Anonymity Set: {anonSet}</p>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

    </main>
  );
}