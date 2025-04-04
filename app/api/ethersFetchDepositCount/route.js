import { ethers } from 'ethers';
import PipABI from "../../../abi/PipABI.json";

export async function POST(request) {

  try {

    const { treeIndex, poolAddress } = await request.json();

    if (!process.env.RPC_URL) {
      throw new Error("RPC_URL environment variable is not defined");
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(process.env.RPC_URL);

    // Instantiate provider and pool
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    await new Promise(resolve => setTimeout(resolve, 500));
    const pool = new ethers.Contract(poolAddress, PipABI, provider);

    // Set up block range
    const startBlock = 23000000; // Approx block of pool deployments
    const endBlock = await provider.getBlockNumber();
    const CHUNK_SIZE = 100000000; // 100M (don't need chunksize, placeholder incase we ever do.)

    let depositCount = 0;
    
    // Query events in chunks to avoid RPC limitations
    for (let i = startBlock; i <= endBlock; i += CHUNK_SIZE) {
      const toBlock = Math.min(i + CHUNK_SIZE - 1, endBlock);
      
      const depositEvents = await pool.queryFilter(pool.filters.Deposit(null, null, treeIndex) , i, toBlock);
      depositCount += depositEvents.length;
    }
    
    return Response.json({ success: true,  data: { depositCount }});
    
  } catch (error) {
    return Response.json({ success: false, error: "Error fetching deposit count data" }, { status: 500 });
  }
}