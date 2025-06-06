import { ethers } from 'ethers';
import PipABI from "../../../abi/PipABI.json";

export async function POST(request) {

  try {

    const { treeIndex, poolAddress } = await request.json();
    
    // Instantiate provider and pool
    const provider = new ethers.JsonRpcProvider("https://rpc-pulsechain.g4mm4.io");
    const pool = new ethers.Contract(poolAddress, PipABI, provider);
    
    // Set up block range
    const startBlock = 23120454; // First pool deployed at 
    const endBlock = await provider.getBlockNumber();
    const CHUNK_SIZE = 100000000; // 100M (don't need chunksize, placeholder incase we ever do.)
    
    let withdrawCount = 0;
    
    // Query events in chunks to avoid RPC limitations
    for (let i = startBlock; i <= endBlock; i += CHUNK_SIZE) {
      const toBlock = Math.min(i + CHUNK_SIZE - 1, endBlock);
      
      const withdrawEvents = await pool.queryFilter(pool.filters.Withdraw(null, null, treeIndex), i, toBlock);
      withdrawCount += withdrawEvents.length;
    }
    
    return Response.json({ success: true, data: { withdrawCount }});
    
  } catch (error) {
    return Response.json({ success: false, error: "Error fetching withdraw count data" }, { status: 500 });
  }
}