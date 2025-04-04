import { ethers } from 'ethers';
import PipABI from "../../../abi/PipABI.json";

export async function POST(request) {

  try {
    
    const { treeIndex, poolAddress } = await request.json();
    
    // Instantiate provider and pool
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const pool = new ethers.Contract(poolAddress, PipABI, provider);
    
    // Set up block range
    const startBlock = 23120454; // First pool deployed at 
    const endBlock = await provider.getBlockNumber();
    const CHUNK_SIZE = 100000000; // 100M (don't need chunksize, placeholder incase we ever do.)
    
    let allDeposits = [];

    // Query events in chunks to avoid RPC limitations
    for (let i = startBlock; i <= endBlock; i += CHUNK_SIZE) {
      const toBlock = Math.min(i + CHUNK_SIZE - 1, endBlock);
      const depositEvents = await pool.queryFilter(pool.filters.Deposit(null, null, treeIndex), i, toBlock);

      // Extract leaf and leafIndex from each event, add to array.
      const deposits = depositEvents.map(event => ({ leaf: event.args.leaf, _leafIndex: event.args._leafIndex }));
      allDeposits.push(...deposits);
    }

    if (allDeposits.length === 0) {
      return Response.json({ success: false, error: "No deposits found for this tree and pool" }, { status: 404 });
    }

    // Sort deposits by leaf index
    const sortedDeposits = allDeposits.sort((a, b) => 
      parseInt(a._leafIndex) - parseInt(b._leafIndex)
    );

    // Extract just the leaves
    const leaves = sortedDeposits.map(deposit => deposit.leaf);
    
    return Response.json({ success: true, data: { leaves } });
    
  } catch (error) {
    return Response.json({ success: false, error: "Error fetching leaf data" }, { status: 500 });
  }
}