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
  const [depositToken, setDepositToken] = useState('PLS');
  const [depositDenomination, setDepositDenomination] = useState(null);
  const [finalizeDepositOverlay, setFinalizeDepositOverlay] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [depositPending, setDepositPending] = useState(false);

  // Request Withdraw State
  const [requestWithdrawNullifier, setRequestWithdrawNullifier] = useState('');
  const [requestWithdrawRecipient, setRequestWithdrawRecipient] = useState('');
  const [requestWithdrawGas, setRequestWithdrawGas] = useState('');
  const [requestWithdrawFee, setRequestWithdrawFee] = useState('');
  const [requestWithdrawPending, setRequestWithdrawPending] = useState(false);

  // User Withdraw State
  const [userWithdrawNullifier, setUserWithdrawNullifier] = useState('');
  const [userWithdrawRecipient, setUserWithdrawRecipient] = useState('');
  const [userWithdrawPending, setUserWithdrawPending] = useState(false);

  // Relayer Withdraw State
  const [proof, setProof] = useState('');
  const [relayerWithdrawRecipient, setRelayerWithdrawRecipient] = useState('');
  const [relayerWithdrawNullifierHash, setRelayerWithdrawNullifierHash] = useState('');
  const [relayerWithdrawGas, setRelayerWithdrawGas] = useState('');
  const [relayerWithdrawFee, setRelayerWithdrawFee] = useState('');
  const [relayerWithdrawRoot, setRelayerWithdrawRoot] = useState('');
  const [relayerWithdrawPoolAddress, setRelayerWithdrawPoolAddress] = useState('');
  const [relayerWithdrawPending, setRelayerWithdrawPending] = useState(false);

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
  const TREE_HEIGHT = 12;
  const COMMITMENT_CONSTANT = 69420n;
  const CHAIN_ID = 369n; // PulseChain = 369, Sepolia = 11155111

  const poolInfo = {
    PLS: {
      "1e18": { label: "1", address: "0xBa851Bb07a6D9F11310821a045B01c0b45Ee9B2b", value: 1000000000000000000n },
      "10e18": { label: "10", address: "0x65295365012046777A879C7B47f96c2164c067D3", value: 10000000000000000000n },
      "100e18": { label: "100", address: "0xA973081C228E6dE666E7F2F0e6530D564b65c7E7", value: 100000000000000000000n }, 
      "1000e18": { label: "1K", address: "0x2A56ac08BEC952cB182Fc933a081dC659c726289", value: 1000000000000000000000n }
    },
    PLSX: {
      "1e18": { label: "1", address: "0x2af0dEfe6Ea7850357470FEc46030653DFec110B", value: 1000000000000000000n },
      "10e18": { label: "10", address: "0x2797c507F8400af832943eA6e1Fa7491D35f8836", value: 10000000000000000000n },
      "20e18": { label: "20", address: "0x63D74140D70F27F8326E8f5e7aEf67bc3a5405BF", value: 20000000000000000000n },
      "100e18": { label: "100", address: "0x556Ab283a451F1C9e8B3A20B9A3c22Fb217a1691", value: 100000000000000000000n }
    },
    PHEX: {
      "1e7": { label: "0.1", address: "0xbc114f72b70CaE713A1b2b7D961cF67eDf5e9892", value: 10000000n },
      "1e8": { label: "1", address: "0x2bbf6Ab97b3f4597c81903094AE0be45a441CCCb", value: 100000000n },
      "1e9": { label: "10", address: "0x1C10D270F93C173B74EAEad96Ef5ba871A199e35", value: 1000000000n },
      "2e9": { label: "20", address: "0x1eF7A3001BC8ce9A194649f71B43C195DAA57E10", value: 2000000000n }
    },
    EHEX: {
      "1e8": { label: "1", address: "0x3A82B734BFA22Ae380B158efc0Cf2a53bAd885a8", value: 100000000n },
      "1e9": { label: "10", address: "0xB5F6D4C2dE81d037c3686E2654a9DAC4507d6a11", value: 1000000000n },
      "2e9": { label: "20", address: "0x8798B89a9b8e0Ea4C7c141517618Eca8CF8F0216", value: 2000000000n },
      "1e10": { label: "100", address: "0xA47F4EFd0E10379e59b7aDc0de86Ffb2b5230E26", value: 10000000000n }
    },
    INC: {
      "1e16": { label: "0.01", address: "0xe5aA2D1101c7cC67bB13e27b3AfF234B537268a0", value: 10000000000000000n },
      "1e17": { label: "0.1", address: "0x953f36CF20093685953d65B32378af53CB5965a5", value: 100000000000000000n },
      "2e17": { label: "0.2", address: "0x41aC7fb22432a09FF35bc08e659D01b0821973B7", value: 200000000000000000n },
      "1e18": { label: "1", address: "0x25325c05f78975F28D15fBd7354a9b6849e45445", value: 1000000000000000000n }
    }
  };

  const tokenAddresses = {
    "PLSX": "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
    "PHEX": "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    "EHEX": "0x57fde0a71132198BBeC939B98976993d8D89D225",
    "INC": "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d"
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

    // 1. Must have wallet
    const wallet = getWallet();
    if (!wallet) return;

    // 2. Verify user is connected to correct network
    const provider = new ethers.BrowserProvider(wallet);
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
      toast(`Wrong network! Please switch to Chain ID ${CHAIN_ID} (PulseChain)`, 3000, "#ffadb7");
      return;
    }

    // 3. Instantiate specific PIP pool
    const poolAddress = poolInfo[depositToken][depositDenomination].address;
    const signer = await provider.getSigner();
    const pool = new ethers.Contract(poolAddress, PipABI, signer);

    // 4. Check allowance for the ERC20 token, and increase if needed
    const denomination = poolInfo[depositToken][depositDenomination].value;
    const tokenAddress = tokenAddresses[depositToken];

    setDepositPending(true);
    if (depositToken !== 'PLS') {
      try {
        const currentAllowance = await checkAllowance(tokenAddress, poolAddress, signer);
        // we only approve the exact denomination each time.
        // If the pool accumulates excess allowance we skip the approval step.
        currentAllowance < denomination 
          ? await approve(poolAddress, tokenAddress, denomination, signer)
          : console.log("Sufficient allowance, skipping ERC20 token approval.");
      } catch (error) {
        setDepositPending(false);
        toast(`Failed to approve pool to spend ${depositDenomination} ${depositToken} on user's behalf.`, 15000, "#ffadb7")
        return;
      }
    }

    // 5. Execute the deposit
    let tx;
    try {
      depositToken === 'PLS' 
        ? tx = await pool.deposit(depositLeaf, { value: denomination })
        : tx = await pool.deposit(depositLeaf);
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
  // REQUEST WITHDRAW
  // ==========================

  const requestWithdraw = async () => {
    setRequestWithdrawPending(true);

    // 1. Check for wallet
    const wallet = getWallet();
    if (!wallet) {
      setRequestWithdrawPending(false);
      return;
    }

    // 2. Instantiate provider, build poseidon for helper functions, check network
    const provider = new ethers.BrowserProvider(wallet); 
    const network = await provider.getNetwork();
    const poseidon = await buildPoseidon();
    if (network.chainId !== CHAIN_ID) {
      toast(`Wrong network! Please switch to Chain ID ${CHAIN_ID} (PulseChain)`, 6000, "#ffadb7");
      setRequestWithdrawPending(false);
      return;
    }

    // 3. Sanitize user inputs {Recipient, Nullifier, Gas, Fee}, and get pool address
    const recipientData = checkAddress(requestWithdrawRecipient);
    const nullifierData = checkNullifierData(requestWithdrawNullifier);
    const gasFormatted = checkGas(requestWithdrawGas);
    const feeFormatted = checkFee(requestWithdrawFee);
    if (!recipientData || !nullifierData || !gasFormatted || !feeFormatted) {
      setRequestWithdrawPending(false);
      return;
    }

    const { token, denomination, nullifierBigInt } = nullifierData;
    const poolAddress = poolInfo[token][denomination].address;

    // 4. Compute leaf from nullifier
    const _leaf = await computeLeaf(nullifierBigInt, poseidon);
  
    // 5. Query Envio Indexer to get the leaf index and tree index for this leaf's Deposit event
    const indices = await fetchIndicesForLeaf(_leaf, poolAddress);
    if (!indices) {
      setRequestWithdrawPending(false);
      return;
    }

    const {leafIndex, treeIndex} = indices;

    // 6. Compute nullifierHash and pathIndices
    const nullifierHash = await computeNullifierHash(nullifierBigInt, leafIndex, poseidon);
    const pathIndices = computePathIndices(leafIndex);

    // 7. Query Envio Indexer again to get all the leaves of the tree for the specific pool
    const leaves = await fetchLeavesForTree(treeIndex, poolAddress);
    if (!leaves) {
      setRequestWithdrawPending(false);
      return;
    }

    // 8. Build the specific tree for this pool from all the input leaves.
    const { tree, root } = await buildTree(leaves, poseidon);

    // 9. Calculate pathElements based on the tree.
    const formattedPathElements = getPathElements(tree, leafIndex, poseidon);

    // 10. Gather all witness inputs
    const input = {
      recipient: BigInt(requestWithdrawRecipient).toString(),
      gas: gasFormatted,
      fee: feeFormatted,
      nullifierHash: nullifierHash.toString(),
      root: root.toString(),
      nullifier: nullifierBigInt.toString(),
      pathElements: formattedPathElements,
      pathIndices: pathIndices
    };

    // 11. Generate proof with input
    const fullProof = await generateProof(input);
    if (!fullProof) {
      setRequestWithdrawPending(false);
      return;
    }
    const { proof, publicSignals} = fullProof;

    // 12. Validate proof with snarkjs
    const isValidProof = await validateProof(proof, publicSignals);
    if (!isValidProof) {
      setRequestWithdrawPending(false);
      toast("Snarkjs proof validation failed.", 3000, "#ffadb7");
      return;
    }

    // 13. Format proof and signals.
    const formattedProof = [
      proof.A[0], proof.A[1], // A = [A.x, A.y]
      proof.B[0], proof.B[1], // B = [B.x, B.y]
      proof.C[0], proof.C[1], // C = [C.x, C.y]
      proof.Z[0], proof.Z[1], // Z = [Z.x, Z.y]
      proof.T1[0], proof.T1[1], // T1 = [T1.x, T1.y]
      proof.T2[0], proof.T2[1], // T2 = [T2.x, T2.y]
      proof.T3[0], proof.T3[1], // T3 = [T3.x, T3.y]
      proof.Wxi[0], proof.Wxi[1], // Wxi = [Wxi.x, Wxi.y]
      proof.Wxiw[0], proof.Wxiw[1], // Wxiw = [Wxiw.x, Wxiw.y]
      
      // Evaluations
      proof.eval_a,
      proof.eval_b,
      proof.eval_c,
      proof.eval_s1,
      proof.eval_s2,
      proof.eval_zw
    ];

    const formattedPublicSignals = {
      recipient: requestWithdrawRecipient,
      gas: gasFormatted,
      fee: feeFormatted,
      // JS removes leading zero padding. Adds back if needed. 66 characters always required for bytes32 in solidity.
      nullifierHash: `0x${BigInt(publicSignals[3]).toString(16).padStart(64, "0")}`,
      root: `0x${BigInt(publicSignals[4]).toString(16).padStart(64, "0")}`
    };

    // 14. Ensure proof has not already been used.
    try {
      const pool = new ethers.Contract(poolAddress, PipABI, provider);
      await pool.checkProof(formattedProof, formattedPublicSignals);
      console.log("Proof is valid. Root from proof matched. Proof hasn't been used to send gas yet. Publishing proof...");
    } catch (error) {
      toast(`checkProof call failed.\n1. NullifierHash from proof already used\n2. Root from the proof doesn't match any roots in the pool\n3. Proof passed snarkjs verification but not solidity verification`, 15000, "#ffadb7");
      setRequestWithdrawPending(false);
      return;
    }

    // 15. Publish proof on telegram at "t.me/pulseinprivate" for relayers to fulfill.
    try {
      await sendTelegramMessage(formattedProof, formattedPublicSignals, poolAddress);
    } catch {
      return;
    }
    setRequestWithdrawPending(false);
    toast("Proof successfully published!", 5000, "#99ffb1");
  };


  // ==========================
  // USER WITHDRAW
  // ==========================

  const userWithdraw = async () => {
    setUserWithdrawPending(true);

    // 1. Check for wallet
    const wallet = getWallet();
    if (!wallet) {
      setUserWithdrawPending(false);
      return;
    }

    // 2. Instantiate provider, signer, build poseidon for helper functions, check network
    const provider = new ethers.BrowserProvider(wallet); 
    const signer = await provider.getSigner();
    const poseidon = await buildPoseidon();
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
      setUserWithdrawPending(false);
      toast(`Wrong network! Please switch to Chain ID ${CHAIN_ID} (PulseChain)`, 3000, "#ffadb7");
      return;
    }

    // 3. Sanitize recipient & nullifier data, get pool address
    const recipientData = checkAddress(userWithdrawRecipient);
    const nullifierData = checkNullifierData(userWithdrawNullifier);
    if (!recipientData || !nullifierData) {
      setUserWithdrawPending(false);
      return;
    }
    
    const { token, denomination, nullifierBigInt } = nullifierData;
    const poolAddress = poolInfo[token][denomination].address;

    // 4. Compute leaf from nullifier
    const _leaf = await computeLeaf(nullifierBigInt, poseidon);

    // 5. Query Envio Indexer to get the leaf index and tree index for this leaf's Deposit event
    const indices = await fetchIndicesForLeaf(_leaf, poolAddress);
    if (!indices) {
      setUserWithdrawPending(false);
      return;
    }

    const {leafIndex, treeIndex} = indices;

    // 6. Compute nullifierHash and pathIndices
    const nullifierHash = await computeNullifierHash(nullifierBigInt, leafIndex, poseidon);
    const pathIndices = computePathIndices(leafIndex);

    // 7. Query Envio Indexer again to get all the leaves of the tree for the specific pool
    const leaves = await fetchLeavesForTree(treeIndex, poolAddress);
    if (!leaves) {
      setUserWithdrawPending(false);
      return;
    }

    // 8. Build the specific tree for this pool from all the input leaves.
    const { tree, root } = await buildTree(leaves, poseidon);

    // 9. Calculate pathElements based on the tree.
    const formattedPathElements = getPathElements(tree, leafIndex, poseidon);

    // 10. Gather all witness inputs
    const input = {
      recipient: BigInt(userWithdrawRecipient).toString(),
      gas: "0",
      fee: "0",
      nullifierHash: nullifierHash.toString(),
      root: root.toString(),
      nullifier: nullifierBigInt.toString(),
      pathElements: formattedPathElements,
      pathIndices: pathIndices
    };

    // 11. Generate proof with input
    const fullProof = await generateProof(input);
    if (!fullProof) {
      setUserWithdrawPending(false);
      return;
    }
    const { proof, publicSignals} = fullProof;

    // 12. Validate proof with snarkjs
    const isValidProof = await validateProof(proof, publicSignals);
    if (!isValidProof) {
      setUserWithdrawPending(false);
      toast("Snarkjs proof validation failed.", 3000, "#ffadb7");
      return;
    }

    // 13. Format proof and signals.
    const formattedProof = [
      proof.A[0], proof.A[1], // A = [A.x, A.y]
      proof.B[0], proof.B[1], // B = [B.x, B.y]
      proof.C[0], proof.C[1], // C = [C.x, C.y]
      proof.Z[0], proof.Z[1], // Z = [Z.x, Z.y]
      proof.T1[0], proof.T1[1], // T1 = [T1.x, T1.y]
      proof.T2[0], proof.T2[1], // T2 = [T2.x, T2.y]
      proof.T3[0], proof.T3[1], // T3 = [T3.x, T3.y]
      proof.Wxi[0], proof.Wxi[1], // Wxi = [Wxi.x, Wxi.y]
      proof.Wxiw[0], proof.Wxiw[1], // Wxiw = [Wxiw.x, Wxiw.y]
      
      // Evaluations
      proof.eval_a,
      proof.eval_b,
      proof.eval_c,
      proof.eval_s1,
      proof.eval_s2,
      proof.eval_zw
    ];

    const formattedPublicSignals = {
      recipient: userWithdrawRecipient,
      gas: "0",
      fee: "0",
      // JS removes leading zero padding. Adds back if needed. 66 characters always required for bytes32 in solidity.
      nullifierHash: `0x${BigInt(publicSignals[3]).toString(16).padStart(64, "0")}`,
      root: `0x${BigInt(publicSignals[4]).toString(16).padStart(64, "0")}`
    };

    // 14. Ensure proof has not already been used to withdraw
    const pool = new ethers.Contract(poolAddress, PipABI, signer);

    try {
      await pool.checkProof(formattedProof, formattedPublicSignals);
      console.log("Proof is valid. Root from proof matched. Proof hasn't been used to withdraw. Withdrawing...");
    } catch (error) {
      toast(`checkProof call failed.\n1. NullifierHash from proof already used\n2. Root from the proof doesn't match any roots in the pool\n3. Proof passed snarkjs verification but not solidity verification`, 15000, "#ffadb7");
      setUserWithdrawPending(false);
      return;
    }

    // 15. Execute withdraw (always 0 gas and fee. No value sent, no relayer fee.)
    try {
      const tx = await pool.withdraw(formattedProof, formattedPublicSignals);
      toast(`Withdraw tx submitted ${tx.hash}`, 6000, "#99ffb1");
      const receipt = await tx.wait();
      toast(`Withdraw tx validated in block ${receipt.blockNumber}`, 6000, "#99ffb1");
    } catch (error) {
      toast(`Withdraw tx failed`, 3000, "#ffadb7");
      setUserWithdrawPending(false);
      return;
    } 

    setUserWithdrawPending(false);
  };

  
  // ==========================
  // RELAYER WITHDRAW
  // ==========================

  const relayerWithdraw = async () => {

    // 1. Format proof and public signals
    let formattedProof;
    try {
      // Parse the proof string pasted from telegram public proof into an array of BigInts
      formattedProof = proof.split(',').map(val => BigInt(val.trim()));
      
      // Validate we have exactly 24 proof elements
      if (formattedProof.length !== 24) {
        toast("Incorrectly formatted proof. Expected 24 values.", 3000, "#ffadb7");
        return;
      }
    } catch (error) {
      toast("Error parsing proof values. Make sure they're valid numbers.", 6000, "#ffadb7");
      return;
    }

    const formattedPublicSignals = {
      recipient: relayerWithdrawRecipient,
      gas: relayerWithdrawGas,
      fee: relayerWithdrawFee,
      nullifierHash: relayerWithdrawNullifierHash,
      root: relayerWithdrawRoot
    };

    // 2. Must have wallet
    const wallet = getWallet();
    if (!wallet) return;

    // 3. Verify user is connected to correct network
    const provider = new ethers.BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
      toast(`Wrong network! Please switch to Chain ID ${CHAIN_ID} (PulseChain)`, 6000, "#ffadb7");
      return;
    }

    // 4. Instantiate pool contract
    const pool = new ethers.Contract(relayerWithdrawPoolAddress, PipABI, signer);

    // 5. Ensure proof is correct and the nullifierHash hasn't been used yet
    setRelayerWithdrawPending(true);
    try {
      await pool.checkProof(formattedProof, formattedPublicSignals);
    } catch (error) {
      toast("Solidity checkProof failed.\n1. Incorrect proof/signal inputs\n2. Nullifier Hash from proof already used.", 6000, "#ffadb7");
      setRelayerWithdrawPending(false);
      return;
    }

    // 6. Execute withdraw on behalf of recipient (must send the requested gas amount, relayer gets requested fee offer).
    try {
      const tx = await pool.withdraw(formattedProof, formattedPublicSignals, { value: relayerWithdrawGas});
      toast(`Withdraw tx submitted ${tx.hash}`, 6000, "#99ffb1");
      const receipt = await tx.wait();
      toast(`Withdraw tx validated in block ${receipt.blockNumber}`, 6000, "#99ffb1");
    } catch (error) {
      console.log(error);
      toast(`Withdraw tx failed`, 3000, "#ffadb7");
      setRelayerWithdrawPending(false);
      return;
    }

    setRelayerWithdrawPending(false);
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


  const checkGas = (gasInput) => {
    // Must specifically input a value
    if (!gasInput || gasInput.trim() === '') {
      toast('Please enter a gas value or 0', 3000, "#ffadb7");
      return null;
    }

    // Remove commas if needed
    const gasValue = gasInput.replace(/,/g, '');

    // Positive whole number
    if (!/^\d+$/.test(gasValue)) {
      toast('Gas must be a positive whole number', 3000, "#ffadb7");
      return null;
    }
    
    // Reasonable upper limit check (even though contract has no limit)
    const gasNumber = Number(gasValue);
    if (gasNumber > 1000000000) {
      toast('Gas value is too high', 3000, "#ffadb7");
      return null;
    }
    
    // convert to wei and stringify
    const gasFormatted = (BigInt(gasNumber) * 1000000000000000000n).toString();
    return gasFormatted;
  };


  const checkFee = (feeInput) => {
    // Must specifically input a value
    if (!feeInput || feeInput.trim() === '') {
      toast('Please enter a fee percentage or 0', 3000, "#ffadb7");
      return null;
    }

    // Remove % sign if present
    let feeValue = feeInput.replace('%', '').trim();

    // Validate positive number with up to 2 decimals
    if (!/^\d+(\.\d{1,2})?$/.test(feeValue)) {
      toast('Fee must be a percentage with up to 2 decimal places', 3000, "#ffadb7");
      return null;
    }
    
    // Convert to number for range checking
    const feeNumber = parseFloat(feeValue);
    
    // Check range
    if (feeNumber < 0 || feeNumber > 100) {
      toast('Fee must be between 0% and 100%', 3000, "#ffadb7");
      return null;
    }

    const feeBasisPoints = Math.round(feeNumber * 100);

    return feeBasisPoints.toString();
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


  const getPathElements = (tree, leafIndex, poseidon) => {
    const pathElements = [];
    let x = BigInt(leafIndex);
    
    for (let y = 0; y < TREE_HEIGHT; y++) {
      const siblingX = x % 2n === 0n ? x + 1n : x - 1n;
      pathElements.push(tree[y][Number(siblingX)]); // Convert back to Number for array index
      x = x / 2n;
    }

    const formattedProofElements = pathElements.map(
      element => typeof element === "bigint" 
        ? element.toString() 
        : poseidon.F.toString(element, 10));

    return formattedProofElements;
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
      console.log("generating full PLONK proof...");
      const { proof, publicSignals } = await window.snarkjs.plonk.fullProve(
        input, 
        "/withdraw.wasm", 
        "/withdraw_final.zkey"
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
      const isValidProof = await window.snarkjs.plonk.verify(vkey, publicSignals, proof);
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
      const message = `\nPROOF\n\n${proof}\n\nPUBLIC SIGNALS\nRecipient: ${pubSignals.recipient}\nGas (Wei): ${pubSignals.gas}\nFee (Basis Points): ${pubSignals.fee}\nNullifier Hash: ${pubSignals.nullifierHash}\nRoot: ${pubSignals.root}\nPool Address: ${poolAddress}`;
  
      await fetch('/api/telegram', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message})
      });
    } catch (error) {
      setRequestWithdrawPending(false);
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
  // FILE DOWNLOAD
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
      className="min-h-screen bg-cover bg-center bg-no-repeat px-4 text-white relative"
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
              ${activeTab === 'requestWithdraw' ? 'bg-gray-400' : 'bg-gray-500'}`}
            onClick={() => setActiveTab('requestWithdraw')}
          >Request Withdraw</button>

          <button
            className={`px-4 py-3 text-lg font-bold rounded-t-lg border-1 text-black hover:bg-gray-400
              ${activeTab === 'userWithdraw' ? 'bg-gray-400' : 'bg-gray-500'}`}
            onClick={() => setActiveTab('userWithdraw')}
          >User Withdraw</button>

          <button
            className={`px-4 py-3 text-lg font-bold rounded-t-lg border-1 text-black hover:bg-gray-400
              ${activeTab === 'relayerWithdraw' ? 'bg-gray-400' : 'bg-gray-500'}`}
            onClick={() => setActiveTab('relayerWithdraw')}
          >Relayer Withdraw</button>

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
              <div className="grid grid-cols-5 gap-4">
                {['PLS', 'PLSX', 'PHEX', 'EHEX', 'INC'].map((token) => (
                  <button
                    key={token}
                    onClick={() => {
                      setDepositToken(token);
                      setDepositDenomination(null);
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
              <div className="grid grid-cols-4 gap-4 mt-4">
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
                  <p className="mb-2">This NULLIFIER is REQUIRED to WITHDRAW your deposit. Click below if you wish to save your nullifier in a text file.</p>
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


          {/* Request Withdraw Content */}
          {activeTab === 'requestWithdraw' && (
            <div className="space-y-6">

              {/* Ring Loader */}
              {requestWithdrawPending && (
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
                  value={requestWithdrawNullifier}
                  onChange={(e) => setRequestWithdrawNullifier(e.target.value)}
                  placeholder="PLS-1e18-12345678901234567890..."
                  className="input-field"
                />
              </div>
              
              {/* Recipient Address Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Recipient</label>
                <input
                  type="text"
                  value={requestWithdrawRecipient}
                  onChange={(e) => setRequestWithdrawRecipient(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>
              
              {/* Gas Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Gas (PLS)</label>
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  value={requestWithdrawGas}
                  onChange={(e) => setRequestWithdrawGas(e.target.value)}
                  placeholder="20000"
                  className="input-field"
                />
              </div>

              {/* Fee Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Fee (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={requestWithdrawFee}
                  onChange={(e) => setRequestWithdrawFee(e.target.value)}
                  placeholder="0.30"
                  className="input-field"
                />
              </div>

              <p className="text-black font-bold">Clicking "Request Withdraw" sends your public proof data to <a href="https://t.me/pulseinprivate" target="_blank" className="text-sky-900 underline"> t.me/pulseinprivate</a> where relayers listen to withdraw your deposit for you. If your fee offer is too small, they may choose to ignore your request. Consider looking at <a href="https://pip-1.gitbook.io/pip-docs/request-withdraw#gas-and-fee" target="_blank" className="text-sky-900 underline"> recommended fee values</a> in the docs.</p>

              {/* Request Withdraw Button */}
              <div className="pt-4 relative">
                <button
                  onClick={requestWithdraw}
                  disabled={
                    !requestWithdrawNullifier || 
                    !requestWithdrawRecipient || 
                    !requestWithdrawGas || 
                    !requestWithdrawFee || 
                    requestWithdrawPending
                  }
                  className="button relative group"
                >
                  Request Withdraw
                </button>
              </div>
            </div>
          )}


          {/* User Withdraw Content */}
          {activeTab === 'userWithdraw' && (
            <div className="space-y-6">

              {/* Ring Loader */}
              {userWithdrawPending && (
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
                  value={userWithdrawNullifier}
                  onChange={(e) => setUserWithdrawNullifier(e.target.value)}
                  placeholder="PLS-1e18-12345678901234567890..."
                  className="input-field"
                />
              </div>
              
              {/* Recipient Address Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Recipient</label>
                <input
                  type="text"
                  value={userWithdrawRecipient}
                  onChange={(e) => setUserWithdrawRecipient(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>
              
              {/* User Withdraw Button */}
              <div className="pt-4">
                <button
                  onClick={userWithdraw}
                  disabled={!userWithdrawNullifier || !userWithdrawRecipient || userWithdrawPending}
                  className="button"
                >
                  Execute Withdraw
                </button>
              </div>
            </div>
          )}          

          {/* Relayer Withdraw Content */}
          {activeTab === 'relayerWithdraw' && (
            <div className="space-y-6">

              {/* Ring Loader */}
              {relayerWithdrawPending && (
                <div className="ringloader">
                  <div>
                    <RingLoader color="#4d004d" size={300} speedMultiplier={0.5}/>
                  </div>
                </div>
              )}

              {/* Proof */}
              <div>
                <label className="text-black font-bold block mb-1 px-2">Proof</label>
                <input
                  type="text"
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="1234, 5678, ..., 9012"
                  className="input-field"
                />
              </div>

              {/* Public Signals */}
              <div>
                <label className="text-black font-bold block mb-1 px-2">Recipient Address</label>
                <input
                  type="text"
                  value={relayerWithdrawRecipient}
                  onChange={(e) => setRelayerWithdrawRecipient(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-black font-bold block mb-1 px-2">Gas (Wei)</label>
                <input
                  type="text"
                  value={relayerWithdrawGas}
                  onChange={(e) => setRelayerWithdrawGas(e.target.value)}
                  placeholder="69690000000000000000..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-black font-bold block mb-1 px-2">Fee (Basis Points)</label>
                <input
                  type="text"
                  value={relayerWithdrawFee}
                  onChange={(e) => setRelayerWithdrawFee(e.target.value)}
                  placeholder="42..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-black font-bold block mb-1 px-2">Nullifier Hash</label>
                <input
                  type="text"
                  value={relayerWithdrawNullifierHash}
                  onChange={(e) => setRelayerWithdrawNullifierHash(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-black font-bold block mb-1 px-2">Root</label>
                <input
                  type="text"
                  value={relayerWithdrawRoot}
                  onChange={(e) => setRelayerWithdrawRoot(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>
              
              {/* Pool Address Input */}
              <div>
                <label className="text-black font-bold block mb-1 px-2">Pool Address</label>
                <input
                  type="text"
                  value={relayerWithdrawPoolAddress}
                  onChange={(e) => setRelayerWithdrawPoolAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-field"
                />
              </div>

              {/* Relayer Withdraw Button */}
              <div className="pt-4">
                <button
                  onClick={relayerWithdraw}
                  disabled={
                    !proof || 
                    !relayerWithdrawRecipient || 
                    !relayerWithdrawGas || 
                    !relayerWithdrawFee || 
                    !relayerWithdrawNullifierHash || 
                    !relayerWithdrawRoot || 
                    !relayerWithdrawPoolAddress ||
                    relayerWithdrawPending
                  }
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

              {/* Tree Index Input */}
              <div>
                <label className="text-black text-lg font-bold block mb-1 px-2">Tree Index</label>
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  value={anonTreeIndex}
                  onChange={(e) => setAnonTreeIndex(e.target.value)}
                  placeholder="0"
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

      {/* Verifiable GitHub Commit Hash - Footer */}
      <div className="absolute bottom-2 right-4 text-black font-bold">
        <div className="flex flex-col items-end text-gray-300">
          {process.env.NEXT_PUBLIC_COMMIT_HASH && (
            <p>
              <a href="https://github.com/alexbabits/pip-frontend" target="_blank" className="text-sky-900 underline">
            {process.env.NEXT_PUBLIC_COMMIT_HASH.substring(0, 7)}</a>
            </p>
          )}

        </div>
      </div>

      {/* Disclaimer - Footer */} 
      <div className="absolute bottom-2 left-2 text-black font-bold"> 
        <div className="flex flex-col items-start text-gray-300"> 
          <p>PIP smart contracts have been <a href="https://github.com/alexbabits/pip/tree/master/audits" target="_blank" className="text-sky-900 underline">audited</a>.</p> 
          <p>Regardless, please use at your own risk.</p> 
        </div> 
      </div>

    </main>
  );
}