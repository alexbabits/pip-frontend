import { ethers, Network } from 'ethers';
import PipABI from "../../../abi/PipABI.json";

export async function POST(request) {

  try {

    const { leaf, poolAddress } = await request.json();
    
    // Instantiate provider and pool
    const network = new Network("pulsechain", 369);
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL, network, {staticNetwork: true} );
    const pool = new ethers.Contract(poolAddress, PipABI, provider);
    
    // Set up block range
    const startBlock = 23000000; // Approx block of pool deployments
    const endBlock = await provider.getBlockNumber();
    const CHUNK_SIZE = 100000000; // Large value for a single chunk
    
    let foundDeposit = null;

    // Query events in chunks (currently just one large chunk)
    for (let i = startBlock; i <= endBlock; i += CHUNK_SIZE) {
      const toBlock = Math.min(i + CHUNK_SIZE - 1, endBlock);

      const depositEvents = await pool.queryFilter(pool.filters.Deposit(leaf), i, toBlock);

      if (depositEvents.length > 0) {
        foundDeposit = depositEvents[0];
        break;
      }
    }
    
    if (!foundDeposit) {
      return Response.json({ success: false, error: "No Deposit events with leaf value associated with nullifier" }, { status: 404 });
    }
    
    // Extract the _leafIndex and _treeIndex from the event args
    const leafIndex = foundDeposit.args._leafIndex.toString();
    const treeIndex = foundDeposit.args._treeIndex.toString();
    
    return Response.json({ success: true, data: { leafIndex, treeIndex } });
    
  } catch (error) {
    return Response.json({ success: false, error: "Error fetching indices for leaf." }, { status: 500 });
  }
}